from collections.abc import Generator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.auth import hash_token
from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.auth import ActionToken, User, UserSession

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def setup_auth_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "console")
    monkeypatch.setattr(settings, "APP_BASE_URL", "http://localhost:3000")


@pytest.fixture
def test_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_registration_and_argon2_hashing(test_db: Session) -> None:
    client = TestClient(app)
    creds = {
        "email": "Senior.Counsel@Veritas.in",
        "password": "super-secure-passphrase-1234",
        "display_name": "Senior Counsel",
    }
    res = client.post("/api/v1/auth/register", json=creds)
    assert res.status_code == 201
    data = res.json()

    # Assert safe user fields returned
    assert data["email"] == "senior.counsel@veritas.in"
    assert data["display_name"] == "Senior Counsel"
    assert data["email_verified"] is False
    assert "id" in data
    assert "password" not in data
    assert "token" not in data
    assert "access_token" not in data

    # Verify database persistence: Argon2id hash used, plaintext never stored
    user = test_db.scalar(select(User).where(User.email == "senior.counsel@veritas.in"))
    assert user is not None
    assert user.password_hash is not None
    assert user.password_hash.startswith("$argon2id$")
    assert "super-secure-passphrase-1234" not in user.password_hash

    # Verify ActionToken created with sha256 hash
    token = test_db.scalar(select(ActionToken).where(ActionToken.user_id == user.id))
    assert token is not None
    assert token.purpose == "verify_email"
    assert len(token.token_hash) == 64
    assert token.consumed_at is None

    # Duplicate registration returns 409 with safe error envelope
    dup_res = client.post(
        "/api/v1/auth/register",
        json={
            "email": "  SENIOR.COUNSEL@veritas.in  ",
            "password": "another-password-1234",
        },
    )
    assert dup_res.status_code == 409
    assert dup_res.json()["error"]["code"] == "ACCOUNT_ALREADY_EXISTS"


def test_unverified_user_cannot_login_until_verified(test_db: Session) -> None:
    client = TestClient(app)
    creds = {
        "email": "junior@veritas.in",
        "password": "valid-passphrase-1234",
    }
    reg_res = client.post("/api/v1/auth/register", json=creds)
    assert reg_res.status_code == 201

    # Login before verification is rejected with 403 EMAIL_NOT_VERIFIED
    login_res = client.post("/api/v1/auth/login", json=creds)
    assert login_res.status_code == 403
    assert login_res.json()["error"]["code"] == "EMAIL_NOT_VERIFIED"
    assert "veritas_session" not in client.cookies

    # Retrieve action token from DB and verify email
    user = test_db.scalar(select(User).where(User.email == "junior@veritas.in"))
    assert user is not None
    db_token = test_db.scalar(select(ActionToken).where(ActionToken.user_id == user.id))
    assert db_token is not None

    # Invalid token check
    invalid_verify = client.post("/api/v1/auth/email/verify", json={"token": "invalid-token-123"})
    assert invalid_verify.status_code == 400
    assert invalid_verify.json()["error"]["code"] == "TOKEN_INVALID_OR_EXPIRED"

    # Manually simulate verifying with valid raw token whose hash matches db_token
    # Since raw token is dispatched via email, let's create a known raw token
    from app.core.security import generate_opaque_token

    raw_token = generate_opaque_token(32)
    db_token.token_hash = hash_token(raw_token)
    test_db.commit()

    verify_res = client.post("/api/v1/auth/email/verify", json={"token": raw_token})
    assert verify_res.status_code == 200

    test_db.refresh(user)
    assert user.is_email_verified is True
    test_db.refresh(db_token)
    assert db_token.consumed_at is not None

    # Single-use: Reusing token is rejected
    reuse_res = client.post("/api/v1/auth/email/verify", json={"token": raw_token})
    assert reuse_res.status_code == 400
    assert reuse_res.json()["error"]["code"] == "TOKEN_INVALID_OR_EXPIRED"

    # Verified user can now log in
    succ_login = client.post("/api/v1/auth/login", json=creds)
    assert succ_login.status_code == 200
    assert settings.SESSION_COOKIE_NAME in client.cookies


