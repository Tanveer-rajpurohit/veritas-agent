import hashlib
from collections.abc import Generator
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.drafts import DocumentVersion, Draft
from app.models.matters import Matter, MatterMember, User
from app.models.sources import Source, SourceChunk, SourcePage, SourceVersion

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(monkeypatch: pytest.MonkeyPatch) -> tuple[TestClient, User]:
    monkeypatch.setattr(settings, "AUTH_SECRET", "test-secret-that-is-at-least-32-bytes-long")
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "fact-lawyer@example.com", "password": "correct-horse-battery"},
    )
    assert response.status_code == 201
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"

    db = TestingSessionLocal()
    user = db.query(User).filter_by(email="fact-lawyer@example.com").first()
    return client, user


def test_checks_endpoint_requires_auth() -> None:
    client = TestClient(app)
    resp = client.post(f"/api/v1/document-versions/{uuid4()}/checks")
    assert resp.status_code == 401


def test_checks_endpoint_rejects_nonexistent_version(auth_client: tuple[TestClient, User]) -> None:
    client, _ = auth_client
    resp = client.post(f"/api/v1/document-versions/{uuid4()}/checks")
    assert resp.status_code == 404


def test_checks_endpoint_synthetic_conflict_api_flow(auth_client: tuple[TestClient, User]) -> None:
    client, user = auth_client
    db = TestingSessionLocal()

    # Create Matter
    matter = Matter(id=uuid4(), title="Matter for Checks API")
    member = MatterMember(matter_id=matter.id, user_id=user.id, role="owner")
    db.add_all([matter, member])
    db.flush()

    # Facility source: ₹4.85 crore
    s1 = Source(
        id=uuid4(),
        matter_id=matter.id,
        source_type="client_record",
        authority_level="matter_evidence",
        canonical_title="Facility Agreement",
    )
    db.add(s1)
    db.flush()
    t1 = "Credit facility is ₹4.85 crore."
    v1 = SourceVersion(
        id=uuid4(),
        source_id=s1.id,
        version_number=1,
        object_key="matters/facility.pdf",
        mime_type="application/pdf",
        file_sha256=hashlib.sha256(t1.encode()).hexdigest(),
    )
    db.add(v1)
    db.flush()
    p1 = SourcePage(
        id=uuid4(),
        source_version_id=v1.id,
        page_number=1,
        text=t1,
        text_sha256=hashlib.sha256(t1.encode()).hexdigest(),
    )
    db.add(p1)
    db.flush()
    db.add(
        SourceChunk(
            id=uuid4(),
            source_version_id=v1.id,
            page_id=p1.id,
            chunk_index=0,
            start_offset=0,
            end_offset=len(t1),
            text=t1,
            token_count=5,
            embedding_model="amazon.titan-embed-text-v2:0",
        )
    )

    # Ledger source: ₹5.20 crore
    s2 = Source(
        id=uuid4(),
        matter_id=matter.id,
        source_type="client_record",
        authority_level="matter_evidence",
        canonical_title="Ledger Statement",
    )
    db.add(s2)
    db.flush()
    t2 = "Default outstanding is ₹5.20 crore."
    v2 = SourceVersion(
        id=uuid4(),
        source_id=s2.id,
        version_number=1,
        object_key="matters/ledger.pdf",
        mime_type="application/pdf",
        file_sha256=hashlib.sha256(t2.encode()).hexdigest(),
    )
    db.add(v2)
    db.flush()
    p2 = SourcePage(
        id=uuid4(),
        source_version_id=v2.id,
        page_number=1,
        text=t2,
        text_sha256=hashlib.sha256(t2.encode()).hexdigest(),
    )
    db.add(p2)
    db.flush()
    db.add(
        SourceChunk(
            id=uuid4(),
            source_version_id=v2.id,
            page_id=p2.id,
            chunk_index=0,
            start_offset=0,
            end_offset=len(t2),
            text=t2,
            token_count=5,
            embedding_model="amazon.titan-embed-text-v2:0",
        )
    )

    # Draft with ₹4.85 crore
    draft = Draft(id=uuid4(), matter_id=matter.id, title="Working Brief")
    db.add(draft)
    db.flush()
    d_text = "The borrower owed ₹4.85 crore on 12 May 2026."
    doc_ver = DocumentVersion(
        id=uuid4(),
        draft_id=draft.id,
        version_no=1,
        content_json={
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {"id": "p-1"},
                    "content": [{"type": "text", "text": d_text}],
                }
            ],
        },
        content_sha256=hashlib.sha256(d_text.encode()).hexdigest(),
        created_at=datetime.now(UTC),
    )
    db.add(doc_ver)
    db.commit()

    # Call POST /document-versions/{version_id}/checks
    resp = client.post(
        f"/api/v1/document-versions/{doc_ver.id}/checks",
        json={"checks": ["fact"], "mode": "review_only"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["document_version_id"] == str(doc_ver.id)
    assert len(data["findings"]) >= 1

    amt_finding = next(f for f in data["findings"] if f["claim_text"] == "₹4.85 crore")
    assert amt_finding["status"] == "needs_review"
    assert len(amt_finding["evidence"]) == 2

    # Call GET /document-versions/{version_id}/findings with filters
    list_resp = client.get(
        f"/api/v1/document-versions/{doc_ver.id}/findings",
        params={"dimension": "fact_consistency", "status": "needs_review"},
    )
    assert list_resp.status_code == 200
    findings_list = list_resp.json()
    assert len(findings_list) >= 1
    assert all(f["status"] == "needs_review" for f in findings_list)

    # Cross-matter authorization check: another user cannot access this version
    other_user_resp = client.post(
        "/api/v1/auth/register",
        json={"email": "other@example.com", "password": "password12345"},
    )
    other_token = other_user_resp.json()["access_token"]
    other_client = TestClient(app)
    other_client.headers["Authorization"] = f"Bearer {other_token}"

    cross_resp = other_client.post(
        f"/api/v1/document-versions/{doc_ver.id}/checks",
        json={"checks": ["fact"], "mode": "review_only"},
    )
    assert cross_resp.status_code == 404
