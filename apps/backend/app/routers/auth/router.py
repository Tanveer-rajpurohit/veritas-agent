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
from app.models.auth import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SessionResponse,
    TokenPair,
    UpdateProfileRequest,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth import AuthService
from app.services.auth.session_store import RedisSession, SessionStore

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


@router.post("/login", response_model=TokenPair)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    redis: Annotated[Redis | None, redis_dependency] = None,
):
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
        logged_user = service.login(email=payload.email, password=payload.password)
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

    if redis is None:
        raise AuthException(
            code="SESSION_UNAVAILABLE",
            message="Authentication is temporarily unavailable.",
            status_code=503,
        )
    await redis.delete(failed_key)

    from app.core.security import create_access_token

    session, refresh_token = await SessionStore(redis).create(
        user_id=logged_user.id,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    set_session_cookie(response, refresh_token)
    return TokenPair(
        access_token=create_access_token(str(logged_user.id), str(session.id)),
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(
    payload: RefreshRequest,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    redis: Annotated[Redis | None, redis_dependency] = None,
) -> TokenPair:
    from app.core.security import create_access_token
    from app.repositories.auth.auth_repository import AuthRepository

    if redis is None:
        raise AuthException(
            code="SESSION_UNAVAILABLE",
            message="Session storage unavailable. Please log in again.",
            status_code=503,
        )
    session, new_refresh = await SessionStore(redis).rotate(payload.refresh_token)
    user = AuthRepository(db).get_user_by_id(session.user_id)
    if user is None or not user.is_active:
        raise AuthException(
            code="AUTHENTICATION_REQUIRED",
            message="Account unavailable. Please log in again.",
            status_code=401,
        )
    set_session_cookie(response, new_refresh)
    return TokenPair(
        access_token=create_access_token(str(user.id), str(session.id)),
        refresh_token=new_refresh,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


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
async def logout(
    request: Request,
    response: Response,
    redis: Annotated[Redis | None, redis_dependency] = None,
) -> None:
    if redis is not None:
        session_id: str | None = None
        authorization = request.headers.get("authorization", "")
        if authorization.lower().startswith("bearer "):
            from app.core.security import decode_access_token

            claims = decode_access_token(authorization[7:].strip())
            session_id = claims[1] if claims else None
            user_id = claims[0] if claims else None
        else:
            refresh_token = request.cookies.get(settings.SESSION_COOKIE_NAME, "")
            if refresh_token:
                validate_origin(request)
            session_id, _, _ = refresh_token.partition(".")
            session = await SessionStore(redis).get(session_id) if session_id else None
            user_id = str(session.user_id) if session else None
        if session_id and user_id:
            await SessionStore(redis).revoke(user_id, session_id)
    clear_session_cookie(response)


@router.get("/sessions", response_model=list[SessionResponse])
async def list_sessions(
    session_data: Annotated[tuple[User, RedisSession], Depends(get_current_session)],
    redis: Annotated[Redis | None, redis_dependency] = None,
) -> list[SessionResponse]:
    user, session = session_data
    if redis is None:
        raise AuthException("SESSION_UNAVAILABLE", "Authentication is unavailable", 503)
    sessions = await SessionStore(redis).list_for_user(user.id)
    return [
        SessionResponse(
            id=item.id,
            created_at=item.created_at,
            expires_at=item.expires_at,
            last_seen_at=item.last_seen_at,
            is_current=item.id == session.id,
        )
        for item in sessions
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_session(
    session_id: UUID,
    response: Response,
    session_data: Annotated[tuple[User, RedisSession], Depends(get_current_session)],
    redis: Annotated[Redis | None, redis_dependency] = None,
) -> None:
    user, current_session = session_data
    if redis is None:
        raise AuthException("SESSION_UNAVAILABLE", "Authentication is unavailable", 503)
    if not await SessionStore(redis).revoke(user.id, session_id):
        raise AuthException("NOT_FOUND", "Session not found", 404)
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
    redis: Annotated[Redis | None, redis_dependency] = None,
) -> MessageResponse:
    service = AuthService(db)
    user_id = await service.reset_password(payload.token, payload.new_password)
    if redis is not None:
        await SessionStore(redis).revoke_all(user_id)
    return MessageResponse(
        message="Password reset successfully. You can now log in with your new password."
    )
