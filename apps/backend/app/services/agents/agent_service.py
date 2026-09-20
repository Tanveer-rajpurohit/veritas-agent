import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from app.agents.main_agent import create_main_agent
from app.agents.model_provider import build_fallback_agent_model
from app.core.config import settings

logger = logging.getLogger(__name__)


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n"


async def _stream_once(message: str, model: Any | None) -> AsyncIterator[str]:
    agent = create_main_agent(model=model)
    async for event in agent.stream_async(message):
        if data := event.get("data"):
            yield _sse("text", {"delta": data})

        tool = event.get("current_tool_use")
        if tool and tool.get("name"):
            yield _sse("tool", {"name": tool["name"]})

        if "result" in event:
            yield _sse("done", {"status": "completed"})


async def stream_main_agent(message: str) -> AsyncIterator[str]:
    yield _sse(
        "start",
        {
            "agent": "main",
            "provider": settings.active_agent_provider,
            "model": settings.active_agent_model,
        },
    )

    emitted = False
    try:
        async for chunk in _stream_once(message, None):
            emitted = True
            yield chunk
        return
    except Exception:
        logger.exception("Main Agent stream failed on the primary provider")

    if emitted:
        yield _sse(
            "error",
            {
                "code": "agent_unavailable",
                "message": "The response was cut short. Please try again.",
            },
        )
        return

    fallback = build_fallback_agent_model()
    if fallback is not None:
        try:
            async for chunk in _stream_once(message, fallback):
                yield chunk
            return
        except Exception:
            logger.exception("Main Agent stream failed on the fallback provider")

    yield _sse(
        "error",
        {
            "code": "agent_unavailable",
            "message": "The agent is temporarily unavailable. Please try again.",
        },
    )
