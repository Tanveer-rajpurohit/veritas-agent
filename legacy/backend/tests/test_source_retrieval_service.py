import hashlib
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.models.sources import EvidenceSpan
from app.schemas.sources import CreateEvidenceSpanRequest
from app.services.sources import retrieval as retrieval_module


def test_create_evidence_span_derives_quote_from_stored_page(monkeypatch) -> None:
    matter_id = uuid4()
    chunk_id = uuid4()
    page_id = uuid4()
    version_id = uuid4()
    page = SimpleNamespace(id=page_id, text="Before verified debt amount after")
    chunk = SimpleNamespace(
        id=chunk_id,
        start_offset=7,
        end_offset=27,
    )
    version = SimpleNamespace(id=version_id)
    source = SimpleNamespace(matter_id=matter_id)
    db = MagicMock()

    monkeypatch.setattr(
        retrieval_module.source_repository,
        "get_chunk_context",
        lambda **_kwargs: (chunk, page, version, source),
    )
    monkeypatch.setattr(
        retrieval_module.source_repository,
        "get_evidence_span_for_chunk",
        lambda *_args, **_kwargs: None,
    )

    def persist(*, db, span: EvidenceSpan) -> EvidenceSpan:
        span.id = uuid4()
        return span

    monkeypatch.setattr(
        retrieval_module.source_repository,
        "create_evidence_span",
        persist,
    )

    result = retrieval_module.retrieval_service.create_evidence_span(
        db,
        CreateEvidenceSpanRequest(matter_id=matter_id, passage_id=chunk_id),
    )

    assert result.quoted_text == "verified debt amount"
    assert (
        result.quoted_text_sha256 == hashlib.sha256(result.quoted_text.encode("utf-8")).hexdigest()
    )
    assert result.source_version_id == version_id
    assert result.page_id == page_id
    assert result.chunk_id == chunk_id
    db.commit.assert_called_once()


def test_create_evidence_span_rejects_cross_matter_passage(monkeypatch) -> None:
    monkeypatch.setattr(
        retrieval_module.source_repository,
        "get_chunk_context",
        lambda **_kwargs: None,
    )

    with pytest.raises(ValueError, match="not authorized"):
        retrieval_module.retrieval_service.create_evidence_span(
            MagicMock(),
            CreateEvidenceSpanRequest(matter_id=uuid4(), passage_id=uuid4()),
        )


def test_get_evidence_spans_fails_when_any_requested_span_is_unavailable(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        retrieval_module.source_repository,
        "get_evidence_spans",
        lambda **_kwargs: [],
    )

    with pytest.raises(ValueError, match="not found or authorized"):
        retrieval_module.retrieval_service.get_evidence_spans(
            MagicMock(),
            matter_id=uuid4(),
            span_ids=[uuid4()],
        )
