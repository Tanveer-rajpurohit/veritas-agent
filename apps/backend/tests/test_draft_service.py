from unittest.mock import MagicMock
from uuid import uuid4

import pytest

from app.models.drafts.document_version import DocumentVersion
from app.models.drafts.draft import Draft
from app.schemas.agents.writer import DocumentOperation
from app.services.drafts.draft_service import DraftService


def test_get_document_version_unauthorized_raises() -> None:
    service = DraftService()
    mock_db = MagicMock()
    version_id = uuid4()
    matter_id = uuid4()

    mock_db.query.return_value.join.return_value.filter.return_value.filter.return_value.first.return_value = None

    with pytest.raises(ValueError, match="not found or not authorized"):
        service.get_document_version(db=mock_db, version_id=version_id, matter_id=matter_id)


def test_propose_document_ops_stale_version_raises(monkeypatch) -> None:
    service = DraftService()
    mock_db = MagicMock()
    matter_id = uuid4()
    draft_id = uuid4()
    current_version_id = uuid4()
    stale_base_version_id = uuid4()

    mock_draft = Draft(id=draft_id, matter_id=matter_id, title="Test Draft")
    mock_latest_version = DocumentVersion(
        id=current_version_id,
        draft_id=draft_id,
        version_no=2,
        content_json={"type": "doc", "content": []},
        content_sha256="fake-hash",
    )

    monkeypatch.setattr(
        "app.repositories.drafts.draft_repository.get_draft_by_id",
        lambda db, draft_id, matter_id: mock_draft,
    )
    monkeypatch.setattr(
        "app.repositories.drafts.draft_repository.get_latest_version",
        lambda db, draft_id: mock_latest_version,
    )

    with pytest.raises(ValueError, match="Stale version write"):
        service.propose_document_ops(
            db=mock_db,
            matter_id=matter_id,
            draft_id=draft_id,
            base_version_id=stale_base_version_id,
            operations=[
                DocumentOperation(
                    type="insert_paragraph",
                    position="facts.after",
                    text="Some text",
                )
            ],
        )


def test_propose_document_ops_applies_blocks_cleanly(monkeypatch) -> None:
    service = DraftService()
    mock_db = MagicMock()
    matter_id = uuid4()
    draft_id = uuid4()
    version_id = uuid4()
    span_id = uuid4()

    mock_draft = Draft(id=draft_id, matter_id=matter_id, title="Test Draft")
    mock_latest_version = DocumentVersion(
        id=version_id,
        draft_id=draft_id,
        version_no=1,
        content_json={"type": "doc", "content": []},
        content_sha256="fake-hash",
    )

    created_version = DocumentVersion(
        id=uuid4(),
        draft_id=draft_id,
        version_no=2,
        content_json={
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {"position": "facts.after", "evidence_span_ids": [str(span_id)]},
                    "content": [{"type": "text", "text": "Debt defaulted on 15 March 2021."}],
                }
            ],
        },
        content_sha256="new-hash",
    )

    monkeypatch.setattr(
        "app.repositories.drafts.draft_repository.get_draft_by_id",
        lambda db, draft_id, matter_id: mock_draft,
    )
    monkeypatch.setattr(
        "app.repositories.drafts.draft_repository.get_latest_version",
        lambda db, draft_id: mock_latest_version,
    )
    monkeypatch.setattr(
        "app.services.sources.retrieval.retrieval_service.get_evidence_spans",
        lambda db, matter_id, span_ids: [MagicMock(id=span_id)],
    )
    monkeypatch.setattr(
        "app.repositories.drafts.draft_repository.create_new_version",
        lambda db, draft, content_json, base_version_id, created_by_type, created_by_id, change_summary: created_version,
    )

    result = service.propose_document_ops(
        db=mock_db,
        matter_id=matter_id,
        draft_id=draft_id,
        base_version_id=version_id,
        operations=[
            DocumentOperation(
                type="insert_paragraph",
                position="facts.after",
                text="Debt defaulted on 15 March 2021.",
                evidence_span_ids=[span_id],
            )
        ],
    )

    assert result.version_no == 2
    assert len(result.content_json["content"]) == 1
    assert result.content_json["content"][0]["attrs"]["evidence_span_ids"] == [str(span_id)]
