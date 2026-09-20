from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.agents.writer import (
    WRITER_SYSTEM_PROMPT,
    create_writer_agent,
    create_writer_formatter,
)
from app.schemas.agents.writer import DocumentOperation, WriterResult


def test_writer_agent_initialization() -> None:
    matter_id = uuid4()
    mock_db = MagicMock()
    mock_model = MagicMock()

    agent = create_writer_agent(db=mock_db, matter_id=matter_id, model=mock_model)

    assert agent.model == mock_model
    assert agent.system_prompt == WRITER_SYSTEM_PROMPT
    assert agent._default_structured_output_model is None

    assert agent.tool_names == [
        "search_sources",
        "create_evidence_span",
        "get_evidence_spans",
        "get_document_version",
        "create_draft",
        "propose_document_ops",
        "list_draft_templates",
        "get_draft_template",
        "search_statutes",
        "lookup_statute",
        "search_cases",
        "fetch_case",
    ]

    formatter = create_writer_formatter(model=mock_model)
    assert formatter._default_structured_output_model is None
    assert formatter.tool_names == []


def test_document_operation_validation() -> None:
    span_id = uuid4()
    op = DocumentOperation(
        type="insert_paragraph",
        position="facts.after",
        text="The corporate debtor defaulted on 15 March 2021.",
        evidence_span_ids=[span_id],
    )

    assert op.type == "insert_paragraph"
    assert op.position == "facts.after"
    assert op.evidence_span_ids == [span_id]

    with pytest.raises(ValidationError):
        DocumentOperation(
            type="insert_paragraph",
            position="   ",
            text="text",
        )


def test_writer_result_empty_defaults() -> None:
    result = WriterResult()
    assert result.operations == []
    assert result.assumptions == []
    assert result.unresolved_questions == []


def test_writer_system_prompt_contains_crucial_invariants() -> None:
    assert "Matter facts" in WRITER_SYSTEM_PROMPT
    assert "stable evidence" in WRITER_SYSTEM_PROMPT
    assert "untrusted quoted data" in WRITER_SYSTEM_PROMPT
    assert "Never narrate tool calls" in WRITER_SYSTEM_PROMPT
    assert "plain-text handoff" in WRITER_SYSTEM_PROMPT
    assert "schema tool" in WRITER_SYSTEM_PROMPT
    assert "Do not rely on model memory" in WRITER_SYSTEM_PROMPT
