from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    AuthException,
    generate_opaque_token,
    get_dummy_password_hash,
    hash_password,
    hash_token,
    normalize_email,
    verify_password,
)
from app.models.auth import User
from app.repositories.auth.auth_repository import AuthRepository
from app.schemas.auth.auth import RegisterRequest
from app.services.auth.email_service import send_password_reset, send_verification


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = AuthRepository(db)

    async def register(self, payload: RegisterRequest) -> tuple[User, str]:
        email = normalize_email(payload.email)
        if "@" not in email or len(email) < 5:
            raise AuthException(
                code="INVALID_EMAIL",
                message="A valid email address is required",
                status_code=422,
            )

        existing = self.repo.get_user_by_email(email)
        if existing is not None:
            raise AuthException(
                code="ACCOUNT_ALREADY_EXISTS",
                message="An account with this email already exists",
                status_code=409,
            )

        pwd_hash = hash_password(payload.password)
        name = (payload.full_name or payload.display_name or "").strip() or None
        user = self.repo.create_user(
            email=email,
            password_hash=pwd_hash,
            display_name=payload.display_name.strip() if payload.display_name else name,
            full_name=payload.full_name.strip() if payload.full_name else name,
            is_active=True,
        )

        try:
            self.db.flush()
        except IntegrityError:
            self.db.rollback()
            raise AuthException(
                code="ACCOUNT_ALREADY_EXISTS",
                message="An account with this email already exists",
                status_code=409,
            ) from None

        raw_token = generate_opaque_token(32)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(UTC) + timedelta(seconds=settings.AUTH_TOKEN_TTL_SECONDS)
        self.repo.create_action_token(
            user_id=user.id,
            purpose="verify_email",
            token_hash=token_hash,
            expires_at=expires_at,
        )

        self.db.commit()
        self.db.refresh(user)

        # Dispatch email strictly after transaction commit
        await send_verification(user.email, raw_token)
        return user, raw_token

    async def verify_email(self, token: str) -> None:
        token_clean = token.strip()
        token_hash = hash_token(token_clean)

        action_token = self.repo.get_valid_action_token_for_update(
            token_hash=token_hash, purpose="verify_email"
        )
        if action_token is None:
            raise AuthException(
                code="TOKEN_INVALID_OR_EXPIRED",
                message="Invalid or expired verification token",
                status_code=400,
            )

        user = self.repo.get_user_by_id(action_token.user_id)
        if user is None:
            raise AuthException(
                code="TOKEN_INVALID_OR_EXPIRED",
                message="Invalid or expired verification token",
                status_code=400,
            )

        self.repo.consume_action_token(action_token)
        self.repo.mark_email_verified(user)
        self.db.commit()

    async def resend_verification(self, email: str) -> str | None:
        clean_email = normalize_email(email)
        user = self.repo.get_user_by_email(clean_email)

        if user is None or user.is_email_verified or not user.is_active:
            return None

        self.repo.revoke_action_tokens_for_user(user.id, purpose="verify_email")
        raw_token = generate_opaque_token(32)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(UTC) + timedelta(seconds=settings.AUTH_TOKEN_TTL_SECONDS)
        self.repo.create_action_token(
            user_id=user.id,
            purpose="verify_email",
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.commit()

        await send_verification(user.email, raw_token)
        return raw_token

    def login(self, email: str, password: str) -> User:
        clean_email = normalize_email(email)
        user = self.repo.get_user_by_email(clean_email)

        # Always perform password verification using dummy Argon2id hash when user is absent
        stored_hash = (
            user.password_hash if (user and user.password_hash) else get_dummy_password_hash()
        )
        valid = verify_password(password, stored_hash)

        if not valid or user is None:
            raise AuthException(
                code="INVALID_CREDENTIALS",
                message="Invalid email or password",
                status_code=401,
            )

        if not user.is_active:
            raise AuthException(
                code="INVALID_CREDENTIALS",
                message="Invalid email or password",
                status_code=401,
            )

        if not user.is_email_verified:
            raise AuthException(
                code="EMAIL_NOT_VERIFIED",
                message="Verify your email before logging in",
                status_code=403,
            )

        # Upgrade legacy scrypt hash to Argon2id in the same transaction
        if user.password_hash and not user.password_hash.startswith("$argon2"):
            user.password_hash = hash_password(password)
            user.updated_at = datetime.now(UTC)
            self.repo.update_user_password(user, user.password_hash)

        self.db.commit()
        return user

    async def forgot_password(self, email: str) -> str | None:
        clean_email = normalize_email(email)
        user = self.repo.get_user_by_email(clean_email)

        if user is None or not user.is_active:
            return None

        self.repo.revoke_action_tokens_for_user(user.id, purpose="reset_password")
        raw_token = generate_opaque_token(32)
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(UTC) + timedelta(seconds=settings.AUTH_TOKEN_TTL_SECONDS)
        self.repo.create_action_token(
            user_id=user.id,
            purpose="reset_password",
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.commit()

        await send_password_reset(user.email, raw_token)
        return raw_token

    async def reset_password(self, token: str, new_password: str) -> UUID:
        token_clean = token.strip()
        token_hash = hash_token(token_clean)

        action_token = self.repo.get_valid_action_token_for_update(
            token_hash=token_hash, purpose="reset_password"
        )
        if action_token is None:
            raise AuthException(
                code="TOKEN_INVALID_OR_EXPIRED",
                message="Invalid or expired reset token",
                status_code=400,
            )

        user = self.repo.get_user_by_id(action_token.user_id)
        if user is None:
            raise AuthException(
                code="TOKEN_INVALID_OR_EXPIRED",
                message="Invalid or expired reset token",
                status_code=400,
            )

        self.repo.consume_action_token(action_token)
        new_pwd_hash = hash_password(new_password)
        self.repo.update_user_password(user, new_pwd_hash)
        self.db.commit()
        return user.id