def test_resend_verification_generic_response(
    test_db: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    client = TestClient(app)
    creds = {"email": "resend_user@veritas.in", "password": "valid-passphrase-1234"}
    client.post("/api/v1/auth/register", json=creds)

    sent_emails = []

    async def fake_send_verification(email: str, token: str) -> None:
        sent_emails.append((email, token))

    import app.services.auth.auth_service as auth_service_mod

    monkeypatch.setattr(auth_service_mod, "send_verification", fake_send_verification)

    # Resend for existing unverified user
    res1 = client.post("/api/v1/auth/email/resend", json={"email": "resend_user@veritas.in"})
    assert res1.status_code == 202
    assert "verification link has been sent" in res1.json()["message"]
    assert len(sent_emails) == 1

    # Resend for non-existent user returns identical 202 response (no account enumeration)
    res2 = client.post("/api/v1/auth/email/resend", json={"email": "nonexistent@veritas.in"})
    assert res2.status_code == 202
    assert "verification link has been sent" in res2.json()["message"]
    assert len(sent_emails) == 1


def test_login_invalid_credentials_generic_response() -> None:
    client = TestClient(app)

    # Missing user
    res1 = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@veritas.in", "password": "wrong-password-123"},
    )
    assert res1.status_code == 401
    assert res1.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert res1.json()["error"]["message"] == "Invalid email or password"

    # Register and verify user
    client.post(
        "/api/v1/auth/register",
        json={"email": "existing@veritas.in", "password": "correct-passphrase-123"},
    )
    # Existing user, wrong password
    res2 = client.post(
        "/api/v1/auth/login",
        json={"email": "existing@veritas.in", "password": "wrong-password-123"},
    )
    assert res2.status_code == 401
    assert res2.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert res2.json()["error"]["message"] == "Invalid email or password"


