import time
from collections import defaultdict

from fastapi import Depends, HTTPException, Request, status
from redis.asyncio import Redis

from app.core.redis import get_redis

LUA_SLIDING_WINDOW_SCRIPT = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clear_before = now - window

redis.call("ZREMRANGEBYSCORE", key, 0, clear_before)
local current_count = redis.call("ZCARD", key)

if current_count < limit then
    redis.call("ZADD", key, now, tostring(now))
    redis.call("PEXPIRE", key, window)
    return {1, limit - current_count - 1}
else
    return {0, 0}
end
"""

LUA_PEEK_WINDOW_SCRIPT = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local clear_before = now - window

redis.call("ZREMRANGEBYSCORE", key, 0, clear_before)
return redis.call("ZCARD", key)
"""

_in_memory_timestamps: dict[str, list[float]] = defaultdict(list)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "127.0.0.1"


def _check_in_memory_rate_limit(
    key: str,
    limit: int,
    window_seconds: int,
    custom_message: str | None = None,
) -> None:
    now = time.time()
    cutoff = now - window_seconds
    timestamps = [ts for ts in _in_memory_timestamps[key] if ts > cutoff]
    if len(timestamps) >= limit:
        _in_memory_timestamps[key] = timestamps
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=custom_message or "Too many requests. Please slow down and try again.",
            headers={
                "Retry-After": str(window_seconds),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
            },
        )
    timestamps.append(now)
    _in_memory_timestamps[key] = timestamps


def _peek_in_memory_locked_out(
    key: str,
    limit: int,
    window_seconds: int,
    lockout_message: str,
) -> None:
    now = time.time()
    cutoff = now - window_seconds
    timestamps = [ts for ts in _in_memory_timestamps[key] if ts > cutoff]
    _in_memory_timestamps[key] = timestamps
    if len(timestamps) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=lockout_message,
            headers={
                "Retry-After": str(window_seconds),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
            },
        )


async def check_rate_limit(
    redis: Redis | None,
    key: str,
    limit: int,
    window_seconds: int,
    custom_message: str | None = None,
) -> None:
    if redis is None:
        _check_in_memory_rate_limit(key, limit, window_seconds, custom_message)
        return

    now_ms = int(time.time() * 1000)
    window_ms = window_seconds * 1000

    try:
        result = await redis.eval(
            LUA_SLIDING_WINDOW_SCRIPT,
            1,
            key,
            now_ms,
            window_ms,
            limit,
        )
        allowed = bool(result[0])
    except Exception:
        _check_in_memory_rate_limit(key, limit, window_seconds, custom_message)
        return

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=custom_message or "Too many requests. Please slow down and try again.",
            headers={
                "Retry-After": str(window_seconds),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
            },
        )


async def check_is_locked_out(
    redis: Redis | None,
    key: str,
    limit: int,
    window_seconds: int,
    lockout_message: str,
) -> None:
    if redis is None:
        _peek_in_memory_locked_out(key, limit, window_seconds, lockout_message)
        return

    now_ms = int(time.time() * 1000)
    window_ms = window_seconds * 1000

    try:
        count = await redis.eval(
            LUA_PEEK_WINDOW_SCRIPT,
            1,
            key,
            now_ms,
            window_ms,
        )
        locked = int(count) >= limit
    except Exception:
        _peek_in_memory_locked_out(key, limit, window_seconds, lockout_message)
        return

    if locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=lockout_message,
            headers={
                "Retry-After": str(window_seconds),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
            },
        )


redis_dependency = Depends(get_redis)


class RateLimiter:
    """FastAPI dependency for sliding-window rate limiting per client IP."""

    def __init__(
        self,
        limit: int,
        window_seconds: int,
        custom_message: str | None = None,
    ) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self.custom_message = custom_message

    async def __call__(
        self,
        request: Request,
        redis: Redis | None = redis_dependency,
    ) -> None:
        client_ip = get_client_ip(request)
        key = f"rate_limit:{request.url.path}:{client_ip}"
        await check_rate_limit(
            redis=redis,
            key=key,
            limit=self.limit,
            window_seconds=self.window_seconds,
            custom_message=self.custom_message,
        )
