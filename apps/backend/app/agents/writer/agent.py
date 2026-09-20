import json
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session
from strands import Agent

from app.agents.model_provider import build_agent_model
from app.agents.writer.prompts import WRITER_SYSTEM_PROMPT
from app.agents.writer.tools import create_writer_source_tools
from app.schemas.agents.writer import WriterResult


def create_writer_agent(
    db: Session,
    matter_id: UUID,
    model: Any | None = None,
    allow_document_writes: bool = True,
) -> Agent:
    """Constructs a tool-enabled Writer scoped to the specified Matter boundary."""
    source_tools = create_writer_source_tools(
        db=db, matter_id=matter_id, allow_document_writes=allow_document_writes
    )
    selected_model = model if model is not None else build_agent_model()

    return Agent(
        model=selected_model,
        system_prompt=WRITER_SYSTEM_PROMPT,
        tools=source_tools,
        callback_handler=None,
    )


def create_writer_formatter(model: Any | None = None) -> Agent:
    """Constructs the tool-free typed-output pass for a Writer handoff."""
    return Agent(
        model=model if model is not None else build_agent_model(),
        system_prompt=(
            "Convert the Writer handoff into WriterResult without adding facts, authorities, "
            "evidence IDs, assumptions, or questions. Every operation must be a complete object "
            "matching the schema; omit an operation that cannot be mapped safely. Preserve "
            "placeholders and uncertainty. Return only one JSON object with operations, "
            "assumptions, and unresolved_questions arrays. The JSON must match this schema: "
            f"{json.dumps(WriterResult.model_json_schema())}"
        ),
        callback_handler=None,
    )
