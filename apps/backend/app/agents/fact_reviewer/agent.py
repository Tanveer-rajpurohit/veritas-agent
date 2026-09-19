from typing import Any
from uuid import UUID

import boto3
from sqlalchemy.orm import Session
from strands import Agent
from strands.models import BedrockModel
from strands.models.openai import OpenAIModel

from app.agents.fact_reviewer.prompts import FACT_REVIEWER_SYSTEM_PROMPT
from app.agents.fact_reviewer.tools import FactReviewerToolHandlers, create_fact_reviewer_tools
from app.core.config import settings
from app.schemas.agents.fact_reviewer import FactClaim, FactReviewerResult


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
    """Builds primary model provider according to application settings."""
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


def create_fact_reviewer_agent(
    db: Session,
    matter_id: UUID,
    document_version_id: UUID,
    claims: list[FactClaim] | None = None,
    model: Any | None = None,
    allow_fixes: bool = False,
) -> tuple[Agent, FactReviewerToolHandlers]:
    """Constructs a scoped Strands Fact Reviewer Agent restricted to the specified Matter boundary."""
    tools, handlers = create_fact_reviewer_tools(
        db=db,
        matter_id=matter_id,
        document_version_id=document_version_id,
        claims=claims,
        allow_fixes=allow_fixes,
    )
    selected_model = model if model is not None else _build_default_model()

    agent = Agent(
        model=selected_model,
        system_prompt=FACT_REVIEWER_SYSTEM_PROMPT,
        tools=tools,
        structured_output_model=FactReviewerResult,
        callback_handler=None,
    )
    return agent, handlers