def test_session_lifecycle_and_me_endpoint(test_db: Session) -> None:
    client = TestClient(app)
    creds = {"email": "advocate_me@veritas.in", "password": "strong-passphrase-123"}
    client.post("/api/v1/auth/register", json=creds)

    # Verify user in database
    user = test_db.scalar(select(User).where(User.email == creds["email"]))
    assert user is not None
    user.email_verified_at = datetime.now(UTC)
    test_db.commit()

    # Unauthorized access before login
    unauth_me = client.get("/api/v1/auth/me")
    assert unauth_me.status_code == 401
    assert unauth_me.json()["error"]["code"] == "AUTHENTICATION_REQUIRED"

    # Login and receive cookie
    login_res = client.post("/api/v1/auth/login", json=creds)
    assert login_res.status_code == 200
    raw_cookie = client.cookies.get(settings.SESSION_COOKIE_NAME)
    assert raw_cookie is not None

    # Check database: only SHA-256 hash is stored, not raw cookie
    session_row = test_db.scalar(select(UserSession).where(UserSession.user_id == user.id))
    assert session_row is not None
    assert session_row.token_hash == hash_token(raw_cookie)
    assert raw_cookie not in session_row.token_hash

    # Authenticated /me reload with cookie
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == creds["email"]
    assert me_data["email_verified"] is True
    assert me_data["id"] == str(user.id)

    # Patch profile
    patch_res = client.patch(
        "/api/v1/auth/me",
        json={
            "full_name": "Advocate Me",
            "law_firm": "Veritas Chambers",
            "city": "Mumbai",
        },
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["full_name"] == "Advocate Me"
    assert patch_res.json()["city"] == "Mumbai"

    # Logout revokes session and clears cookie
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 204
    assert client.cookies.get(settings.SESSION_COOKIE_NAME) is None

    test_db.refresh(session_row)
    assert session_row.revoked_at is not None

    # After logout, /me fails with 401
    assert client.get("/api/v1/auth/me").status_code == 401

    # Logout is idempotent
    assert client.post("/api/v1/auth/logout").status_code == 204


def test_sessions_enumeration_and_revocation(test_db: Session) -> None:
    client_a = TestClient(app)
    creds = {"email": "multisession@veritas.in", "password": "strong-passphrase-123"}
    client_a.post("/api/v1/auth/register", json=creds)

    user = test_db.scalar(select(User).where(User.email == creds["email"]))
    assert user is not None
    user.email_verified_at = datetime.now(UTC)
    test_db.commit()

    # Session 1
    assert client_a.post("/api/v1/auth/login", json=creds).status_code == 200

    # Session 2
    client_b = TestClient(app)
    assert client_b.post("/api/v1/auth/login", json=creds).status_code == 200

    # Session list from Session 1
    sessions_res = client_a.get("/api/v1/auth/sessions")
    assert sessions_res.status_code == 200
    sessions = sessions_res.json()
    assert len(sessions) == 2

    # Assert token hashes and private IP hashes are NOT exposed in response
    for s in sessions:
        assert "token_hash" not in s
        assert "ip_hash" not in s
        assert "user_agent_hash" not in s
        assert "id" in s
        assert "expires_at" in s
        assert "is_current" in s

    # Identify session 2 ID
    s2_id = [s["id"] for s in sessions if not s["is_current"]][0]

    # Create another user and attempt cross-user session revocation
    client_other = TestClient(app)
    other_creds = {"email": "other_user@veritas.in", "password": "strong-passphrase-123"}
    client_other.post("/api/v1/auth/register", json=other_creds)
    other_user = test_db.scalar(select(User).where(User.email == other_creds["email"]))
    assert other_user is not None
    other_user.email_verified_at = datetime.now(UTC)
    test_db.commit()
    assert client_other.post("/api/v1/auth/login", json=other_creds).status_code == 200

    # Other user cannot revoke Session 2 of User A (safe 404)
    cross_revoke = client_other.delete(f"/api/v1/auth/sessions/{s2_id}")
    assert cross_revoke.status_code == 404

    # User A revokes Session 2
    revoke_res = client_a.delete(f"/api/v1/auth/sessions/{s2_id}")
    assert revoke_res.status_code == 204

    # Session 2 is now invalidated
    assert client_b.get("/api/v1/auth/me").status_code == 401

    # Session 1 remains active
    assert client_a.get("/api/v1/auth/me").status_code == 200


def test_forgot_and_reset_password_revokes_all_sessions(test_db: Session) -> None:
    client = TestClient(app)
    creds = {"email": "reset_flow@veritas.in", "password": "old-passphrase-1234"}
    client.post("/api/v1/auth/register", json=creds)

    user = test_db.scalar(select(User).where(User.email == creds["email"]))
    assert user is not None
    user.email_verified_at = datetime.now(UTC)
    test_db.commit()

    # Establish 2 active sessions
    client1 = TestClient(app)
    assert client1.post("/api/v1/auth/login", json=creds).status_code == 200
    client2 = TestClient(app)
    assert client2.post("/api/v1/auth/login", json=creds).status_code == 200

    # Forgot password
    forgot_res = client.post("/api/v1/auth/password/forgot", json={"email": creds["email"]})
    assert forgot_res.status_code == 202
    assert "instructions have been sent" in forgot_res.json()["message"]

    # Unregistered email returns identical generic response
    ghost_res = client.post("/api/v1/auth/password/forgot", json={"email": "ghost@veritas.in"})
    assert ghost_res.status_code == 202
    assert "instructions have been sent" in ghost_res.json()["message"]

    # Set up a known raw reset token in DB
    from app.core.security import generate_opaque_token

    raw_reset_token = generate_opaque_token(32)
    action_token = test_db.scalar(
        select(ActionToken).where(
            ActionToken.user_id == user.id, ActionToken.purpose == "reset_password"
        )
    )
    assert action_token is not None
    action_token.token_hash = hash_token(raw_reset_token)
    test_db.commit()

    # Bad token fails
    bad_reset = client.post(
        "/api/v1/auth/password/reset",
        json={"token": "wrong-token", "new_password": "new-brand-secure-password-456"},
    )
    assert bad_reset.status_code == 400
    assert bad_reset.json()["error"]["code"] == "TOKEN_INVALID_OR_EXPIRED"

    # Expired token fails
    action_token.expires_at = datetime.now(UTC) - timedelta(seconds=10)
    test_db.commit()
    exp_reset = client.post(
        "/api/v1/auth/password/reset",
        json={"token": raw_reset_token, "new_password": "new-brand-secure-password-456"},
    )
    assert exp_reset.status_code == 400
    assert exp_reset.json()["error"]["code"] == "TOKEN_INVALID_OR_EXPIRED"

    # Restore unexpired
    action_token.expires_at = datetime.now(UTC) + timedelta(minutes=30)
    test_db.commit()

    # Successful reset
    succ_reset = client.post(
        "/api/v1/auth/password/reset",
        json={"token": raw_reset_token, "new_password": "new-brand-secure-password-456"},
    )
    assert succ_reset.status_code == 200

    # Token cannot be reused (single-use)
    reuse_reset = client.post(
        "/api/v1/auth/password/reset",
        json={"token": raw_reset_token, "new_password": "another-password-789"},
    )
    assert reuse_reset.status_code == 400

    # Assert ALL previous sessions are revoked atomically
    assert client1.get("/api/v1/auth/me").status_code == 401
    assert client2.get("/api/v1/auth/me").status_code == 401

    # Old password no longer logs in
    old_login = client.post("/api/v1/auth/login", json=creds)
    assert old_login.status_code == 401

    # New password logs in successfully
    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": creds["email"], "password": "new-brand-secure-password-456"},
    )
    assert new_login.status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 200


