from typing import Annotated
from uuid import UUID

from fastapi import Depends, Request, Response
from redis.asyncio import Redis
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.redis import get_redis
from app.core.security import (
    AuthException,
    decode_access_token,
    hash_password,
    validate_origin,
    verify_password,
)
from app.db.session import get_db
from app.models.auth import User
from app.repositories.auth.auth_repository import AuthRepository
from app.services.auth.session_store import RedisSession, SessionStore


def set_session_cookie(response: Response, refresh_token: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/api/v1/auth",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
    )


def set_access_cookie(response: Response, access_token: str) -> None:
    response.set_cookie(
        key=settings.ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/api/v1/auth",
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
    )
    response.delete_cookie(
        key=settings.ACCESS_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
    )


async def get_current_session(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
    redis: Annotated[Redis | None, Depends(get_redis)],
) -> tuple[User, RedisSession]:
    if redis is None:
        raise AuthException(
            code="SESSION_UNAVAILABLE",
            message="Authentication is temporarily unavailable.",
            status_code=503,
        )

    store = SessionStore(redis)
    authorization = request.headers.get("authorization", "")
    if authorization.lower().startswith("bearer "):
        access_token = authorization[7:].strip()
    else:
        access_token = request.cookies.get(settings.ACCESS_COOKIE_NAME, "")
        if access_token and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            validate_origin(request)
    claims = decode_access_token(access_token) if access_token else None
    if claims:
        user_id, session_id = claims
        session = await store.authenticate(user_id, session_id)
        user = AuthRepository(db).get_user_by_id(UUID(user_id))
        if user is not None and user.is_active:
            return user, session

    raise AuthException(
        code="AUTHENTICATION_REQUIRED",
        message="Authentication required. Please log in again.",
        status_code=401,
    )


async def current_user(
    session_data: Annotated[tuple[User, RedisSession], Depends(get_current_session)],
) -> User:
    return session_data[0]


__all__ = [
    "AuthException",
    "clear_session_cookie",
    "current_user",
    "get_current_session",
    "hash_password",
    "set_session_cookie",
    "set_access_cookie",
    "verify_password",
]
