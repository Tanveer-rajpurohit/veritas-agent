from collections.abc import AsyncIterator

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_health_routes_remain_available(client: TestClient) -> None:
    root_response = client.get("/")

    assert root_response.status_code == 200
    assert root_response.json()["status"] == "ok"
    assert root_response.json()["app"] == settings.APP_NAME
    assert client.get("/health").json() == {"status": "ok"}


def test_groq_requires_an_api_key(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    monkeypatch.setattr("app.routers.agent.router.settings.BEDROCK_AGENT_ENABLED", False)
    monkeypatch.setattr("app.routers.agent.router.settings.GROQ_API_KEY", None)

    response = client.post("/api/v1/agent/chat/stream", json={"message": "Hello"})

    assert response.status_code == 503
    assert response.json() == {"detail": "The agent is not configured."}


def test_agent_rejects_blank_messages(client: TestClient) -> None:
    response = client.post("/api/v1/agent/chat/stream", json={"message": "   "})

    assert response.status_code == 422


def test_chat_endpoint_streams_sse(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    async def fake_stream(message: str) -> AsyncIterator[str]:
        assert message == "Hello"
        yield 'event: text\ndata: {"delta":"Hi"}\n\n'
        yield 'event: done\ndata: {"status":"completed"}\n\n'

    monkeypatch.setattr("app.routers.agent.router.settings.BEDROCK_AGENT_ENABLED", False)
    monkeypatch.setattr("app.routers.agent.router.settings.GROQ_API_KEY", "test-key")
    monkeypatch.setattr("app.routers.agent.router.stream_main_agent", fake_stream)

    response = client.post("/api/v1/agent/chat/stream", json={"message": "Hello"})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.headers["cache-control"] == "no-cache"
    assert 'event: text\ndata: {"delta":"Hi"}' in response.text
    assert 'event: done\ndata: {"status":"completed"}' in response.text
