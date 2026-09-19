from unittest.mock import MagicMock, patch

import pytest

from app.agents.main_agent import _build_boto_session, build_agent_model
from app.core.config import settings


def test_groq_model_uses_the_configured_openai_compatible_endpoint(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "BEDROCK_AGENT_ENABLED", False)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(settings, "GROQ_BASE_URL", "https://groq.test/v1")
    monkeypatch.setattr(settings, "GROQ_MODEL", "test-groq-model")
    monkeypatch.setattr(settings, "AGENT_MAX_TOKENS", 512)
    monkeypatch.setattr(settings, "AGENT_TEMPERATURE", 0.2)

    with patch("app.agents.main_agent.OpenAIModel") as model_class:
        build_agent_model()

    model_class.assert_called_once_with(
        client_args={
            "api_key": "test-key",
            "base_url": "https://groq.test/v1",
        },
        model_id="test-groq-model",
        params={"max_tokens": 512, "temperature": 0.2},
    )


def test_bedrock_model_uses_the_explicit_boto_session(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "BEDROCK_AGENT_ENABLED", True)
    monkeypatch.setattr(settings, "AWS_BEDROCK_MODEL_ID", "test-bedrock-model")
    monkeypatch.setattr(settings, "AGENT_MAX_TOKENS", 512)
    monkeypatch.setattr(settings, "AGENT_TEMPERATURE", 0.2)
    boto_session = MagicMock()

    with (
        patch("app.agents.main_agent._build_boto_session", return_value=boto_session),
        patch("app.agents.main_agent.BedrockModel") as model_class,
    ):
        build_agent_model()

    model_class.assert_called_once_with(
        boto_session=boto_session,
        model_id="test-bedrock-model",
        max_tokens=512,
        temperature=0.2,
    )


def test_boto_session_receives_explicit_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "AWS_ACCESS_KEY_ID", "access-key")
    monkeypatch.setattr(settings, "AWS_SECRET_ACCESS_KEY", "secret-key")
    monkeypatch.setattr(settings, "AWS_REGION", "test-region-1")

    with patch("app.agents.main_agent.boto3.Session") as session_class:
        _build_boto_session()

    session_class.assert_called_once_with(
        region_name="test-region-1",
        aws_access_key_id="access-key",
        aws_secret_access_key="secret-key",
    )


def test_boto_session_rejects_partial_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "AWS_ACCESS_KEY_ID", "access-key")
    monkeypatch.setattr(settings, "AWS_SECRET_ACCESS_KEY", None)

    with pytest.raises(ValueError, match="AWS credentials are required"):
        _build_boto_session()
