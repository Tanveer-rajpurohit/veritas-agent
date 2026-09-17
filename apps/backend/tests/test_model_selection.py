import unittest
from unittest.mock import patch

from app.agents.main_agent import _build_boto_session, _build_model
from app.core.config import settings


class ModelSelectionTests(unittest.TestCase):
    def test_groq_uses_openai_compatible_endpoint(self) -> None:
        with (
            patch.object(settings, "BEDROCK_AGENT_ENABLED", False),
            patch.object(settings, "GROQ_API_KEY", "test-key"),
            patch("app.agents.main_agent.OpenAIModel") as model,
        ):
            _build_model()

        _, kwargs = model.call_args
        self.assertEqual(kwargs["model_id"], "openai/gpt-oss-120b")
        self.assertEqual(
            kwargs["client_args"]["base_url"],
            "https://api.groq.com/openai/v1",
        )

    def test_bedrock_uses_configured_region_and_model(self) -> None:
        with (
            patch.object(settings, "BEDROCK_AGENT_ENABLED", True),
            patch("app.agents.main_agent._build_boto_session") as boto_session,
            patch("app.agents.main_agent.BedrockModel") as model,
        ):
            _build_model()

        _, kwargs = model.call_args
        self.assertEqual(kwargs["model_id"], settings.AWS_BEDROCK_MODEL_ID)
        self.assertIs(kwargs["boto_session"], boto_session.return_value)

    def test_bedrock_session_uses_explicit_credentials_when_configured(self) -> None:
        with (
            patch.object(settings, "AWS_ACCESS_KEY_ID", "test-access-key"),
            patch.object(settings, "AWS_SECRET_ACCESS_KEY", "test-secret-key"),
            patch("app.agents.main_agent.boto3.Session") as session,
        ):
            _build_boto_session()

        session.assert_called_once_with(
            region_name=settings.AWS_REGION,
            aws_access_key_id="test-access-key",
            aws_secret_access_key="test-secret-key",
        )

    def test_bedrock_rejects_partial_credentials(self) -> None:
        with (
            patch.object(settings, "AWS_ACCESS_KEY_ID", "test-access-key"),
            patch.object(settings, "AWS_SECRET_ACCESS_KEY", ""),
        ):
            with self.assertRaisesRegex(ValueError, "AWS credentials are required"):
                _build_boto_session()


if __name__ == "__main__":
    unittest.main()