def test_origin_validation_matrix(test_db: Session, monkeypatch: pytest.MonkeyPatch) -> None:
    client = TestClient(app)
    creds = {"email": "origin_matrix@veritas.in", "password": "secure-password-1234"}

    client.post("/api/v1/auth/register", json=creds)
    user = test_db.scalar(select(User).where(User.email == creds["email"]))
    assert user is not None
    user.email_verified_at = datetime.now(UTC)
    test_db.commit()

    # Login
    client.post("/api/v1/auth/login", json=creds)
    assert settings.SESSION_COOKIE_NAME in client.cookies

    # Configure production settings
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "SESSION_COOKIE_SECURE", True)
    monkeypatch.setattr(settings, "ALLOWED_ORIGINS", ["https://app.veritaslegal.in"])
    monkeypatch.setattr(settings, "APP_BASE_URL", "https://app.veritaslegal.in")

    # 1. Allowed HTTPS origin -> 200
    res_allowed = client.patch(
        "/api/v1/auth/me",
        json={"city": "Delhi"},
        headers={"Origin": "https://app.veritaslegal.in"},
    )
    assert res_allowed.status_code == 200
    assert res_allowed.json()["city"] == "Delhi"

    # 2. Same host over HTTP rejected -> 403
    res_http = client.patch(
        "/api/v1/auth/me",
        json={"city": "Mumbai"},
        headers={"Origin": "http://app.veritaslegal.in"},
    )
    assert res_http.status_code == 403
    assert res_http.json()["error"]["code"] == "FORBIDDEN"

    # 3. Hostile host rejected -> 403
    res_hostile = client.patch(
        "/api/v1/auth/me",
        json={"city": "Kolkata"},
        headers={"Origin": "https://evil-attacker.com"},
    )
    assert res_hostile.status_code == 403
    assert res_hostile.json()["error"]["code"] == "FORBIDDEN"

    # 4. Malformed or invalid origin ports rejected -> safe 403
    from app.core.security import normalize_origin

    assert normalize_origin("https://app.veritaslegal.in:invalid") == ""
    assert normalize_origin("https://app.veritaslegal.in:9999999") == ""
    assert normalize_origin("https://app.veritaslegal.in:0") == ""

    res_malformed_alpha = client.patch(
        "/api/v1/auth/me",
        json={"city": "Pune"},
        headers={"Origin": "https://app.veritaslegal.in:invalid"},
    )
    assert res_malformed_alpha.status_code == 403
    assert res_malformed_alpha.json()["error"]["code"] == "FORBIDDEN"

    res_malformed_range = client.patch(
        "/api/v1/auth/me",
        json={"city": "Pune"},
        headers={"Origin": "https://app.veritaslegal.in:9999999"},
    )
    assert res_malformed_range.status_code == 403
    assert res_malformed_range.json()["error"]["code"] == "FORBIDDEN"

    # 5. Missing production origin rejected (no Origin, no Referer) -> 403
    res_missing = client.patch(
        "/api/v1/auth/me",
        json={"city": "Chennai"},
    )
    assert res_missing.status_code == 403
    assert res_missing.json()["error"]["code"] == "FORBIDDEN"

    # 6. Logout CSRF rejected when session cookie is attached to untrusted origin
    logout_csrf = client.post(
        "/api/v1/auth/logout",
        headers={"Origin": "https://evil-attacker.com"},
    )
    assert logout_csrf.status_code == 403
    assert logout_csrf.json()["error"]["code"] == "FORBIDDEN"
    # Ensure session was not cleared because request was forbidden
    assert settings.SESSION_COOKIE_NAME in client.cookies

    # 7. Logout with allowed HTTPS origin succeeds and clears cookie
    logout_allowed = client.post(
        "/api/v1/auth/logout",
        headers={"Origin": "https://app.veritaslegal.in"},
    )
    assert logout_allowed.status_code == 204
    assert client.cookies.get(settings.SESSION_COOKIE_NAME) is None

    # 8. Logout without session cookie is idempotent even from hostile or missing origin
    logout_idempotent = client.post(
        "/api/v1/auth/logout",
        headers={"Origin": "https://hostile-site.com"},
    )
    assert logout_idempotent.status_code == 204


