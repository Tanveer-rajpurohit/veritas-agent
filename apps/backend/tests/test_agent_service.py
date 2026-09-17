import json
import unittest
from unittest.mock import patch

from app.services.agent_service import stream_main_agent


def parse_sse(payload: str) -> tuple[str, dict[str, object]]:
    lines = payload.strip().splitlines()
    return lines[0].removeprefix("event: "), json.loads(lines[1].removeprefix("data: "))


class FakeAgent:
    async def stream_async(self, message: str):
        yield {"data": f"Received: {message}"}
        yield {"current_tool_use": {"name": "future_tool"}}
        yield {"result": object()}


class FailingAgent:
    async def stream_async(self, message: str):
        if False:
            yield {"data": message}
        raise RuntimeError("secret provider detail")


class AgentServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_stream_forwards_only_public_events(self) -> None:
        with patch("app.services.agent_service.create_main_agent", return_value=FakeAgent()):
            events = [event async for event in stream_main_agent("hello")]

        parsed = [parse_sse(event) for event in events]
        self.assertEqual([event for event, _ in parsed], ["start", "text", "tool", "done"])
        self.assertEqual(parsed[1][1], {"delta": "Received: hello"})
        self.assertEqual(parsed[2][1], {"name": "future_tool"})

    async def test_stream_hides_provider_errors(self) -> None:
        with patch("app.services.agent_service.create_main_agent", return_value=FailingAgent()):
            events = [event async for event in stream_main_agent("hello")]

        event, data = parse_sse(events[-1])
        self.assertEqual(event, "error")
        self.assertEqual(data["code"], "agent_unavailable")
        self.assertNotIn("secret provider detail", events[-1])


if __name__ == "__main__":
    unittest.main()
