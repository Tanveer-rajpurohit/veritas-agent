from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.agents.writer import WriterSourceToolHandlers, create_writer_source_tools
from app.services.sources import retrieval as retrieval_module


def test_writer_tools_do_not_expose_matter_id_to_model() -> None:
    tools = create_writer_source_tools(MagicMock(), uuid4())

    assert [tool.tool_name for tool in tools] == [
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
    for writer_tool in tools:
        properties = writer_tool.tool_spec["inputSchema"]["json"]["properties"]
        assert "matter_id" not in properties


def test_search_handler_always_uses_scoped_matter(monkeypatch) -> None:
    matter_id = uuid4()
    passage = SimpleNamespace(model_dump=lambda **_kwargs: {"passage_id": "passage-1"})
    search = MagicMock(return_value=[passage])
    monkeypatch.setattr(retrieval_module.retrieval_service, "search_sources", search)

    result = WriterSourceToolHandlers(MagicMock(), matter_id).search_sources("payment default")

    assert result["matter_id"] == str(matter_id)
    search.assert_called_once()
    assert search.call_args.kwargs["matter_id"] == matter_id


def test_evidence_handler_rejects_invalid_identifier() -> None:
    handlers = WriterSourceToolHandlers(MagicMock(), uuid4())

    with pytest.raises(ValueError):
        handlers.create_evidence_span("not-a-uuid")
