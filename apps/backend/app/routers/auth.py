from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import auth_secret, hash_password, issue_token, verify_password
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
def login(payload: Credentials, db: Annotated[Session, Depends(get_db)]) -> dict[str, str]:
    auth_secret()
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": issue_token(user.id), "token_type": "bearer"}
