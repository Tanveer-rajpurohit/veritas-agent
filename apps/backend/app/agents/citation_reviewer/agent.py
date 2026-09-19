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
            structured_output_model=CitationReviewerResult,
            callback_handler=None,
        ),
        handlers,
    )
