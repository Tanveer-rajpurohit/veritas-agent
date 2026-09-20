import json
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session
from strands import Agent

from app.agents.citation_reviewer.prompts import CITATION_REVIEWER_SYSTEM_PROMPT
from app.agents.citation_reviewer.tools import (
    CitationReviewerToolHandlers,
    create_citation_reviewer_tools,
)
from app.agents.main_agent import build_agent_model
from app.schemas.agents.citation_reviewer import CitationReviewerResult


def create_citation_reviewer_agent(
    db: Session,
    document_version_id: UUID,
    model: Any | None = None,
) -> tuple[Agent, CitationReviewerToolHandlers]:
    tools, handlers = create_citation_reviewer_tools(db, document_version_id)
    return (
        Agent(
            model=model if model is not None else build_agent_model(),
            system_prompt=CITATION_REVIEWER_SYSTEM_PROMPT,
            tools=tools,
            callback_handler=None,
        ),
        handlers,
    )


def create_citation_reviewer_formatter(model: Any | None = None) -> Agent:
    """Constructs the tool-free typed-output pass for a Citation Reviewer handoff."""
    return Agent(
        model=model if model is not None else build_agent_model(),
        system_prompt=(
            "Convert the Citation Reviewer handoff into CitationReviewerResult. Preserve all "
            "four dimensions and do not add finding IDs, support, treatment, or certainty. "
            "Return only one JSON object with message, dimensions, suggested_actions, and "
            "run_limitations. The JSON must match this schema: "
            f"{json.dumps(CitationReviewerResult.model_json_schema())}"
        ),
        callback_handler=None,
    )
