import json
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


def _build_default_model() -> Any:
    """Builds primary model provider according to application settings."""
    if settings.BEDROCK_AGENT_ENABLED:
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
        callback_handler=None,
    )
    return agent, handlers


def create_fact_reviewer_formatter(model: Any | None = None) -> Agent:
    """Constructs the tool-free typed-output pass for a Fact Reviewer handoff."""
    return Agent(
        model=model if model is not None else _build_default_model(),
        system_prompt=(
            "Convert the Fact Reviewer handoff into FactReviewerResult. Do not add claims, "
            "findings, evidence IDs, corrections, or certainty absent from the handoff. Return "
            "only one JSON object with findings, unchecked_claim_ids, run_limitations, and "
            "correction_candidates arrays. The JSON must match this schema: "
            f"{json.dumps(FactReviewerResult.model_json_schema())}"
        ),
        callback_handler=None,
    )
