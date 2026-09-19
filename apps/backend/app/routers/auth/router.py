import contextlib
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import auth_secret, hash_password, issue_token, verify_password
from app.core.rate_limiter import check_is_locked_out, check_rate_limit, redis_dependency
from app.db.session import get_db
from app.models.matters import User

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])


class Credentials(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=12, max_length=256)


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
