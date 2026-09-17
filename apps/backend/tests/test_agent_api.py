import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


class AgentApiTests(unittest.TestCase):
    client = TestClient(app)

    def test_health_routes_remain_available(self) -> None:
        self.assertEqual(self.client.get("/health").json(), {"status": "ok"})
        self.assertEqual(self.client.get("/health/").json(), {"status": "ok"})

    def test_groq_requires_an_api_key(self) -> None:
        with (
            patch("app.routers.agent.router.settings.BEDROCK_AGENT_ENABLED", False),
            patch("app.routers.agent.router.settings.GROQ_API_KEY", ""),
        ):
            response = self.client.post(
                "/api/v1/agent/chat/stream",
                json={"message": "Help me prepare a brief"},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": "The Groq agent is not configured."})

    def test_agent_rejects_blank_messages(self) -> None:
        response = self.client.post(
            "/api/v1/agent/chat/stream",
            json={"message": "   "},
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
