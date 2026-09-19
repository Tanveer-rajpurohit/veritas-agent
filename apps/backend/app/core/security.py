import hashlib
import hmac
import secrets
from typing import Any
from urllib.parse import urlparse

from fastapi import Request
from pwdlib import PasswordHash

from app.core.config import settings

_password_hasher = PasswordHash.recommended()
_DUMMY_ARGON2_HASH = _password_hasher.hash("veritas-dummy-passphrase-timing-defense")


class AuthException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: Any = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def get_dummy_password_hash() -> str:
    return _DUMMY_ARGON2_HASH


def verify_password(password: str, stored: str | None) -> bool:
    if not stored:
        return False

    if stored.startswith("$argon2"):
        try:
            return bool(_password_hasher.verify(password, stored))
        except Exception:
            return False

    # Legacy scrypt upgrade fallback
    try:
        salt_hex, digest_hex = stored.split(":", 1)
        digest = hashlib.scrypt(
            password.encode(),
            salt=bytes.fromhex(salt_hex),
            n=16384,
            r=8,
            p=1,
        )
        return hmac.compare_digest(digest, bytes.fromhex(digest_hex))
    except (ValueError, TypeError):
        return False


def generate_opaque_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_identifier(identifier: str) -> str:
    return hashlib.sha256(identifier.encode("utf-8")).hexdigest()


def normalize_email(email: str) -> str:
    return email.strip().casefold()


def normalize_origin(url: str) -> str:
    url = url.strip()
    if not url:
        return ""
    try:
        parsed = urlparse(url)
        scheme = parsed.scheme.lower() if parsed.scheme else ""
        hostname = parsed.hostname.lower() if parsed.hostname else ""
        if not scheme or not hostname:
            return ""
        port = parsed.port
        if port is not None and not (1 <= port <= 65535):
            return ""
    except (ValueError, TypeError):
        return ""

    if (scheme == "http" and port == 80) or (scheme == "https" and port == 443) or port is None:
        return f"{scheme}://{hostname}"
    return f"{scheme}://{hostname}:{port}"


def get_allowed_origins() -> set[str]:
    allowed = set()
    for origin in settings.ALLOWED_ORIGINS:
        norm = normalize_origin(origin)
        if norm:
            allowed.add(norm)

    app_base = normalize_origin(settings.APP_BASE_URL)
    if app_base:
        allowed.add(app_base)

    if settings.ENVIRONMENT != "production":
        allowed.update(
            {
                "http://localhost:3000",
                "http://localhost:8000",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:8000",
                "http://testserver",
                "https://testserver",
            }
        )
    return allowed


def validate_origin(request: Request) -> None:
    origin_header = request.headers.get("origin")
    if not origin_header:
        referer = request.headers.get("referer")
        if referer:
            origin_header = referer

    if not origin_header:
        if settings.ENVIRONMENT != "production":
            return
        raise AuthException(
            code="FORBIDDEN",
            message="Origin header required for cookie-authenticated mutations",
            status_code=403,
        )

    norm = normalize_origin(origin_header)
    allowed = get_allowed_origins()

    if not norm or norm not in allowed:
        raise AuthException(
            code="FORBIDDEN",
            message="Request origin not allowed",
            status_code=403,
        )
