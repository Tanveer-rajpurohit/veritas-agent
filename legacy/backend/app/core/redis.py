import logging
from collections.abc import AsyncGenerator

from redis.asyncio import Redis, from_url

from app.core.config import settings

logger = logging.getLogger(__name__)

redis_client: Redis | None = None


async def init_redis_pool() -> Redis | None:
    global redis_client
    if redis_client is None:
        kwargs: dict[str, object] = {
            "encoding": "utf-8",
            "decode_responses": True,
            "max_connections": 20,
            "socket_connect_timeout": 2.0,
            "socket_timeout": 2.0,
        }
        if settings.REDIS_URL.startswith("rediss://"):
            kwargs["ssl_cert_reqs"] = "none"
        try:
            client = from_url(settings.REDIS_URL, **kwargs)
            await client.ping()
            redis_client = client
            logger.info("Connected to Redis at %s", settings.REDIS_URL)
        except Exception as exc:
            logger.warning(
                "Redis connection could not be established (%s). Fallback mode enabled.",
                type(exc).__name__,
            )
            redis_client = None
    return redis_client


async def close_redis_pool() -> None:
    global redis_client
    if redis_client is not None:
        try:
            await redis_client.aclose()
        except AttributeError:
            await redis_client.close()
        except Exception as exc:
            logger.warning("Error closing Redis client: %s", exc)
        redis_client = None


async def get_redis() -> AsyncGenerator[Redis | None, None]:
    kwargs: dict[str, object] = {
        "encoding": "utf-8",
        "decode_responses": True,
        "max_connections": 10,
        "socket_connect_timeout": 2.0,
        "socket_timeout": 2.0,
    }
    if settings.REDIS_URL.startswith("rediss://"):
        kwargs["ssl_cert_reqs"] = "none"
    try:
        client = from_url(settings.REDIS_URL, **kwargs)
        await client.ping()
    except Exception as exc:
        logger.warning("Redis request unavailable (%s)", type(exc).__name__)
        yield None
        return
    try:
        yield client
    finally:
        try:
            await client.aclose()
        except Exception as exc:
            logger.warning("Redis request cleanup failed (%s)", type(exc).__name__)
