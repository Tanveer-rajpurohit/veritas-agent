from typing import Annotated

from fastapi import Depends, Request, Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    AuthException,
    hash_password,
    hash_token,
    validate_origin,
    verify_password,
)
from app.db.session import get_db
from app.models.auth import User, UserSession
from app.repositories.auth.auth_repository import AuthRepository


def set_session_cookie(response: Response, raw_token: str) -> None:
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
        path="/",
        max_age=settings.SESSION_TTL_SECONDS,
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite="lax",
    )


def get_current_session(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> tuple[User, UserSession | None]:
    from app.core.security import decode_access_token

    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        user_id = decode_access_token(auth_header[7:].strip())
        if user_id:
            repo = AuthRepository(db)
            user = repo.get_user_by_id(user_id)
            if user is not None:
                return user, None
    raw_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not raw_token:
        raise AuthException(
            code="AUTHENTICATION_REQUIRED",
            message="Authentication required. Please log in again.",
            status_code=401,
        )

    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        validate_origin(request)

    token_hash = hash_token(raw_token)
    repo = AuthRepository(db)
    result = repo.get_active_session_by_token_hash(token_hash)
    if result is None:
        raise AuthException(
            code="AUTHENTICATION_REQUIRED",
            message="Invalid or expired session",
            status_code=401,
        )

    session, user = result
    return user, session


def current_user(
    session_data: Annotated[tuple[User, UserSession], Depends(get_current_session)],
) -> User:
    return session_data[0]


__all__ = [
    "AuthException",
    "clear_session_cookie",
    "current_user",
    "get_current_session",
    "hash_password",
    "set_session_cookie",
    "verify_password",
]
