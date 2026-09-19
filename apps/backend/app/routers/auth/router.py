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
def register(payload: Credentials, db: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    auth_secret()
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=422, detail="Invalid email")
    user = User(email=email, password_hash=hash_password(payload.password))
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
<body style="margin: 0; padding: 40px 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.6; -webkit-font-smoothing: antialiased;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="margin-bottom: 28px; border-bottom: 2px solid #0f172a; padding-bottom: 16px;">
      <span style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; color: #0f172a;">
        VERITAS <span style="font-weight: 400; font-size: 15px; color: #c8963e; letter-spacing: 2px; text-transform: uppercase; margin-left: 6px;">Legal Drafting</span>
      </span>
    </div>

    <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #0f172a;">
      Password Reset Request
    </p>
    <p style="margin: 0 0 16px; font-size: 14px; color: #334155; line-height: 1.6;">
      We received a request to reset the password for your Veritas account (<strong>{email_clean}</strong>). Use the verification code below to complete your password reset:
    </p>

    <div style="margin: 28px 0; text-align: center; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px;">
      <span style="display: inline-block; font-size: 34px; font-weight: 700; letter-spacing: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #0f172a;">
        {code}
      </span>
    </div>

    <p style="margin: 0 0 16px; font-size: 13px; color: #64748b; line-height: 1.5;">
      This security verification code is valid for <strong>10 minutes</strong>. If you did not initiate this request, please disregard this email or contact your firm administrator immediately.
    </p>

    <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
      Chambers of Veritas · Evidence-first legal drafting and verification workspace.
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