def test_console_email_logging_redaction(
    caplog: pytest.LogCaptureFixture, monkeypatch: pytest.MonkeyPatch
) -> None:
    import asyncio
    import logging

    from app.services.auth.email_service import send_password_reset, send_verification

    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "console")
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "APP_BASE_URL", "http://localhost:3000")
    logging.getLogger("app.services.auth.email_service").disabled = False

    with caplog.at_level(logging.WARNING):
        # 1. Verification email logging
        asyncio.run(send_verification("counsel@veritas.in", "raw-token-verification-xyz"))
        assert len(caplog.records) == 1
        record = caplog.records[0]
        assert (
            "[DEVELOPMENT ONLY] Verification link: http://localhost:3000/verify-email?token=raw-token-verification-xyz"
            in record.message
        )
        # Confirm recipient email is NOT in log output
        assert "counsel@veritas.in" not in caplog.text
        # Confirm no separate raw token field is logged
        assert "raw_token" not in caplog.text

        caplog.clear()

        # 2. Password reset email logging
        asyncio.run(send_password_reset("advocate@veritas.in", "raw-token-reset-abc"))
        assert len(caplog.records) == 1
        record2 = caplog.records[0]
        assert (
            "[DEVELOPMENT ONLY] Password reset link: http://localhost:3000/reset-password?token=raw-token-reset-abc"
            in record2.message
        )
        # Confirm recipient email is NOT in log output
        assert "advocate@veritas.in" not in caplog.text
        assert "raw_token" not in caplog.text


def test_legacy_scrypt_password_upgrade(test_db: Session) -> None:
    import hashlib
    import os

    salt = os.urandom(16)
    digest = hashlib.scrypt(b"legacy-secure-password-123", salt=salt, n=16384, r=8, p=1)
    legacy_hash = f"{salt.hex()}:{digest.hex()}"

    user = User(
        email="legacy_user@veritas.in",
        password_hash=legacy_hash,
        is_active=True,
        email_verified_at=datetime.now(UTC),
    )
    test_db.add(user)
    test_db.commit()

    client = TestClient(app)

    # Login with valid password upgrades legacy scrypt hash to Argon2id in the same transaction
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "legacy_user@veritas.in", "password": "legacy-secure-password-123"},
    )
    assert res.status_code == 200
    assert settings.SESSION_COOKIE_NAME in client.cookies

    test_db.refresh(user)
    assert user.password_hash.startswith("$argon2id$")
    assert "legacy-secure-password-123" not in user.password_hash
    assert legacy_hash != user.password_hash

    # Subsequent login works with the new Argon2id hash
    client.cookies.delete(settings.SESSION_COOKIE_NAME)
    res2 = client.post(
        "/api/v1/auth/login",
        json={"email": "legacy_user@veritas.in", "password": "legacy-secure-password-123"},
    )
    assert res2.status_code == 200
    assert settings.SESSION_COOKIE_NAME in client.cookies


