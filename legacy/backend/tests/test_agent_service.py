import asyncio
import json
from typing import Any

import pytest

from app.services.agents import stream_main_agent


class FakeAgent:
    async def stream_async(self, message: str):
        assert message == "Review this claim"
        yield {"data": "Evidence "}
        yield {"current_tool_use": {"name": "search_evidence"}}
        yield {"data": "checked."}
        yield {"result": object()}


class FailingAgent:
    async def stream_async(self, message: str):
        yield {"data": ""}
        raise RuntimeError("secret provider detail")


def parse_sse_event(chunk: str) -> tuple[str, dict[str, Any]]:
    lines = chunk.strip().splitlines()
    event = lines[0].removeprefix("event: ")
    payload = json.loads(lines[1].removeprefix("data: "))
    return event, payload


async def collect_events(message: str) -> list[tuple[str, dict[str, Any]]]:
    return [parse_sse_event(chunk) async for chunk in stream_main_agent(message)]


def test_stream_emits_lifecycle_text_tool_and_completion(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.services.agents.agent_service.create_main_agent", lambda: FakeAgent())
    monkeypatch.setattr("app.services.agents.agent_service.settings.BEDROCK_AGENT_ENABLED", False)
    monkeypatch.setattr("app.services.agents.agent_service.settings.GROQ_MODEL", "test-model")

    events = asyncio.run(collect_events("Review this claim"))

    assert events == [
        (
            "start",
            {"agent": "main", "provider": "groq", "model": "test-model"},
        ),
        ("text", {"delta": "Evidence "}),
        ("tool", {"name": "search_evidence"}),
        ("text", {"delta": "checked."}),
        ("done", {"status": "completed"}),
    ]


def test_stream_returns_a_safe_error_without_provider_details(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.services.agents.agent_service.create_main_agent", lambda: FailingAgent()
    )

    events = asyncio.run(collect_events("Review this claim"))

    assert events[-1] == (
        "error",
        {
            "code": "agent_unavailable",
            "message": "The agent is temporarily unavailable. Please try again.",
        },
    )
    assert "secret provider detail" not in json.dumps(events)
