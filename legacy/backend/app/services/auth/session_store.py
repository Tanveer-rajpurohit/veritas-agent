import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from redis.asyncio import Redis
from redis.exceptions import WatchError

from app.core.config import settings
from app.core.security import AuthException, generate_refresh_token, hash_identifier, hash_token


@dataclass(frozen=True)
class RedisSession:
    id: UUID
    user_id: UUID
    refresh_hash: str
    created_at: datetime
    expires_at: datetime
    last_seen_at: datetime
    ip_hash: str | None = None
    user_agent_hash: str | None = None


class SessionStore:
    key_prefix = "auth:session:"
    user_prefix = "auth:user_sessions:"

    def __init__(self, redis: Redis) -> None:
        self.redis = redis

    def _session_key(self, session_id: UUID | str) -> str:
        return f"{self.key_prefix}{session_id}"

    def _user_key(self, user_id: UUID | str) -> str:
        return f"{self.user_prefix}{user_id}"

    @staticmethod
    def _encode(session: RedisSession) -> str:
        payload = asdict(session)
        payload["id"] = str(session.id)
        payload["user_id"] = str(session.user_id)
        for field in ("created_at", "expires_at", "last_seen_at"):
            payload[field] = payload[field].isoformat()
        return json.dumps(payload, separators=(",", ":"))

    @staticmethod
    def _decode(value: str | bytes | None) -> RedisSession | None:
        if not value:
            return None
        if isinstance(value, bytes):
            value = value.decode("utf-8")
        try:
            payload = json.loads(value)
            return RedisSession(
                id=UUID(payload["id"]),
                user_id=UUID(payload["user_id"]),
                refresh_hash=payload["refresh_hash"],
                created_at=datetime.fromisoformat(payload["created_at"]),
                expires_at=datetime.fromisoformat(payload["expires_at"]),
                last_seen_at=datetime.fromisoformat(payload["last_seen_at"]),
                ip_hash=payload.get("ip_hash"),
                user_agent_hash=payload.get("user_agent_hash"),
            )
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            return None

    async def create(
        self,
        user_id: UUID,
        ip: str | None,
        user_agent: str | None,
    ) -> tuple[RedisSession, str]:
        now = datetime.now(UTC)
        session_id = uuid4()
        secret = generate_refresh_token()
        refresh_token = f"{session_id}.{secret}"
        session = RedisSession(
            id=session_id,
            user_id=user_id,
            refresh_hash=hash_token(refresh_token),
            created_at=now,
            expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            last_seen_at=now,
            ip_hash=hash_identifier(ip) if ip else None,
            user_agent_hash=hash_identifier(user_agent) if user_agent else None,
        )
        ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.set(self._session_key(session_id), self._encode(session), ex=ttl)
            pipe.sadd(self._user_key(user_id), str(session_id))
            pipe.expire(self._user_key(user_id), ttl)
            await pipe.execute()
        return session, refresh_token

    async def get(self, session_id: UUID | str) -> RedisSession | None:
        return self._decode(await self.redis.get(self._session_key(session_id)))

    async def authenticate(self, user_id: UUID | str, session_id: UUID | str) -> RedisSession:
        session = await self.get(session_id)
        if session is None or str(session.user_id) != str(user_id):
            raise AuthException(
                code="AUTHENTICATION_REQUIRED",
                message="Invalid or expired session",
                status_code=401,
            )
        return session

    async def rotate(self, refresh_token: str) -> tuple[RedisSession, str]:
        session_id_text, separator, _ = refresh_token.partition(".")
        if not separator:
            raise AuthException(
                code="AUTHENTICATION_REQUIRED",
                message="Invalid or expired refresh token.",
                status_code=401,
            )
        try:
            session_id = UUID(session_id_text)
        except ValueError:
            raise AuthException(
                code="AUTHENTICATION_REQUIRED",
                message="Invalid or expired refresh token.",
                status_code=401,
            ) from None
        ttl = settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400
        key = self._session_key(session_id)
        try:
            async with self.redis.pipeline(transaction=True) as pipe:
                await pipe.watch(key)
                session = self._decode(await pipe.get(key))
                if session is None or session.refresh_hash != hash_token(refresh_token):
                    raise AuthException(
                        code="AUTHENTICATION_REQUIRED",
                        message="Invalid or expired refresh token.",
                        status_code=401,
                    )
                now = datetime.now(UTC)
                next_token = f"{session.id}.{generate_refresh_token()}"
                rotated = RedisSession(
                    **{
                        **asdict(session),
                        "refresh_hash": hash_token(next_token),
                        "last_seen_at": now,
                        "expires_at": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                    }
                )
                pipe.multi()
                pipe.set(key, self._encode(rotated), ex=ttl)
                pipe.expire(self._user_key(session.user_id), ttl)
                await pipe.execute()
                return rotated, next_token
        except WatchError:
            raise AuthException(
                code="AUTHENTICATION_REQUIRED",
                message="Refresh token was already used. Please log in again.",
                status_code=401,
            ) from None

    async def revoke(self, user_id: UUID | str, session_id: UUID | str) -> bool:
        session = await self.get(session_id)
        if session is None or str(session.user_id) != str(user_id):
            return False
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.delete(self._session_key(session_id))
            pipe.srem(self._user_key(user_id), str(session_id))
            await pipe.execute()
        return True

    async def revoke_all(self, user_id: UUID | str) -> None:
        ids = await self.redis.smembers(self._user_key(user_id))
        keys = [
            self._session_key(value.decode() if isinstance(value, bytes) else value)
            for value in ids
        ]
        if keys:
            await self.redis.delete(*keys)
        await self.redis.delete(self._user_key(user_id))

    async def list_for_user(self, user_id: UUID | str) -> list[RedisSession]:
        ids = await self.redis.smembers(self._user_key(user_id))
        if not ids:
            return []
        keys = [
            self._session_key(value.decode() if isinstance(value, bytes) else value)
            for value in ids
        ]
        sessions = [self._decode(value) for value in await self.redis.mget(keys)]
        return sorted(
            [session for session in sessions if session is not None],
            key=lambda item: item.created_at,
            reverse=True,
        )
