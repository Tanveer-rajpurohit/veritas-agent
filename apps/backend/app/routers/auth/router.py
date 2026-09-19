import contextlib
import secrets
import time
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import (
    auth_secret,
    current_user,
    hash_password,
    issue_token,
    verify_password,
)
from app.core.email import send_email
from app.core.rate_limiter import check_is_locked_out, check_rate_limit, redis_dependency
from app.db.session import get_db
from app.models.matters import User

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

_in_memory_reset_codes: dict[str, tuple[str, float]] = {}


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=12, max_length=256)


class RegisterRequest(Credentials):
    full_name: str = Field(min_length=1, max_length=255)


class UserProfileResponse(BaseModel):
    id: UUID
    email: str
    full_name: str | None = None
    phone_number: str | None = None
    law_firm: str | None = None
    bar_council_number: str | None = None
    avatar_url: str | None = None
    city: str | None = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UpdateProfileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, max_length=255)
    phone_number: str | None = Field(default=None, max_length=32)
    law_firm: str | None = Field(default=None, max_length=255)
    bar_council_number: str | None = Field(default=None, max_length=64)
    avatar_url: str | None = Field(default=None, max_length=1024)
    city: str | None = Field(default=None, max_length=128)


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    code: str = Field(min_length=4, max_length=16)
    new_password: str = Field(min_length=12, max_length=256)


@router.post("/register", status_code=201)
def register(payload: RegisterRequest, db: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    auth_secret()
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=422, detail="Invalid email")
    full_name = payload.full_name.strip()
    if not full_name:
        raise HTTPException(status_code=422, detail="Full name is required")
    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        full_name=full_name,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Account already exists") from None
    return {"access_token": issue_token(user.id), "token_type": "bearer"}


@router.post("/login")
async def login(
    payload: Credentials,
    db: Annotated[Session, Depends(get_db)],
    redis: Annotated[Redis | None, redis_dependency] = None,
) -> dict[str, str]:
    auth_secret()
    email_clean = payload.email.strip().lower()
    failed_key = f"failed_logins:email:{email_clean}"

    await check_is_locked_out(
        redis=redis,
        key=failed_key,
        limit=10,
        window_seconds=300,
        lockout_message="Too many failed login attempts. Please wait 5 minutes.",
    )

    user = db.scalar(select(User).where(User.email == email_clean))
    if user is None or not verify_password(payload.password, user.password_hash):
        try:
            await check_rate_limit(
                redis=redis,
                key=failed_key,
                limit=10,
                window_seconds=300,
                custom_message="Too many failed login attempts. Please wait 5 minutes.",
            )
        except HTTPException:
            raise HTTPException(
                status_code=429,
                detail="Too many failed login attempts. Please wait 5 minutes.",
            ) from None
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if redis is not None:
        with contextlib.suppress(Exception):
            await redis.delete(failed_key)

    return {"access_token": issue_token(user.id), "token_type": "bearer"}


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    user: Annotated[User, Depends(current_user)],
) -> User:
    return user


@router.patch("/me", response_model=UserProfileResponse)
def update_current_user_profile(
    payload: UpdateProfileRequest,
    user: Annotated[User, Depends(current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None and isinstance(value, str):
            value = value.strip()
        setattr(user, field, value)

    user.updated_at = datetime.now(UTC)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
    redis: Annotated[Redis | None, redis_dependency] = None,
) -> dict[str, str]:
    email_clean = payload.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email_clean))

    if user is None:
        return {"message": "If that email is registered, a password reset code has been sent."}

    chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    code = "".join(secrets.choice(chars) for _ in range(6))

    if redis is not None:
        with contextlib.suppress(Exception):
            await redis.set(f"pwd_reset:{email_clean}", code, ex=600)
    _in_memory_reset_codes[email_clean] = (code, time.time() + 600)

    html_body = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your Veritas Legal password</title>
</head>
<body style="margin: 0; padding: 48px 24px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1c1917; line-height: 1.6; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 560px; margin: 0 auto;">
    <div style="padding-bottom: 16px; border-bottom: 2px solid #1c1917; margin-bottom: 32px;">
      <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 700; letter-spacing: -0.4px; color: #1c1917;">VERITAS</span>
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 600; color: #b45309; letter-spacing: 1.5px; text-transform: uppercase; margin-left: 10px; padding: 2px 6px; background-color: #fef3c7; border-radius: 3px;">LEGAL INTELLIGENCE</span>
    </div>

    <h1 style="margin: 0 0 14px; font-family: Georgia, 'Times New Roman', serif; font-size: 22px; font-weight: 600; color: #1c1917; line-height: 1.3;">
      Security Verification
    </h1>
    <p style="margin: 0 0 20px; font-size: 15px; color: #44403c; line-height: 1.6;">
      You requested a password reset for your Veritas workspace account associated with <strong style="color: #1c1917;">{email_clean}</strong>. Enter the single-use verification code below to authorize the credential update:
    </p>

    <div style="margin: 28px 0; padding: 20px 0; border-top: 1px dashed #d6d3d1; border-bottom: 1px dashed #d6d3d1;">
      <div style="font-size: 11px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #78716c; margin-bottom: 8px;">Single-Use Authorization Code</div>
      <div style="font-size: 38px; font-weight: 700; letter-spacing: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #1c1917;">
        {code}
      </div>
    </div>

    <p style="margin: 0 0 16px; font-size: 13.5px; color: #57534e; line-height: 1.6;">
      This verification code is valid for <strong style="color: #b45309;">10 minutes</strong>. If you did not initiate this request, your credentials remain secure and no further action is required.
    </p>

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e7e5e4; font-size: 12px; color: #a8a29e; line-height: 1.5;">
      Chambers of Veritas &middot; Evidence-First Legal Drafting and Verification Workspace &middot; Confidential
    </div>
  </div>
</body>
</html>"""

    with contextlib.suppress(Exception):
        await send_email(email_clean, "Reset Your Veritas Legal Password", html_body)

    return {"message": "If that email is registered, a password reset code has been sent."}


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
    redis: Annotated[Redis | None, redis_dependency] = None,
) -> dict[str, str]:
    email_clean = payload.email.strip().lower()
    provided_code = payload.code.strip().upper()

    stored_code: str | None = None
    if redis is not None:
        with contextlib.suppress(Exception):
            raw = await redis.get(f"pwd_reset:{email_clean}")
            if raw is not None:
                stored_code = raw.decode("utf-8") if isinstance(raw, bytes) else str(raw)

    if stored_code is None:
        cached = _in_memory_reset_codes.get(email_clean)
        if cached and cached[1] > time.time():
            stored_code = cached[0]

    if not stored_code or stored_code.strip().upper() != provided_code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    user = db.scalar(select(User).where(User.email == email_clean))
    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")

    user.password_hash = hash_password(payload.new_password)
    user.updated_at = datetime.now(UTC)
    db.add(user)
    db.commit()

    if redis is not None:
        with contextlib.suppress(Exception):
            await redis.delete(f"pwd_reset:{email_clean}")
            await redis.delete(f"failed_logins:email:{email_clean}")
    _in_memory_reset_codes.pop(email_clean, None)

    return {"message": "Password reset successfully. You can now log in with your new password."}
