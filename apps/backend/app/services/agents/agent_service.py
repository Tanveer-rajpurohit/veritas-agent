import json
import logging
from collections.abc import AsyncIterator
from typing import Any

from app.agents.main_agent import create_main_agent
from app.core.config import settings

logger = logging.getLogger(__name__)


def _sse(event: str, data: dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n"


async def stream_main_agent(message: str) -> AsyncIterator[str]:
    yield _sse(
        "start",
        {
            "agent": "main",
            "provider": settings.active_agent_provider,
            "model": settings.active_agent_model,
        },
    )

    try:
        agent = create_main_agent()
        async for event in agent.stream_async(message):
            if data := event.get("data"):
                yield _sse("text", {"delta": data})

            tool = event.get("current_tool_use")
            if tool and tool.get("name"):
                yield _sse("tool", {"name": tool["name"]})

            if "result" in event:
                yield _sse("done", {"status": "completed"})
    except Exception:
        logger.exception("Main Agent stream failed")
        yield _sse(
            "error",
            {
                "code": "agent_unavailable",
                "message": "The agent is temporarily unavailable. Please try again.",
            },
        )
