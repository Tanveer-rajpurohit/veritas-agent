from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.agents.citation_reviewer import (
    CITATION_REVIEWER_SYSTEM_PROMPT,
    create_citation_reviewer_agent,
    create_citation_reviewer_tools,
)
from app.agents.citation_reviewer.tools import CitationReviewerToolHandlers
from app.schemas.agents.citation_reviewer import CitationReviewerResult


def test_citation_reviewer_agent_has_bounded_tools_and_typed_output() -> None:
    agent, _handlers = create_citation_reviewer_agent(
        db=MagicMock(), document_version_id=uuid4(), model=MagicMock()
    )

    assert agent.system_prompt == CITATION_REVIEWER_SYSTEM_PROMPT
    assert agent._default_structured_output_model == CitationReviewerResult
    assert agent.tool_names == [
        "get_citation_findings",
        "lookup_statute",
        "search_cases",
        "fetch_case",
    ]


def test_citation_tools_reject_other_document_version() -> None:
    handlers = CitationReviewerToolHandlers(MagicMock(), uuid4())

    with pytest.raises(ValueError, match="not the active review target"):
        handlers.get_citation_findings(str(uuid4()))


def test_fetch_case_requires_candidate_from_same_run() -> None:
    handlers = CitationReviewerToolHandlers(MagicMock(), uuid4())

    with pytest.raises(ValueError, match="selected from search results"):
        handlers.fetch_case("ik_123", None)


def test_citation_tool_names() -> None:
    tools, _handlers = create_citation_reviewer_tools(MagicMock(), uuid4())
    assert [item.tool_spec["name"] for item in tools] == [
        "get_citation_findings",
        "lookup_statute",
        "search_cases",
        "fetch_case",
    ]


def test_citation_prompt_keeps_dimensions_independent() -> None:
    for dimension in ("identity", "quotation", "support", "treatment"):
        assert dimension in CITATION_REVIEWER_SYSTEM_PROMPT
    assert "Never use model memory" in CITATION_REVIEWER_SYSTEM_PROMPT
    assert "failed or incomplete lookup is unresolved" in CITATION_REVIEWER_SYSTEM_PROMPT
