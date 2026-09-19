from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.agents.fact_reviewer.tools import (
    FactReviewerToolHandlers,
    create_fact_reviewer_tools,
)
from app.db.base import Base
from app.schemas.agents.fact_reviewer import (
    FactClaim,
    FactCorrectionCandidate,
    NormalizedFact,
)

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


def test_fact_reviewer_tool_count_and_names() -> None:
    db = TestingSessionLocal()
    matter_id = uuid4()
    version_id = uuid4()

    tools_without_fix, _ = create_fact_reviewer_tools(
        db=db,
        matter_id=matter_id,
        document_version_id=version_id,
        allow_fixes=False,
    )
    assert len(tools_without_fix) == 7
    names_without = [t.tool_spec.get("name") for t in tools_without_fix]
    assert "get_review_claims" in names_without
    assert "search_matter_evidence" in names_without
    assert "materialize_fact_evidence" in names_without
    assert "submit_fact_findings" in names_without
    assert "lookup_public_registry" in names_without
    assert "lookup_company_master" in names_without
    assert "lookup_legal_fact" in names_without
    assert "request_fact_fix" not in names_without

    tools_with_fix, _ = create_fact_reviewer_tools(
        db=db,
        matter_id=matter_id,
        document_version_id=version_id,
        allow_fixes=True,
    )
    assert len(tools_with_fix) == 8
    names_with = [t.tool_spec.get("name") for t in tools_with_fix]
    assert "request_fact_fix" in names_with


def test_get_review_claims_rejects_mismatched_version() -> None:
    db = TestingSessionLocal()
    matter_id = uuid4()
    version_id = uuid4()
    other_version_id = uuid4()

    handlers = FactReviewerToolHandlers(
        db=db,
        matter_id=matter_id,
        document_version_id=version_id,
        claims=[],
    )

    with pytest.raises(ValueError, match="does not match the active review target"):
        handlers.get_review_claims(str(other_version_id))


def test_tool_call_budget_exceeded() -> None:
    db = TestingSessionLocal()
    matter_id = uuid4()
    version_id = uuid4()

    claim = FactClaim(
        id=uuid4(),
        document_version_id=version_id,
        block_index=0,
        from_offset=0,
        to_offset=10,
        kind="monetary_amount",
        text="₹10 lakh",
        normalized=NormalizedFact(
            kind="monetary_amount",
            raw_value="₹10 lakh",
            canonical_value="₹10,00,000",
        ),
        claim_sha256="0" * 64,
    )

    handlers = FactReviewerToolHandlers(
        db=db,
        matter_id=matter_id,
        document_version_id=version_id,
        claims=[claim],
        max_tool_calls=2,
    )

    handlers.get_review_claims(str(version_id))
    handlers.get_review_claims(str(version_id))

    with pytest.raises(RuntimeError, match="Tool call limit exceeded"):
        handlers.get_review_claims(str(version_id))


def test_lookup_public_registry_rejects_unapproved_registry() -> None:
    db = TestingSessionLocal()
    matter_id = uuid4()
    version_id = uuid4()
    claim_id = uuid4()

    claim = FactClaim(
        id=claim_id,
        document_version_id=version_id,
        block_index=0,
        from_offset=0,
        to_offset=10,
        kind="monetary_amount",
        text="₹10 lakh",
        normalized=NormalizedFact(
            kind="monetary_amount",
            raw_value="₹10 lakh",
            canonical_value="₹10,00,000",
        ),
        claim_sha256="0" * 64,
    )

    handlers = FactReviewerToolHandlers(
        db=db,
        matter_id=matter_id,
        document_version_id=version_id,
        claims=[claim],
    )

    result = handlers.lookup_public_registry(str(claim_id), "unapproved_scraper", "query")
    assert result["status"] == "unavailable"
    assert "not permitted" in str(result["message"])


def test_request_fact_fix_blocks_human_choice_candidate() -> None:
    db = TestingSessionLocal()
    matter_id = uuid4()
    version_id = uuid4()
    claim_id = uuid4()

    claim = FactClaim(
        id=claim_id,
        document_version_id=version_id,
        block_index=0,
        from_offset=0,
        to_offset=10,
        kind="monetary_amount",
        text="₹4.85 crore",
        normalized=NormalizedFact(
            kind="monetary_amount",
            raw_value="₹4.85 crore",
            canonical_value="₹4,85,00,000",
        ),
        claim_sha256="0" * 64,
    )

    handlers = FactReviewerToolHandlers(
        db=db,
        matter_id=matter_id,
        document_version_id=version_id,
        claims=[claim],
    )

    candidate = FactCorrectionCandidate(
        claim_id=claim_id,
        replacement_text="₹5.20 crore",
        evidence_span_ids=[uuid4()],
        safety="requires_human_choice",
        reason="Conflicting records",
    )
    handlers.register_correction_candidate(candidate)

    fix_result = handlers.request_fact_fix(
        str(version_id), [str(candidate.candidate_id)], idempotency_key="key-1"
    )
    assert fix_result["new_version_id"] is None
    assert str(candidate.candidate_id) in fix_result["blocked_candidate_ids"]
    assert str(candidate.candidate_id) not in fix_result["applied_candidate_ids"]
