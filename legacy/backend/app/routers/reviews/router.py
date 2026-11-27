from datetime import datetime
from typing import Annotated
from urllib.parse import urlparse
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.db.session import get_db
from app.dependencies.matter import get_finding_for_user, get_version_for_user
from app.models.matters import User
from app.models.reviews import Finding, FindingEvidence, FindingResolution
from app.models.sources import EvidenceSpan, Source, SourcePage, SourceVersion
from app.repositories.drafts.draft_repository import draft_repository
from app.schemas.agents.fact_reviewer import (
    FactReviewRunRequest,
    FactReviewRunResponse,
)
from app.services.reviews.checks import check_citations, check_version
from app.services.reviews.fact_review_service import fact_review_service

router = APIRouter(prefix="/api/v1", tags=["Review"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]


class FindingEvidenceResponse(BaseModel):
    evidence_span_id: UUID
    source_version_id: UUID
    page_number: int
    text: str
    relation: str
    source_title: str
    source_url: str | None
    source_url_verified: bool


class FindingResponse(BaseModel):
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
    stale_at: datetime | None
    evidence: list[FindingEvidenceResponse]
    resolution: str | None


class ResolveFinding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    action: str
    reason: str = Field(min_length=10, max_length=2000)


def _response(db: Session, finding: Finding) -> FindingResponse:
    resolution = db.scalar(
        select(FindingResolution)
        .where(FindingResolution.finding_id == finding.id)
        .order_by(FindingResolution.created_at.desc())
    )
    rows = db.execute(
        select(FindingEvidence, EvidenceSpan, SourcePage, SourceVersion, Source)
        .join(EvidenceSpan, FindingEvidence.evidence_span_id == EvidenceSpan.id)
        .join(SourcePage, EvidenceSpan.page_id == SourcePage.id)
        .join(SourceVersion, EvidenceSpan.source_version_id == SourceVersion.id)
        .join(Source, SourceVersion.source_id == Source.id)
        .where(FindingEvidence.finding_id == finding.id)
    ).all()
    evidence = [
        FindingEvidenceResponse(
            evidence_span_id=span.id,
            source_version_id=span.source_version_id,
            page_number=page.page_number,
            text=span.quoted_text,
            relation=link.relation,
            source_title=source.canonical_title,
            source_url=source.official_url,
            source_url_verified=_trusted_legal_url(source.official_url),
        )
        for link, span, page, _version, source in rows
    ]
    return FindingResponse(
        id=finding.id,
        claim_id=finding.claim_id,
        document_version_id=finding.document_version_id,
        block_index=finding.block_index,
        claim_text=finding.claim_text,
        claim_sha256=finding.claim_sha256,
        dimension=finding.dimension,
        status=finding.status,
        method=finding.method,
        reason=finding.reason,
        limitations=finding.limitations,
        checked_at=finding.checked_at,
        stale_at=finding.stale_at,
        evidence=evidence,
        resolution=resolution.action if resolution else None,
    )


def _trusted_legal_url(url: str | None) -> bool:
    if not url:
        return False
    parsed = urlparse(url)
    host = (parsed.hostname or "").casefold()
    trusted_hosts = {
        "sci.gov.in",
        "api.sci.gov.in",
        "indiacode.gov.in",
        "indiacode.ecourtsindia.com",
        "indiankanoon.org",
        "api.indiankanoon.org",
    }
    return parsed.scheme == "https" and host in trusted_hosts


@router.post(
    "/document-versions/{version_id}/checks",
    response_model=FactReviewRunResponse | list[FindingResponse],
)
def run_checks(
    version_id: UUID,
    db: DbSession,
    user: CurrentUser,
    payload: FactReviewRunRequest | None = None,
    idempotency_key: Annotated[str | None, Header(min_length=1, max_length=128)] = None,
) -> FactReviewRunResponse | list[FindingResponse]:
    version, draft, _ = get_version_for_user(db, version_id, user.id, "reviewer")

    latest = draft_repository.get_latest_version(db, draft.id)
    if latest.id != version.id:
        raise HTTPException(status_code=409, detail="Checks require the current version")

    if payload is not None and payload.checks == ["fact"]:
        return fact_review_service.run(
            db=db,
            version_id=version.id,
            user_id=user.id,
            request=payload,
            idempotency_key=idempotency_key,
        )

    if payload is not None and payload.checks == ["citation"]:
        findings = check_citations(db, version)
        return [_response(db, finding) for finding in findings]

    if payload is not None:
        raise HTTPException(
            status_code=422, detail="Run one supported check at a time: fact or citation"
        )

    findings = check_version(db, version, draft.matter_id)
    return [_response(db, finding) for finding in findings]


@router.get("/document-versions/{version_id}/findings", response_model=list[FindingResponse])
def list_findings(
    version_id: UUID,
    db: DbSession,
    user: CurrentUser,
    dimension: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    is_stale: Annotated[bool | None, Query()] = None,
) -> list[FindingResponse]:
    get_version_for_user(db, version_id, user.id, "viewer")
    query = select(Finding).where(Finding.document_version_id == version_id)
    if dimension:
        query = query.where(Finding.dimension == dimension)
    if status:
        query = query.where(Finding.status == status)
    if is_stale is not None:
        if is_stale:
            query = query.where(Finding.stale_at.is_not(None))
        else:
            query = query.where(Finding.stale_at.is_(None))

    findings = db.scalars(query.order_by(Finding.checked_at.desc())).all()
    return [_response(db, finding) for finding in findings]


@router.post("/findings/{finding_id}/resolutions", response_model=FindingResponse)
def resolve_finding(
    finding_id: UUID,
    payload: ResolveFinding,
    db: DbSession,
    user: CurrentUser,
    idempotency_key: Annotated[str, Header(min_length=1, max_length=128)],
) -> FindingResponse:
    finding, _ = get_finding_for_user(db, finding_id, user.id, "reviewer")
    version, draft, _ = get_version_for_user(db, finding.document_version_id, user.id, "reviewer")
    latest = draft_repository.get_latest_version(db, version.draft_id)
    if latest.id != version.id or finding.stale_at is not None:
        raise HTTPException(status_code=409, detail="Finding is stale")
    if payload.action not in {"resolve", "retain"}:
        raise HTTPException(status_code=422, detail="Invalid resolution action")
    previous = db.scalar(
        select(FindingResolution).where(
            FindingResolution.finding_id == finding_id,
            FindingResolution.user_id == user.id,
            FindingResolution.idempotency_key == idempotency_key,
        )
    )
    if previous is not None:
        if previous.action != payload.action or previous.reason != payload.reason:
            raise HTTPException(status_code=409, detail="Idempotency key was reused")
        return _response(db, finding)
    db.add(
        FindingResolution(
            finding_id=finding_id,
            user_id=user.id,
            idempotency_key=idempotency_key,
            action=payload.action,
            reason=payload.reason,
        )
    )
    db.commit()
    return _response(db, finding)
