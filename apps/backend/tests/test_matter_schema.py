from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.schemas.matters import MatterCreateRequest, MatterResponse, MatterUpdateRequest


def test_matter_create_valid() -> None:
    data = {
        "title": "  State Bank of India v. Monnet Ispat & Energy Ltd  ",
        "case_number": "CP (IB) No. 169/KB/2017",
        "court": "NCLT Kolkata",
        "matter_type": "Insolvency (IBC)",
        "stage": "Drafting",
    }
    req = MatterCreateRequest(**data)
    assert req.title == "State Bank of India v. Monnet Ispat & Energy Ltd"
    assert req.court == "NCLT Kolkata"
    assert req.description is None


def test_matter_create_rejects_blank_title() -> None:
    with pytest.raises(ValidationError) as exc:
        MatterCreateRequest(title="   ")
    assert "title must not be empty" in str(exc.value)


def test_matter_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError) as exc:
        MatterCreateRequest(title="Valid Title", malicious_extra="injected")
    assert "Extra inputs are not permitted" in str(exc.value)


def test_matter_update_valid_and_rejects_blank() -> None:
    req = MatterUpdateRequest(title="  New Title  ", stage="Filed")
    assert req.title == "New Title"
    assert req.stage == "Filed"
    assert req.description is None

    with pytest.raises(ValidationError) as exc:
        MatterUpdateRequest(title="   ")
    assert "title must not be empty" in str(exc.value)


def test_matter_response_serialization() -> None:
    now = datetime.now(UTC)
    matter_id = uuid4()
    resp = MatterResponse(
        id=matter_id,
        title="Test Matter",
        matter_type="Insolvency (IBC)",
        stage="Drafting",
        created_at=now,
        updated_at=now,
    )
    assert resp.id == matter_id
    assert resp.title == "Test Matter"
    assert resp.created_at == now
