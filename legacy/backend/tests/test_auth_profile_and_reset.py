from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.auth import User

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


@pytest.fixture
def auth_client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, dict[str, str]]:
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "console")
    client = TestClient(app)
    creds = {"email": "advocate@veritas.in", "password": "super-secure-password-123"}
    res = client.post("/api/v1/auth/register", json=creds)
    assert res.status_code == 201

    # Verify user in database
    db = TestingSessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == creds["email"]))
        assert user is not None
        db.commit()
    finally:
        db.close()

    # Login and store session cookie
    login_res = client.post("/api/v1/auth/login", json=creds)
    assert login_res.status_code == 200
    assert settings.SESSION_COOKIE_NAME in client.cookies
    return client, creds


def test_get_me_profile_unauthorized() -> None:
    client = TestClient(app)
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_get_me_profile_success(auth_client: tuple[TestClient, dict[str, str]]) -> None:
    client, creds = auth_client
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 200
    profile = res.json()
    assert profile["email"] == creds["email"]
    assert "id" in profile
    assert profile["full_name"] is None
    assert profile["law_firm"] is None


def test_patch_me_profile_success(auth_client: tuple[TestClient, dict[str, str]]) -> None:
    client, _ = auth_client
    patch_payload = {
        "full_name": "Tanveer Singh, Advocate",
        "phone_number": "+919876543210",
        "law_firm": "Chambers of Veritas",
        "bar_council_number": "D/1042/2020",
        "city": "New Delhi",
    }
    res = client.patch("/api/v1/auth/me", json=patch_payload)
    assert res.status_code == 200
    updated = res.json()
    assert updated["full_name"] == "Tanveer Singh, Advocate"
    assert updated["phone_number"] == "+919876543210"
    assert updated["law_firm"] == "Chambers of Veritas"
    assert updated["bar_council_number"] == "D/1042/2020"
    assert updated["city"] == "New Delhi"

    fetch_res = client.get("/api/v1/auth/me")
    assert fetch_res.status_code == 200
    assert fetch_res.json()["full_name"] == "Tanveer Singh, Advocate"


def test_forgot_and_reset_password_flow(
    auth_client: tuple[TestClient, dict[str, str]],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    client, creds = auth_client
    email = creds["email"]

    import app.services.auth.auth_service as auth_service_module

    sent_tokens: list[str] = []

    async def fake_send_password_reset(to: str, token: str) -> None:
        sent_tokens.append(token)

    monkeypatch.setattr(auth_service_module, "send_password_reset", fake_send_password_reset)

    forgot_res = client.post("/api/v1/auth/password/forgot", json={"email": email})
    assert forgot_res.status_code == 202
    assert "instructions have been sent" in forgot_res.json()["message"]
    assert len(sent_tokens) == 1
    raw_token = sent_tokens[0]

    bad_reset = client.post(
        "/api/v1/auth/password/reset",
        json={
            "token": "WRONG_TOKEN",
            "new_password": "brand-new-secure-password-456",
        },
    )
    assert bad_reset.status_code == 400

    good_reset = client.post(
        "/api/v1/auth/password/reset",
        json={
            "token": raw_token,
            "new_password": "brand-new-secure-password-456",
        },
    )
    assert good_reset.status_code == 200

    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": creds["password"]},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "brand-new-secure-password-456"},
    )
    assert new_login.status_code == 200
