import hashlib
from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.models.sources.chunk import SourceChunk
from app.models.sources.evidence import EvidenceSpan
from app.models.sources.page import SourcePage
from app.models.sources.source import Source, SourceVersion
from app.services.legal_sources.materializer import LegalSourceMaterializer


def test_materialize_statute_persists_provenance_chain() -> None:
    materializer = LegalSourceMaterializer()
    mock_db = MagicMock()

    # Configure query mocks for initial check (no existing source or version)
    mock_db.query.return_value.filter.return_value.first.return_value = None

    text = "A financial creditor may file an application for initiating corporate insolvency resolution process."
    title = "Insolvency and Bankruptcy Code, 2016 - Section 7"
    expected_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

    span, source, version = materializer.materialize_legal_text(
        db=mock_db,
        title=title,
        text=text,
        source_type="statute",
        official_url="https://indiacode.nic.in/handle/123456789/2154",
        authority_level="curated_primary",
        heading_path=["Section 7"],
    )

    assert source.matter_id is None
    assert source.source_type == "statute"
    assert source.canonical_title == title
    assert source.authority_level == "curated_primary"
    assert source.official_url == "https://indiacode.nic.in/handle/123456789/2154"

    assert version.file_sha256 == expected_hash
    assert version.mime_type == "text/plain"
    assert version.object_key == f"external://statute/{expected_hash}"

    assert span.quoted_text == text
    assert span.quoted_text_sha256 == expected_hash
    assert span.created_by == "legal_source_materializer"

    mock_db.commit.assert_called_once()


def test_materialize_judgment_sets_judgment_source_type() -> None:
    materializer = LegalSourceMaterializer()
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None

    text = "The Adjudicating Authority has only to see whether a default has occurred."
    title = "Innoventive Industries Ltd. v. ICICI Bank & Anr."

    span, source, version = materializer.materialize_legal_text(
        db=mock_db,
        title=title,
        text=text,
        source_type="judgment",
        official_url="https://main.sci.gov.in/judgment/12345",
    )

    assert source.matter_id is None
    assert source.source_type == "judgment"
    assert source.canonical_title == title
    assert span.quoted_text == text
    mock_db.commit.assert_called_once()


def test_materialize_empty_text_raises_validation_error() -> None:
    materializer = LegalSourceMaterializer()
    mock_db = MagicMock()

    with pytest.raises(ValueError, match="Cannot materialize empty legal text"):
        materializer.materialize_legal_text(
            db=mock_db,
            title="Empty Statute",
            text="   ",
            source_type="statute",
        )


def test_long_judgment_creates_bounded_evidence_selected_by_query() -> None:
    materializer = LegalSourceMaterializer()
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None
    text = ("background facts " * 400) + "\n\nThe decisive default test applies here."

    span, _, _ = materializer.materialize_legal_text(
        db=mock_db,
        title="A v. B",
        text=text,
        source_type="judgment",
        evidence_query="decisive default test",
    )

    assert len(span.quoted_text) <= materializer.MAX_CHUNK_CHARS
    assert "decisive default test" in span.quoted_text


def test_materialize_deduplication_reuses_existing_span(monkeypatch) -> None:
    materializer = LegalSourceMaterializer()
    mock_db = MagicMock()

    text = "Section text to deduplicate."
    content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
    source_id = uuid4()
    version_id = uuid4()
    chunk_id = uuid4()
    span_id = uuid4()

    existing_version = SourceVersion(
        id=version_id,
        source_id=source_id,
        version_number=1,
        file_sha256=content_hash,
        object_key=f"external://statute/{content_hash}",
        mime_type="text/plain",
    )
    existing_source = Source(
        id=source_id,
        matter_id=None,
        source_type="statute",
        canonical_title="Existing Title",
    )
    existing_chunk = SourceChunk(
        id=chunk_id,
        source_version_id=version_id,
        text=text,
    )
    existing_span = EvidenceSpan(
        id=span_id,
        source_version_id=version_id,
        chunk_id=chunk_id,
        quoted_text=text,
        quoted_text_sha256=content_hash,
    )

    # Return existing version for SourceVersion query, chunk for SourceChunk query
    def mock_query(model):
        q = MagicMock()
        if model == SourceVersion:
            q.filter.return_value.first.return_value = existing_version
        elif model == SourceChunk:
            q.filter.return_value.first.return_value = existing_chunk
        elif model == SourcePage:
            q.filter.return_value.first.return_value = None
        else:
            q.filter.return_value.first.return_value = None
        return q

    mock_db.query.side_effect = mock_query

    monkeypatch.setattr(
        "app.services.legal_sources.materializer.source_repository.get_source_by_id",
        lambda db, source_id: existing_source,
    )
    monkeypatch.setattr(
        "app.services.legal_sources.materializer.source_repository.get_evidence_span_for_chunk",
        lambda db, chunk_id: existing_span,
    )

    span, source, version = materializer.materialize_legal_text(
        db=mock_db,
        title="Existing Title",
        text=text,
        source_type="statute",
    )

    assert span.id == span_id
    assert source.id == source_id
    assert version.id == version_id
    # db.add shouldn't be called when reusing existing span
    mock_db.add.assert_not_called()


def test_materialize_rollback_on_database_error() -> None:
    materializer = LegalSourceMaterializer()
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.first.return_value = None
    mock_db.commit.side_effect = RuntimeError("Database deadlock")

    with pytest.raises(RuntimeError, match="Database deadlock"):
        materializer.materialize_legal_text(
            db=mock_db,
            title="Rollback Test",
            text="Text causing rollback.",
            source_type="statute",
        )

    mock_db.rollback.assert_called_once()
