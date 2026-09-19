import hashlib
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.drafts import DocumentVersion
from app.models.reviews.claim import Claim
from app.models.reviews.finding import Finding, FindingEvidence, FindingResolution
from app.models.sources.evidence import EvidenceSpan
from app.models.sources.source import Source
from app.repositories.drafts.draft_repository import draft_repository
from app.repositories.matters.matter_repository import MatterRepository
from app.schemas.agents.fact_reviewer import (
    FactClaim,
    FactCorrectionCandidate,
    FactFindingResponse,
    FactReviewRunRequest,
    FactReviewRunResponse,
    FindingEvidenceItem,
)
from app.schemas.agents.writer import DocumentOperation
from app.services.drafts import draft_service
from app.services.legal_sources import ecourts_adapter, legal_materializer
from app.services.reviews.claim_extractor import claim_extractor
from app.services.reviews.fact_comparison import extract_amounts, parse_amount


class FactReviewService:
    """Core fact verification service enforcing Matter boundaries, deterministic passes,
    traceable evidence attribution, and safe delegated corrections.
    """

    def _authorize_version(
        self, db: Session, version_id: UUID, user_id: UUID
    ) -> tuple[DocumentVersion, UUID]:
        version = draft_repository.get_version_by_id(db, version_id)
        if version is None:
            raise HTTPException(status_code=404, detail="Version not found")
        draft = draft_repository.get_draft_by_id(db, version.draft_id)
        if draft is None:
            raise HTTPException(status_code=404, detail="Draft not found")
        matter = MatterRepository(db).get_by_id(draft.matter_id, user_id)
        if matter is None:
            raise HTTPException(status_code=404, detail="Version not found")
        return version, draft.matter_id

    def _persist_claims(self, db: Session, claims: list[FactClaim]) -> list[Claim]:
        persisted_claims: list[Claim] = []
        for c in claims:
            existing = db.scalar(
                select(Claim).where(
                    Claim.document_version_id == c.document_version_id,
                    Claim.block_index == c.block_index,
                    Claim.from_offset == c.from_offset,
                    Claim.to_offset == c.to_offset,
                    Claim.claim_sha256 == c.claim_sha256,
                )
            )
            if existing is not None:
                persisted_claims.append(existing)
            else:
                db_claim = Claim(
                    id=c.id,
                    document_version_id=c.document_version_id,
                    block_id=c.block_id,
                    block_index=c.block_index,
                    from_offset=c.from_offset,
                    to_offset=c.to_offset,
                    kind=c.kind,
                    text=c.text,
                    normalized_json=c.normalized.model_dump(mode="json"),
                    claim_sha256=c.claim_sha256,
                    created_at=datetime.now(UTC),
                )
                db.add(db_claim)
                db.flush()
                persisted_claims.append(db_claim)
        return persisted_claims

    def _index_matter_evidence(
        self, db: Session, matter_id: UUID
    ) -> tuple[
        dict[Decimal, list[tuple[UUID, EvidenceSpan, str]]], list[tuple[UUID, EvidenceSpan, str]]
    ]:
        sources = db.scalars(select(Source).where(Source.matter_id == matter_id)).all()
        evidence_by_amount: dict[Decimal, list[tuple[UUID, EvidenceSpan, str]]] = {}
        all_spans: list[tuple[UUID, EvidenceSpan, str]] = []

        for source in sources:
            if not source.versions:
                continue
            latest = max(source.versions, key=lambda v: v.version_number)
            for chunk in latest.chunks:
                if chunk.page is None:
                    continue
                page = chunk.page
                exact_text = page.text[chunk.start_offset : chunk.end_offset]
                if not exact_text:
                    continue

                span = db.scalar(select(EvidenceSpan).where(EvidenceSpan.chunk_id == chunk.id))
                if span is None:
                    span = EvidenceSpan(
                        source_version_id=latest.id,
                        page_id=page.id,
                        chunk_id=chunk.id,
                        start_offset=chunk.start_offset,
                        end_offset=chunk.end_offset,
                        quoted_text=exact_text,
                        quoted_text_sha256=hashlib.sha256(exact_text.encode()).hexdigest(),
                        created_by="fact_review",
                    )
                    db.add(span)
                    db.flush()

                all_spans.append((source.id, span, exact_text))
                parsed_list = extract_amounts(chunk.text)
                for pa in parsed_list:
                    evidence_by_amount.setdefault(pa.numeric_value, []).append(
                        (source.id, span, exact_text)
                    )

        return evidence_by_amount, all_spans

    def run(
        self,
        db: Session,
        version_id: UUID,
        user_id: UUID,
        request: FactReviewRunRequest,
        idempotency_key: str | None = None,
    ) -> FactReviewRunResponse:
        version, matter_id = self._authorize_version(db, version_id, user_id)
        draft = draft_repository.get_draft_by_id(db, version.draft_id)
        if draft is None:
            raise HTTPException(status_code=404, detail="Draft not found")

        latest_version = draft_repository.get_latest_version(db, draft.id)
        if latest_version.id != version.id:
            raise HTTPException(status_code=409, detail="Checks require the current version")

        # Replace only this reviewer's earlier fact results. Citation and other review
        # dimensions remain valid until their own checker reruns or the draft changes.
        db.execute(
            update(Finding)
            .where(
                Finding.document_version_id == version.id,
                Finding.dimension.in_(("fact_consistency", "identity")),
                Finding.stale_at.is_(None),
            )
            .values(status="stale", stale_at=datetime.now(UTC))
        )
        db.flush()

        # Deterministic claim extraction
        fact_claims = claim_extractor.extract_claims(
            document_version_id=version.id,
            content_json=version.content_json,
            block_ids=request.block_ids,
        )
        persisted_claims = self._persist_claims(db, fact_claims)
        persisted_by_location = {
            (c.block_index, c.from_offset, c.to_offset, c.claim_sha256): c for c in persisted_claims
        }
        for claim in fact_claims:
            stored = persisted_by_location[
                (claim.block_index, claim.from_offset, claim.to_offset, claim.claim_sha256)
            ]
            claim.id = stored.id
        claim_model_map = {c.id: c for c in fact_claims}

        evidence_by_amount, all_matter_spans = self._index_matter_evidence(db, matter_id)

        findings: list[Finding] = []
        correction_candidates: list[FactCorrectionCandidate] = []

        for fact_claim in fact_claims:
            claim_id = fact_claim.id
            recomputed_hash = hashlib.sha256(fact_claim.text.strip().encode()).hexdigest()

            if fact_claim.kind == "monetary_amount":
                parsed = parse_amount(fact_claim.text)
                if parsed:
                    claim_val = parsed.numeric_value
                    distinct_sources_by_amount: dict[Decimal, set[UUID]] = {}
                    for amt, tuples in evidence_by_amount.items():
                        distinct_sources_by_amount[amt] = {t[0] for t in tuples}

                    all_distinct_sources = {
                        s_id
                        for sources_set in distinct_sources_by_amount.values()
                        for s_id in sources_set
                    }

                    # Multi-source conflict condition: multiple distinct sources reporting conflicting amounts
                    is_conflict = len(evidence_by_amount) > 1 and len(all_distinct_sources) > 1

                    if is_conflict:
                        status = "contradicted"
                        method = "exact"
                        amounts_str = ", ".join(
                            f"₹{amt:,.2f}".rstrip("0").rstrip(".") for amt in evidence_by_amount
                        )
                        reason = f"Matter records contain conflicting amounts: {amounts_str}."
                        limitations = [
                            "Conflicting records remain visible together; the system does not pick a winner."
                        ]

                        finding = Finding(
                            claim_id=claim_id,
                            document_version_id=version.id,
                            block_index=fact_claim.block_index,
                            claim_text=fact_claim.text,
                            claim_sha256=recomputed_hash,
                            dimension="fact_consistency",
                            status=status,
                            method=method,
                            reason=reason,
                            limitations=limitations,
                            checked_at=datetime.now(UTC),
                            stale_at=None,
                        )
                        db.add(finding)
                        db.flush()

                        seen_spans: set[UUID] = set()
                        for amt, tuples in evidence_by_amount.items():
                            for _, span, _ in tuples:
                                if span.id in seen_spans:
                                    continue
                                seen_spans.add(span.id)
                                relation = "supports" if amt == claim_val else "contradicts"
                                db.add(
                                    FindingEvidence(
                                        finding_id=finding.id,
                                        evidence_span_id=span.id,
                                        relation=relation,
                                    )
                                )

                        findings.append(finding)
                        correction_candidates.append(
                            FactCorrectionCandidate(
                                claim_id=claim_id,
                                replacement_text=fact_claim.text,
                                evidence_span_ids=list(seen_spans),
                                safety="requires_human_choice",
                                reason="Conflicting client records require human choice and recorded reason before modification.",
                            )
                        )

                    elif claim_val in evidence_by_amount:
                        status = "supported"
                        method = "exact"
                        reason = "Amount matches stored Matter client record passage"
                        limitations = []

                        finding = Finding(
                            claim_id=claim_id,
                            document_version_id=version.id,
                            block_index=fact_claim.block_index,
                            claim_text=fact_claim.text,
                            claim_sha256=recomputed_hash,
                            dimension="fact_consistency",
                            status=status,
                            method=method,
                            reason=reason,
                            limitations=limitations,
                            checked_at=datetime.now(UTC),
                            stale_at=None,
                        )
                        db.add(finding)
                        db.flush()

                        seen_spans = set()
                        for _, span, _ in evidence_by_amount[claim_val]:
                            if span.id in seen_spans:
                                continue
                            seen_spans.add(span.id)
                            db.add(
                                FindingEvidence(
                                    finding_id=finding.id,
                                    evidence_span_id=span.id,
                                    relation="supports",
                                )
                            )
                        findings.append(finding)

                    elif evidence_by_amount:
                        status = "contradicted"
                        method = "exact"
                        single_val = next(iter(evidence_by_amount.keys()))
                        tuples = evidence_by_amount[single_val]
                        canonical_rep = f"₹{single_val:,.2f}".rstrip("0").rstrip(".")
                        reason = f"Draft amount differs from client record amount {canonical_rep}"
                        limitations = [
                            "Client records are evidence of what a record says; not proof of underlying real-world fact."
                        ]

                        finding = Finding(
                            claim_id=claim_id,
                            document_version_id=version.id,
                            block_index=fact_claim.block_index,
                            claim_text=fact_claim.text,
                            claim_sha256=recomputed_hash,
                            dimension="fact_consistency",
                            status=status,
                            method=method,
                            reason=reason,
                            limitations=limitations,
                            checked_at=datetime.now(UTC),
                            stale_at=None,
                        )
                        db.add(finding)
                        db.flush()

                        span_ids = []
                        for _, span, _ in tuples:
                            span_ids.append(span.id)
                            db.add(
                                FindingEvidence(
                                    finding_id=finding.id,
                                    evidence_span_id=span.id,
                                    relation="contradicts",
                                )
                            )
                        findings.append(finding)

                        correction_candidates.append(
                            FactCorrectionCandidate(
                                claim_id=claim_id,
                                replacement_text=canonical_rep,
                                evidence_span_ids=span_ids,
                                safety="safe",
                                reason=f"Unambiguous single client record establishes {canonical_rep}",
                            )
                        )
                    else:
                        finding = Finding(
                            claim_id=claim_id,
                            document_version_id=version.id,
                            block_index=fact_claim.block_index,
                            claim_text=fact_claim.text,
                            claim_sha256=recomputed_hash,
                            dimension="fact_consistency",
                            status="unresolved",
                            method="retrieval",
                            reason="No matching client records found in this Matter for this amount",
                            limitations=[
                                "This check does not establish whether the underlying debt exists."
                            ],
                            checked_at=datetime.now(UTC),
                            stale_at=None,
                        )
                        db.add(finding)
                        db.flush()
                        findings.append(finding)

            elif fact_claim.kind == "legal_text":
                meta = fact_claim.normalized.metadata
                act_key = str(meta.get("act_key", "ibc"))
                unit = str(meta.get("unit", "section"))
                provision = str(meta.get("provision", "7"))

                try:
                    raw_prov = ecourts_adapter.get_provision(
                        act_key=act_key, provision=provision, unit=unit
                    )
                    span, source, v_rec = legal_materializer.materialize_legal_text(
                        db=db,
                        title=f"{raw_prov['act_title']} - {unit.capitalize()} {provision}",
                        text=raw_prov["text"],
                        source_type="statute",
                        official_url=raw_prov.get("official_source_url")
                        or raw_prov.get("provider_url"),
                        heading_path=[f"{unit.capitalize()} {provision}"],
                    )
                    finding = Finding(
                        claim_id=claim_id,
                        document_version_id=version.id,
                        block_index=fact_claim.block_index,
                        claim_text=fact_claim.text,
                        claim_sha256=recomputed_hash,
                        dimension="identity",
                        status="supported",
                        method="exact",
                        reason=f"Matches verified statutory provision {unit.capitalize()} {provision} of {raw_prov['act_title']}",
                        limitations=["Legal outcome and judicial treatment were not evaluated."],
                        checked_at=datetime.now(UTC),
                        stale_at=None,
                    )
                    db.add(finding)
                    db.flush()
                    db.add(
                        FindingEvidence(
                            finding_id=finding.id,
                            evidence_span_id=span.id,
                            relation="source",
                        )
                    )
                    findings.append(finding)
                except Exception:
                    finding = Finding(
                        claim_id=claim_id,
                        document_version_id=version.id,
                        block_index=fact_claim.block_index,
                        claim_text=fact_claim.text,
                        claim_sha256=recomputed_hash,
                        dimension="identity",
                        status="unresolved",
                        method="retrieval",
                        reason=f"Statutory provision {unit} {provision} was not located on live legal text provider",
                        limitations=["Live statutory adapter could not confirm provision."],
                        checked_at=datetime.now(UTC),
                        stale_at=None,
                    )
                    db.add(finding)
                    db.flush()
                    findings.append(finding)

            elif fact_claim.kind == "date":
                matching_spans = [
                    (s_id, span, text)
                    for s_id, span, text in all_matter_spans
                    if fact_claim.text.casefold() in text.casefold()
                ]
                if matching_spans:
                    finding = Finding(
                        claim_id=claim_id,
                        document_version_id=version.id,
                        block_index=fact_claim.block_index,
                        claim_text=fact_claim.text,
                        claim_sha256=recomputed_hash,
                        dimension="fact_consistency",
                        status="supported",
                        method="exact",
                        reason="Date matches verified client record passage",
                        limitations=[],
                        checked_at=datetime.now(UTC),
                        stale_at=None,
                    )
                    db.add(finding)
                    db.flush()
                    db.add(
                        FindingEvidence(
                            finding_id=finding.id,
                            evidence_span_id=matching_spans[0][1].id,
                            relation="supports",
                        )
                    )
                    findings.append(finding)
                else:
                    finding = Finding(
                        claim_id=claim_id,
                        document_version_id=version.id,
                        block_index=fact_claim.block_index,
                        claim_text=fact_claim.text,
                        claim_sha256=recomputed_hash,
                        dimension="fact_consistency",
                        status="unresolved",
                        method="retrieval",
                        reason="Date was not located in Matter records",
                        limitations=["Missing lookup returns unresolved, not false."],
                        checked_at=datetime.now(UTC),
                        stale_at=None,
                    )
                    db.add(finding)
                    db.flush()
                    findings.append(finding)

            elif fact_claim.kind == "identifier":
                matching_spans = [
                    (s_id, span, text)
                    for s_id, span, text in all_matter_spans
                    if fact_claim.text.casefold() in text.casefold()
                ]
                if matching_spans:
                    finding = Finding(
                        claim_id=claim_id,
                        document_version_id=version.id,
                        block_index=fact_claim.block_index,
                        claim_text=fact_claim.text,
                        claim_sha256=recomputed_hash,
                        dimension="fact_consistency",
                        status="supported",
                        method="exact",
                        reason="Identifier matches verified client record",
                        limitations=[],
                        checked_at=datetime.now(UTC),
                        stale_at=None,
                    )
                    db.add(finding)
                    db.flush()
                    db.add(
                        FindingEvidence(
                            finding_id=finding.id,
                            evidence_span_id=matching_spans[0][1].id,
                            relation="supports",
                        )
                    )
                    findings.append(finding)
                else:
                    finding = Finding(
                        claim_id=claim_id,
                        document_version_id=version.id,
                        block_index=fact_claim.block_index,
                        claim_text=fact_claim.text,
                        claim_sha256=recomputed_hash,
                        dimension="fact_consistency",
                        status="unresolved",
                        method="retrieval",
                        reason="Identifier was not located in Matter records",
                        limitations=["Missing lookup returns unresolved, not false."],
                        checked_at=datetime.now(UTC),
                        stale_at=None,
                    )
                    db.add(finding)
                    db.flush()
                    findings.append(finding)

            else:
                matching_spans = [
                    (s_id, span, text)
                    for s_id, span, text in all_matter_spans
                    if any(
                        word.casefold() in text.casefold()
                        for word in fact_claim.text.split()
                        if len(word) > 3
                    )
                ]
                if matching_spans:
                    finding = Finding(
                        claim_id=claim_id,
                        document_version_id=version.id,
                        block_index=fact_claim.block_index,
                        claim_text=fact_claim.text,
                        claim_sha256=recomputed_hash,
                        dimension="fact_consistency",
                        status="needs_review",
                        method="retrieval",
                        reason="Relevant client record passage located; requires attorney review",
                        limitations=["Semantic claim requires human review."],
                        checked_at=datetime.now(UTC),
                        stale_at=None,
                    )
                    db.add(finding)
                    db.flush()
                    db.add(
                        FindingEvidence(
                            finding_id=finding.id,
                            evidence_span_id=matching_spans[0][1].id,
                            relation="mentions",
                        )
                    )
                    findings.append(finding)
                else:
                    finding = Finding(
                        claim_id=claim_id,
                        document_version_id=version.id,
                        block_index=fact_claim.block_index,
                        claim_text=fact_claim.text,
                        claim_sha256=recomputed_hash,
                        dimension="fact_consistency",
                        status="unresolved",
                        method="retrieval",
                        reason="No authoritative client records found for this assertion",
                        limitations=["Missing lookup returns unresolved, not false."],
                        checked_at=datetime.now(UTC),
                        stale_at=None,
                    )
                    db.add(finding)
                    db.flush()
                    findings.append(finding)

        db.commit()

        # Handle apply_safe_fixes mode
        source_version_id = version.id
        created_version_id: UUID | None = None
        applied_correction_ids: list[UUID] = []
        blocked_correction_ids: list[UUID] = []

        if request.mode == "apply_safe_fixes":
            safe_candidates = [c for c in correction_candidates if c.safety == "safe"]
            blocked_candidates = [c for c in correction_candidates if c.safety != "safe"]
            blocked_correction_ids = [c.candidate_id for c in blocked_candidates]

            if safe_candidates:
                operations: list[DocumentOperation] = []
                blocks = version.content_json.get("content", [])
                for cand in safe_candidates:
                    claim_obj = claim_model_map.get(cand.claim_id)
                    if claim_obj is None or claim_obj.block_index >= len(blocks):
                        blocked_correction_ids.append(cand.candidate_id)
                        continue
                    block = blocks[claim_obj.block_index]
                    original_text, _ = claim_extractor._extract_text_and_citations(block)
                    if original_text[claim_obj.from_offset : claim_obj.to_offset] != claim_obj.text:
                        blocked_correction_ids.append(cand.candidate_id)
                        continue
                    replacement_block = (
                        original_text[: claim_obj.from_offset]
                        + cand.replacement_text
                        + original_text[claim_obj.to_offset :]
                    )
                    pos = claim_obj.block_id or str(claim_obj.block_index)
                    operations.append(
                        DocumentOperation(
                            type="replace_block",
                            position=pos,
                            text=replacement_block,
                            evidence_span_ids=cand.evidence_span_ids,
                        )
                    )
                    applied_correction_ids.append(cand.candidate_id)

                if not operations:
                    safe_candidates = []

            if safe_candidates:
                new_version = draft_service.propose_document_ops(
                    db=db,
                    matter_id=matter_id,
                    draft_id=draft.id,
                    base_version_id=version.id,
                    operations=operations,
                    change_summary="Fact Reviewer safe automated corrections applied",
                    created_by_id="fact_reviewer",
                )
                created_version_id = new_version.id

                # Invalidate findings on base version and recheck new version
                db.execute(
                    update(Finding)
                    .where(Finding.document_version_id == version.id, Finding.stale_at.is_(None))
                    .values(status="stale", stale_at=datetime.now(UTC))
                )
                db.commit()

                # Re-run check on newly created version
                recheck_response = self.run(
                    db=db,
                    version_id=new_version.id,
                    user_id=user_id,
                    request=FactReviewRunRequest(checks=["fact"], mode="review_only"),
                )
                return FactReviewRunResponse(
                    document_version_id=new_version.id,
                    mode=request.mode,
                    findings=recheck_response.findings,
                    correction_candidates=correction_candidates,
                    source_version_id=source_version_id,
                    created_version_id=created_version_id,
                    applied_correction_ids=applied_correction_ids,
                    blocked_correction_ids=blocked_correction_ids,
                    summary={
                        "supported": sum(
                            1 for f in recheck_response.findings if f.status == "supported"
                        ),
                        "contradicted": sum(
                            1 for f in recheck_response.findings if f.status == "contradicted"
                        ),
                        "unresolved": sum(
                            1 for f in recheck_response.findings if f.status == "unresolved"
                        ),
                        "needs_review": sum(
                            1 for f in recheck_response.findings if f.status == "needs_review"
                        ),
                    },
                )

        # Build FindingResponse list for the current run
        response_findings = self._build_finding_responses(db, findings)
        summary = {
            "supported": sum(1 for f in response_findings if f.status == "supported"),
            "contradicted": sum(1 for f in response_findings if f.status == "contradicted"),
            "unresolved": sum(1 for f in response_findings if f.status == "unresolved"),
            "needs_review": sum(1 for f in response_findings if f.status == "needs_review"),
        }

        return FactReviewRunResponse(
            document_version_id=version.id,
            mode=request.mode,
            findings=response_findings,
            correction_candidates=correction_candidates,
            source_version_id=source_version_id,
            created_version_id=created_version_id,
            applied_correction_ids=applied_correction_ids,
            blocked_correction_ids=blocked_correction_ids,
            summary=summary,
        )

    def _build_finding_responses(
        self, db: Session, findings: list[Finding]
    ) -> list[FactFindingResponse]:
        results: list[FactFindingResponse] = []
        for finding in findings:
            resolution = db.scalar(
                select(FindingResolution)
                .where(FindingResolution.finding_id == finding.id)
                .order_by(FindingResolution.created_at.desc())
            )
            rows = db.execute(
                select(FindingEvidence, EvidenceSpan)
                .join(EvidenceSpan, FindingEvidence.evidence_span_id == EvidenceSpan.id)
                .where(FindingEvidence.finding_id == finding.id)
            ).all()

            evidence_items: list[FindingEvidenceItem] = []
            for link, span in rows:
                page_num = span.page.page_number if span.page else 1
                evidence_items.append(
                    FindingEvidenceItem(
                        evidence_span_id=span.id,
                        source_version_id=span.source_version_id,
                        page_number=page_num,
                        text=span.quoted_text,
                        relation=link.relation,
                    )
                )

            results.append(
                FactFindingResponse(
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
                    evidence=evidence_items,
                    resolution=resolution.action if resolution else None,
                )
            )
        return results


fact_review_service = FactReviewService()