def test_absent_user_dummy_hash_timing_defense(monkeypatch: pytest.MonkeyPatch) -> None:
    client = TestClient(app)
    import app.services.auth.auth_service as auth_svc_mod

    called_dummy = False
    original_get_dummy = auth_svc_mod.get_dummy_password_hash

    def wrapped_get_dummy():
        nonlocal called_dummy
        called_dummy = True
        return original_get_dummy()

    monkeypatch.setattr(auth_svc_mod, "get_dummy_password_hash", wrapped_get_dummy)

    res = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent-user@veritas.in", "password": "some-password-attempt"},
    )
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "INVALID_CREDENTIALS"
    assert called_dummy is True


def test_postgresql_action_token_concurrency_row_locking() -> None:
    import os

    test_database_url = os.getenv("TEST_DATABASE_URL")
    if not test_database_url:
        pytest.skip("TEST_DATABASE_URL not set; skipping real PostgreSQL row-locking test")

    import asyncio
    import concurrent.futures
    import uuid
    from urllib.parse import urlparse, urlunparse

    from sqlalchemy import text

    from app.core.security import generate_opaque_token, hash_token
    from app.models.auth import ActionToken
    from app.repositories.auth.auth_repository import AuthRepository
    from app.services.auth.auth_service import AuthService

    db_name = f"veritas_lock_test_{uuid.uuid4().hex}"
    parsed = urlparse(test_database_url)
    disposable_db_url = urlunparse(parsed._replace(path=f"/{db_name}"))
    maintenance_engine = create_engine(test_database_url, isolation_level="AUTOCOMMIT")
    created_database = False

    try:
        with maintenance_engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE {db_name}"))
        created_database = True

        pg_engine = create_engine(disposable_db_url, pool_pre_ping=True)
        with pg_engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
        Base.metadata.create_all(bind=pg_engine)
        PgSession = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)

        raw_token = generate_opaque_token(32)
        t_hash = hash_token(raw_token)
        init_db = PgSession()
        try:
            repo = AuthRepository(init_db)
            user = repo.create_user(email="pg_concurrency@veritas.in", password_hash="dummy")
            init_db.flush()
            repo.create_action_token(
                user_id=user.id,
                purpose="verify_email",
                token_hash=t_hash,
                expires_at=datetime.now(UTC) + timedelta(minutes=15),
            )
            init_db.commit()
        finally:
            init_db.close()

        import threading

        barrier = threading.Barrier(2)
        results = []

        def attempt_verify():
            session = PgSession()
            try:
                auth_svc = AuthService(session)
                # Synchronize worker attempts so contention is intentional and tested
                barrier.wait(timeout=5)
                asyncio.run(auth_svc.verify_email(raw_token))
                results.append("SUCCESS")
            except Exception as e:
                results.append(type(e).__name__)
            finally:
                session.close()

        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            f1 = executor.submit(attempt_verify)
            f2 = executor.submit(attempt_verify)
            f1.result()
            f2.result()

        assert results.count("SUCCESS") == 1
        assert results.count("AuthException") == 1

        check_db = PgSession()
        try:
            repo = AuthRepository(check_db)
            user = repo.get_user_by_email("pg_concurrency@veritas.in")
            assert user.is_email_verified is True
            token_row = check_db.scalar(select(ActionToken).where(ActionToken.token_hash == t_hash))
            assert token_row.consumed_at is not None
        finally:
            check_db.close()

    finally:
        if created_database:
            with maintenance_engine.connect() as conn:
                conn.execute(text(f"DROP DATABASE IF EXISTS {db_name} WITH (FORCE)"))
