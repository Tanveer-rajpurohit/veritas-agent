from typing import Any

import boto3
from strands import Agent
from strands.models import BedrockModel
from strands.models.openai import OpenAIModel

from app.agents.prompts import MAIN_AGENT_SYSTEM_PROMPT
from app.core.config import settings


def _build_boto_session() -> boto3.Session:
    secret_key = (
        settings.AWS_SECRET_ACCESS_KEY
        or settings.AWS_SECRET_KEY
        or settings.AWS_BEDROCK_SECRET_KEY
        or settings.BEDROCK_SECRET_KEY
    )
    if not settings.AWS_ACCESS_KEY_ID or not secret_key:
        raise ValueError("AWS credentials are required when the Bedrock agent is enabled")

    session_kwargs: dict[str, Any] = {
        "region_name": settings.AWS_REGION,
        "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": secret_key,
    }
    if settings.AWS_SESSION_TOKEN:
        session_kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN

    return boto3.Session(**session_kwargs)


def build_bedrock_model() -> Any:
    kwargs: dict[str, Any] = {
        "model_id": settings.AWS_BEDROCK_MODEL_ID,
        "max_tokens": settings.AGENT_MAX_TOKENS,
        "temperature": settings.AGENT_TEMPERATURE,
    }
    if settings.AWS_BEDROCK_API_KEY:
        kwargs["api_key"] = settings.AWS_BEDROCK_API_KEY
        kwargs["region_name"] = settings.AWS_REGION
    else:
        kwargs["boto_session"] = _build_boto_session()
    return BedrockModel(**kwargs)


def build_groq_model() -> Any:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is required to build the Groq model")
    return OpenAIModel(
        client_args={
            "api_key": settings.GROQ_API_KEY,
            "base_url": settings.GROQ_BASE_URL,
        },
        model_id=settings.GROQ_MODEL,
        params={
            "max_tokens": settings.AGENT_MAX_TOKENS,
            "temperature": settings.AGENT_TEMPERATURE,
            "extra_body": {"include_reasoning": False},
        },
    )


def build_agent_model() -> Any:
    if settings.BEDROCK_AGENT_ENABLED:
        return build_bedrock_model()
    return build_groq_model()


def create_main_agent(model: Any | None = None) -> Agent:
    return Agent(
        model=model if model is not None else build_agent_model(),
        system_prompt=MAIN_AGENT_SYSTEM_PROMPT,
        callback_handler=None,
    )
