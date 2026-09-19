import hashlib
from datetime import UTC, datetime
from uuid import UUID, uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.drafts import DocumentVersion, Draft
from app.models.matters import Matter, MatterMember, User
from app.models.reviews import Finding
from app.models.sources import Source, SourceChunk, SourcePage, SourceVersion
from app.schemas.agents.fact_reviewer import FactReviewRunRequest
from app.services.reviews.fact_review_service import fact_review_service

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def init_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def _create_test_source(
    db: Session, matter_id: UUID, title: str, text: str
) -> tuple[Source, SourceVersion, SourcePage, SourceChunk]:
    source = Source(
        id=uuid4(),
        matter_id=matter_id,
        source_type="client_record",
        authority_level="matter_evidence",
        canonical_title=title,
    )
    db.add(source)
    db.flush()

    sha = hashlib.sha256(text.encode()).hexdigest()
    ver = SourceVersion(
        id=uuid4(),
        source_id=source.id,
        version_number=1,
        object_key=f"matters/{source.id}.pdf",
        mime_type="application/pdf",
        file_sha256=sha,
    )
    db.add(ver)
    db.flush()

    page = SourcePage(
        id=uuid4(),
        source_version_id=ver.id,
        page_number=1,
        text=text,
        text_sha256=sha,
    )
    db.add(page)
    db.flush()

    chunk = SourceChunk(
        id=uuid4(),
        source_version_id=ver.id,
        page_id=page.id,
        chunk_index=0,
        start_offset=0,
        end_offset=len(text),
        text=text,
        token_count=len(text.split()),
        embedding_model="amazon.titan-embed-text-v2:0",
    )
    db.add(chunk)
    db.flush()
    return source, ver, page, chunk


def test_fact_review_synthetic_conflict_fixture() -> None:
    db = TestingSessionLocal()

    # 1. Setup user and matter
    user = User(id=uuid4(), email="lawyer@example.com", password_hash="hash")
    matter = Matter(id=uuid4(), title="IBC Section 7 Working Brief")
    member = MatterMember(matter_id=matter.id, user_id=user.id, role="owner")
    db.add_all([user, matter, member])
    db.flush()

    # 2. Synthetic Record 1: Facility Agreement (₹4.85 crore)
    _create_test_source(
        db=db,
        matter_id=matter.id,
        title="Facility Agreement dated 15 Jan 2021",
        text="The Lender agreed to grant a financial credit facility of ₹4.85 crore to the Borrower.",
    )

    # 3. Synthetic Record 2: Default Ledger (₹5.20 crore)
    _create_test_source(
        db=db,
        matter_id=matter.id,
        title="Bank Account Ledger Statement as of 12 May 2026",
        text="Total outstanding default amount due under Account is ₹5.20 crore as on 12 May 2026.",
    )

    # 4. Draft containing ₹4.85 crore
    draft = Draft(id=uuid4(), matter_id=matter.id, title="Section 7 Brief Draft")
    db.add(draft)
    db.flush()

    draft_text = "The corporate debtor defaulted on financial debt of ₹4.85 crore on 12 May 2026."
    doc_ver = DocumentVersion(
        id=uuid4(),
        draft_id=draft.id,
        version_no=1,
        content_json={
            "type": "doc",
            "content": [
                {
                    "type": "paragraph",
                    "attrs": {"id": "para-1"},
                    "content": [{"type": "text", "text": draft_text}],
                }
            ],
        },
        content_sha256=hashlib.sha256(draft_text.encode()).hexdigest(),
        created_at=datetime.now(UTC),
    )
    db.add(doc_ver)
    db.commit()

    # 5. Run Fact Review
    response = fact_review_service.run(
        db=db,
        version_id=doc_ver.id,
        user_id=user.id,
        request=FactReviewRunRequest(checks=["fact"], mode="review_only"),
    )

    assert response.document_version_id == doc_ver.id
    assert len(response.findings) >= 1

    amt_finding = next(f for f in response.findings if f.claim_text == "₹4.85 crore")
    assert amt_finding.status == "contradicted"
    assert amt_finding.method == "exact"
    assert "conflicting amounts" in amt_finding.reason.lower()

    # Both evidence spans must be attached!
    assert len(amt_finding.evidence) == 2
    relations = {e.relation for e in amt_finding.evidence}
    assert "supports" in relations
    assert "contradicts" in relations

    # Correction candidate must require human choice
    assert len(response.correction_candidates) >= 1
    cand = response.correction_candidates[0]
    assert cand.safety == "requires_human_choice"
    assert "human choice" in cand.reason.lower()


