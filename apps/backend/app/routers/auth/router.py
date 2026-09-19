import contextlib
from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response, status
from redis.asyncio import Redis
from sqlalchemy.orm import Session

from app.core.auth import (
    clear_session_cookie,
    current_user,
    get_current_session,
    set_session_cookie,
)
from app.core.config import settings
from app.core.rate_limiter import check_is_locked_out, check_rate_limit, redis_dependency
from app.core.security import AuthException, normalize_email, validate_origin
from app.db.session import get_db
from app.models.auth import User, UserSession
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SessionResponse,
    UpdateProfileRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth import AuthService

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name or user.full_name,
        email_verified=user.is_email_verified,
        full_name=user.full_name,
        phone_number=user.phone_number,
        law_firm=user.law_firm,
        bar_council_number=user.bar_council_number,
        avatar_url=user.avatar_url,
        city=user.city,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def register(
    payload: RegisterRequest,
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    service = AuthService(db)
    user, _ = await service.register(payload)
    return _to_user_response(user)


@router.post("/email/verify", status_code=status.HTTP_204_NO_CONTENT)
async def verify_email(
    payload: VerifyEmailRequest,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    service = AuthService(db)
    await service.verify_email(payload.token)


@router.post("/email/resend", status_code=status.HTTP_202_ACCEPTED, response_model=MessageResponse)
async def resend_verification(
    payload: ResendVerificationRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    service = AuthService(db)
    await service.resend_verification(payload.email)
    return MessageResponse(
        message="If that email is registered and unverified, a verification link has been sent."
    )


@router.post("/login", status_code=status.HTTP_204_NO_CONTENT)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    redis: Annotated[Redis | None, redis_dependency] = None,
) -> None:
    email_clean = normalize_email(payload.email)
    failed_key = f"failed_logins:email:{email_clean}"

    await check_is_locked_out(
        redis=redis,
        key=failed_key,
        limit=10,
        window_seconds=300,
        lockout_message="Too many failed login attempts. Please wait 5 minutes.",
    )

    service = AuthService(db)
    try:
        _, raw_session_token, _ = service.login(
            email=payload.email,
            password=payload.password,
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
    except AuthException as exc:
        if exc.code == "INVALID_CREDENTIALS":
            try:
                await check_rate_limit(
                    redis=redis,
                    key=failed_key,
                    limit=10,
                    window_seconds=300,
                    custom_message="Too many failed login attempts. Please wait 5 minutes.",
                )
            except Exception:
                raise AuthException(
                    code="RATE_LIMITED",
                    message="Too many failed login attempts. Please wait 5 minutes.",
                    status_code=429,
                ) from None
        raise

    if redis is not None:
        with contextlib.suppress(Exception):
            await redis.delete(failed_key)

    set_session_cookie(response, raw_session_token)


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    user: Annotated[User, Depends(current_user)],
) -> UserResponse:
    return _to_user_response(user)


@router.patch("/me", response_model=UserResponse)
def update_current_user_profile(
    payload: UpdateProfileRequest,
    user: Annotated[User, Depends(current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> UserResponse:
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None and isinstance(value, str):
            value = value.strip()
        setattr(user, field, value)

    user.updated_at = datetime.now(UTC)
    db.add(user)
    db.commit()
    db.refresh(user)
    return _to_user_response(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    raw_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if raw_token:
        validate_origin(request)
        service = AuthService(db)
        service.logout(raw_token)
    clear_session_cookie(response)


@router.get("/sessions", response_model=list[SessionResponse])
def list_sessions(
    session_data: Annotated[tuple[User, UserSession], Depends(get_current_session)],
    db: Annotated[Session, Depends(get_db)],
) -> list[SessionResponse]:
    user, session = session_data
    service = AuthService(db)
    return service.list_sessions(user.id, session.id)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    session_id: UUID,
    response: Response,
    session_data: Annotated[tuple[User, UserSession], Depends(get_current_session)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    user, current_session = session_data
    service = AuthService(db)
    service.revoke_session(user.id, session_id)
    if session_id == current_session.id:
        clear_session_cookie(response)


@router.post(
    "/password/forgot",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=MessageResponse,
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    service = AuthService(db)
    await service.forgot_password(payload.email)
    return MessageResponse(
        message="If that email is registered, password reset instructions have been sent."
    )


@router.post("/password/reset", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    service = AuthService(db)
    await service.reset_password(payload.token, payload.new_password)
    return MessageResponse(
        message="Password reset successfully. You can now log in with your new password."
    )
