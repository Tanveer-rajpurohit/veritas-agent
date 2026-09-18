from typing import Any
from uuid import UUID

import boto3
from sqlalchemy.orm import Session
from strands import Agent
from strands.models import BedrockModel
from strands.models.openai import OpenAIModel

from app.agents.writer.prompts import WRITER_SYSTEM_PROMPT
from app.agents.writer.tools import create_writer_source_tools
from app.core.config import settings
from app.schemas.agents.writer import WriterResult


def _build_boto_session() -> boto3.Session:
    """Constructs authenticated boto3 session for Bedrock inference."""
    if not settings.AWS_ACCESS_KEY_ID or not settings.AWS_SECRET_ACCESS_KEY:
        raise ValueError("AWS credentials are required when the Bedrock agent is enabled")

    return boto3.Session(
        region_name=settings.AWS_REGION,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    )


def _build_default_model() -> Any:
    """Builds the primary model provider according to application settings."""
    if settings.BEDROCK_AGENT_ENABLED:
        return BedrockModel(
            model_id=settings.AWS_BEDROCK_MODEL_ID,
            boto_session=_build_boto_session(),
            max_tokens=settings.AGENT_MAX_TOKENS,
            temperature=settings.AGENT_TEMPERATURE,
        )

    return OpenAIModel(
        client_args={
            "api_key": settings.GROQ_API_KEY,
            "base_url": settings.GROQ_BASE_URL,
        },
        model_id=settings.GROQ_MODEL,
        params={
            "max_tokens": settings.AGENT_MAX_TOKENS,
            "temperature": settings.AGENT_TEMPERATURE,
        },
    )


def create_writer_agent(
    db: Session,
    matter_id: UUID,
    model: Any | None = None,
    allow_document_writes: bool = True,
) -> Agent:
    """
    Constructs a scoped Strands Writer Agent restricted to the specified Matter boundary.
    Enforces structured output adhering to WriterResult schema.
    """
    source_tools = create_writer_source_tools(
        db=db, matter_id=matter_id, allow_document_writes=allow_document_writes
    )
    selected_model = model if model is not None else _build_default_model()

    return Agent(
        model=selected_model,
        system_prompt=WRITER_SYSTEM_PROMPT,
        tools=source_tools,
        structured_output_model=WriterResult,
        callback_handler=None,
    )
