import base64
import binascii
import hashlib
import hmac
import json
import secrets
import time
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.matters import User

bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split(":", 1)
        digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=16384, r=8, p=1)
        return hmac.compare_digest(digest, bytes.fromhex(digest_hex))
    except (ValueError, TypeError):
        return False


def auth_secret() -> bytes:
    if len(settings.AUTH_SECRET) < 32:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    return settings.AUTH_SECRET.encode()


def issue_token(user_id: UUID) -> str:
    payload = json.dumps(
        {"sub": str(user_id), "exp": int(time.time()) + 86400}, separators=(",", ":")
    ).encode()
    encoded = base64.urlsafe_b64encode(payload).rstrip(b"=").decode()
    signature = hmac.new(auth_secret(), encoded.encode(), hashlib.sha256).hexdigest()
    return f"{encoded}.{signature}"


def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        encoded, signature = credentials.credentials.split(".", 1)
        expected = hmac.new(auth_secret(), encoded.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError
        payload = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        if payload["exp"] < time.time():
            raise ValueError
        user = db.get(User, UUID(payload["sub"]))
        if user is None:
            raise ValueError
        return user
    except (ValueError, KeyError, TypeError, binascii.Error):
        raise HTTPException(status_code=401, detail="Invalid authentication token") from None
