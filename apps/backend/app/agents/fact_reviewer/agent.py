import json
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session
from strands import Agent

from app.agents.fact_reviewer.prompts import FACT_REVIEWER_SYSTEM_PROMPT
from app.agents.fact_reviewer.tools import FactReviewerToolHandlers, create_fact_reviewer_tools
from app.agents.model_provider import build_agent_model
from app.schemas.agents.fact_reviewer import FactClaim, FactReviewerResult


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
    selected_model = model if model is not None else build_agent_model()

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
        model=model if model is not None else build_agent_model(),
        system_prompt=(
            "Convert the Fact Reviewer handoff into FactReviewerResult. Do not add claims, "
            "findings, evidence IDs, corrections, or certainty absent from the handoff. Return "
            "only one JSON object with findings, unchecked_claim_ids, run_limitations, and "
            "correction_candidates arrays. The JSON must match this schema: "
            f"{json.dumps(FactReviewerResult.model_json_schema())}"
        ),
        callback_handler=None,
    )