def test_fact_review_blocks_unsafe_fix_in_apply_safe_fixes() -> None:
    db = TestingSessionLocal()
    user = User(id=uuid4(), email="lawyer2@example.com", password_hash="hash")
    matter = Matter(id=uuid4(), title="Conflict Matter")
    db.add_all([user, matter, MatterMember(matter_id=matter.id, user_id=user.id, role="owner")])
    db.flush()

    _create_test_source(db, matter.id, "Facility", "Agreement amount is ₹4.85 crore")
    _create_test_source(db, matter.id, "Ledger", "Ledger balance is ₹5.20 crore")

    draft = Draft(id=uuid4(), matter_id=matter.id, title="Draft")
    db.add(draft)
    db.flush()
    doc_ver = DocumentVersion(
        id=uuid4(),
        draft_id=draft.id,
        version_no=1,
        content_json={"type": "doc", "content": [{"type": "paragraph", "attrs": {"id": "p1"}, "content": [{"type": "text", "text": "Debt ₹4.85 crore"}]}]},
        content_sha256="sha",
    )
    db.add(doc_ver)
    db.commit()

    # When running apply_safe_fixes, the conflict blocks auto-correction
    response = fact_review_service.run(
        db=db,
        version_id=doc_ver.id,
        user_id=user.id,
        request=FactReviewRunRequest(checks=["fact"], mode="apply_safe_fixes"),
    )

    assert response.created_version_id is None
    assert len(response.blocked_correction_ids) >= 1
    assert len(response.applied_correction_ids) == 0


def test_fact_review_applies_unambiguous_safe_fix() -> None:
    db = TestingSessionLocal()
    user = User(id=uuid4(), email="lawyer3@example.com", password_hash="hash")
    matter = Matter(id=uuid4(), title="Typo Matter")
    db.add_all([user, matter, MatterMember(matter_id=matter.id, user_id=user.id, role="owner")])
    db.flush()

    _create_test_source(db, matter.id, "Facility Agreement", "Sanctioned facility amount is ₹4.85 crore.")

    # Draft contains clear typo: ₹4.58 crore
    draft = Draft(id=uuid4(), matter_id=matter.id, title="Typo Draft")
    db.add(draft)
    db.flush()
    doc_ver = DocumentVersion(
        id=uuid4(),
        draft_id=draft.id,
        version_no=1,
        content_json={"type": "doc", "content": [{"type": "paragraph", "attrs": {"id": "p1"}, "content": [{"type": "text", "text": "Debt ₹4.58 crore."}]}]},
        content_sha256="sha-1",
    )
    db.add(doc_ver)
    db.commit()

    response = fact_review_service.run(
        db=db,
        version_id=doc_ver.id,
        user_id=user.id,
        request=FactReviewRunRequest(checks=["fact"], mode="apply_safe_fixes"),
    )

    assert response.created_version_id is not None
    assert len(response.applied_correction_ids) == 1
    assert len(response.blocked_correction_ids) == 0

    # Old version findings are marked stale
    old_findings = db.query(Finding).filter(Finding.document_version_id == doc_ver.id).all()
    assert all(f.stale_at is not None for f in old_findings)

    # Recheck on new version yields supported
    new_findings = response.findings
    assert any(f.status == "supported" for f in new_findings)
