from datetime import datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class NormalizedFact(BaseModel):
    """A normalized atomic fact extracted from a draft block.

    NOTE on field limits: the previous cap of 1000 characters on ``raw_value``
    and ``canonical_value`` was the direct cause of the
    ``ValidationError: ... String should have at most 1000 characters`` crash
    that killed agent runs whenever a long legal paragraph (e.g. a multi-line
    recommendation block) was normalized as an ``event`` claim. The limits are
    now aligned with the parent ``FactClaim.text`` field (4000 chars) plus a
    safety margin, and the extractor additionally truncates defensively, so a
    single long block can never break a whole drafting run.
    """

    model_config = ConfigDict(extra="forbid")

    kind: Literal["monetary_amount", "date", "party", "identifier", "event", "legal_text"]
    raw_value: str = Field(min_length=1, max_length=8000)
    canonical_value: str = Field(min_length=1, max_length=8000)
    unit_or_currency: str | None = Field(default=None, max_length=50)
    numeric_value: float | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class FactClaim(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID = Field(default_factory=uuid4)
    document_version_id: UUID
    block_index: int = Field(ge=0)
    block_id: str | None = Field(default=None, max_length=64)
    from_offset: int = Field(ge=0)
    to_offset: int = Field(ge=0)
    kind: Literal["monetary_amount", "date", "party", "identifier", "event", "legal_text"]
    text: str = Field(min_length=1, max_length=4000)
    normalized: NormalizedFact
    claim_sha256: str = Field(min_length=64, max_length=64)


class FactEvidenceLink(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence_span_id: UUID
    relation: Literal["supports", "contradicts", "mentions", "source"]


class ProposedFactFinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    claim_id: UUID
    dimension: Literal["fact_consistency", "identity", "quotation"] = "fact_consistency"
    status: Literal["supported", "contradicted", "unresolved", "needs_review"]
    evidence: list[FactEvidenceLink] = Field(default_factory=list, max_length=10)
    method: Literal["exact", "normalized", "retrieval", "model_assessment"]
    reason: str = Field(min_length=1, max_length=1000)
    limitations: list[str] = Field(default_factory=list, max_length=10)


class FactCorrectionCandidate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    candidate_id: UUID = Field(default_factory=uuid4)
    claim_id: UUID
    replacement_text: str = Field(min_length=1, max_length=4000)
    evidence_span_ids: list[UUID] = Field(min_length=1, max_length=10)
    safety: Literal["safe", "requires_human_choice"]
    reason: str = Field(min_length=1, max_length=1000)


class FactReviewerResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    findings: list[ProposedFactFinding] = Field(default_factory=list, max_length=100)
    unchecked_claim_ids: list[UUID] = Field(default_factory=list, max_length=100)
    run_limitations: list[str] = Field(default_factory=list, max_length=10)
    correction_candidates: list[FactCorrectionCandidate] = Field(
        default_factory=list, max_length=50
    )


class FactReviewRunRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    checks: list[Literal["fact", "citation", "style"]] = Field(default=["fact"])
    mode: Literal["review_only", "propose_fixes", "apply_safe_fixes"] = "review_only"
    block_ids: list[str] | None = Field(default=None, max_length=50)


class FindingEvidenceItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evidence_span_id: UUID
    source_version_id: UUID
    page_number: int
    text: str
    relation: str


class FactFindingResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: UUID
    claim_id: UUID | None = None
    document_version_id: UUID
    block_index: int
    claim_text: str
    claim_sha256: str
    dimension: str
    status: str
    method: str
    reason: str
    limitations: list[str]
    checked_at: datetime
    stale_at: datetime | None = None
    evidence: list[FindingEvidenceItem]
    resolution: str | None = None


class FactReviewRunResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    document_version_id: UUID
    mode: Literal["review_only", "propose_fixes", "apply_safe_fixes"]
    findings: list[FactFindingResponse]
    correction_candidates: list[FactCorrectionCandidate] = Field(default_factory=list)
    source_version_id: UUID | None = None
    created_version_id: UUID | None = None
    applied_correction_ids: list[UUID] = Field(default_factory=list)
    blocked_correction_ids: list[UUID] = Field(default_factory=list)
    summary: dict[str, int] = Field(default_factory=dict)
