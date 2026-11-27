from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi import HTTPException, Request

from app.core.rate_limiter import (
    RateLimiter,
    check_is_locked_out,
    check_rate_limit,
    get_client_ip,
)


def _build_mock_request(
    headers: dict[str, str] | None = None,
    client_host: str = "127.0.0.1",
    path: str = "/api/v1/test",
) -> Request:
    header_list = [
        (k.lower().encode("latin-1"), v.encode("latin-1")) for k, v in (headers or {}).items()
    ]
    scope = {
        "type": "http",
        "method": "GET",
        "path": path,
        "headers": header_list,
        "client": (client_host, 12345),
    }
    return Request(scope)


def test_get_client_ip_headers() -> None:
    req_forwarded = _build_mock_request(headers={"x-forwarded-for": "203.0.113.195, 70.41.3.18"})
    assert get_client_ip(req_forwarded) == "203.0.113.195"

    req_real_ip = _build_mock_request(headers={"x-real-ip": "198.51.100.22"})
    assert get_client_ip(req_real_ip) == "198.51.100.22"

    req_fallback = _build_mock_request(client_host="10.0.0.5")
    assert get_client_ip(req_fallback) == "10.0.0.5"


@pytest.mark.anyio
async def test_in_memory_rate_limit_enforcement() -> None:
    unique_key = f"test:in_memory:{uuid4()}"

    await check_rate_limit(redis=None, key=unique_key, limit=2, window_seconds=60)
    await check_rate_limit(redis=None, key=unique_key, limit=2, window_seconds=60)

    with pytest.raises(HTTPException) as exc_info:
        await check_rate_limit(redis=None, key=unique_key, limit=2, window_seconds=60)

    assert exc_info.value.status_code == 429
    assert exc_info.value.headers["X-RateLimit-Limit"] == "2"
    assert exc_info.value.headers["X-RateLimit-Remaining"] == "0"
    assert exc_info.value.headers["Retry-After"] == "60"


@pytest.mark.anyio
async def test_redis_sliding_window_allowed_and_blocked() -> None:
    mock_redis = AsyncMock()
    mock_redis.eval.return_value = [1, 4]

    key = f"test:redis:{uuid4()}"
    await check_rate_limit(redis=mock_redis, key=key, limit=5, window_seconds=60)
    assert mock_redis.eval.called

    mock_redis.eval.return_value = [0, 0]
    with pytest.raises(HTTPException) as exc_info:
        await check_rate_limit(redis=mock_redis, key=key, limit=5, window_seconds=60)

    assert exc_info.value.status_code == 429
    assert exc_info.value.headers["Retry-After"] == "60"


@pytest.mark.anyio
async def test_check_is_locked_out_redis() -> None:
    mock_redis = AsyncMock()
    mock_redis.eval.return_value = 5

    key = f"test:lockout:{uuid4()}"
    with pytest.raises(HTTPException) as exc_info:
        await check_is_locked_out(
            redis=mock_redis,
            key=key,
            limit=5,
            window_seconds=300,
            lockout_message="Account temporarily locked",
        )

    assert exc_info.value.status_code == 429
    assert exc_info.value.detail == "Account temporarily locked"

    mock_redis.eval.return_value = 3
    await check_is_locked_out(
        redis=mock_redis,
        key=key,
        limit=5,
        window_seconds=300,
        lockout_message="Account temporarily locked",
    )


@pytest.mark.anyio
async def test_rate_limiter_dependency_call() -> None:
    limiter = RateLimiter(limit=10, window_seconds=60)
    request = _build_mock_request(client_host="192.168.1.100")
    await limiter(request=request, redis=None)
