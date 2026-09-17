from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.draft import DraftCreateRequest, DraftResponse, DraftUpdateRequest


def test_draft_create_valid() -> None:
    data = {
        "title": "  IBC Section 7 Application Brief  ",
        "kind": "brief",
        "content_json": {"type": "doc", "content": [{"type": "paragraph"}]},
    }
    req = DraftCreateRequest(**data)
    assert req.title == "IBC Section 7 Application Brief"
    assert req.kind == "brief"
    assert req.content_json == {"type": "doc", "content": [{"type": "paragraph"}]}


def test_draft_create_rejects_blank_title() -> None:
    with pytest.raises(ValidationError) as exc:
        DraftCreateRequest(title="   ")
    assert "title must not be empty" in str(exc.value)


def test_draft_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError) as exc:
        DraftCreateRequest(title="Valid Title", malicious="field")
    assert "Extra inputs are not permitted" in str(exc.value)


def test_draft_update_in_place_overwrite() -> None:
    req = DraftUpdateRequest(
        content_json={"type": "doc", "content": [{"type": "paragraph", "text": "Edited text"}]}
    )
    assert req.bump_version is False
    assert req.content_json is not None

    ai_req = DraftUpdateRequest(
        content_json={"type": "doc", "content": [{"type": "paragraph", "text": "AI text"}]},
        bump_version=True,
    )
    assert ai_req.bump_version is True


def test_draft_response_serialization() -> None:
    now = datetime.now(UTC)
    draft_id = uuid4()
    matter_id = uuid4()
    resp = DraftResponse(
        id=draft_id,
        matter_id=matter_id,
        title="Test Brief",
        kind="brief",
        content_json={"type": "doc", "content": []},
        version_no=1,
        created_at=now,
        updated_at=now,
    )
    assert resp.id == draft_id
    assert resp.matter_id == matter_id
    assert resp.version_no == 1
    assert resp.content_json == {"type": "doc", "content": []}
