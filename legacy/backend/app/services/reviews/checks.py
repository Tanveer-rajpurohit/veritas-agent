import hashlib
import re
from datetime import UTC, datetime
from decimal import Decimal
from difflib import SequenceMatcher
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.reviews import Finding, FindingEvidence
from app.models.sources import EvidenceSpan, Source

AMOUNT = re.compile(r"(?:\u20b9|INR|Rs\.?)[\s]*([\d,]+(?:\.\d+)?)\s*(lakh|crore)?", re.IGNORECASE)
MULTIPLIER = {None: Decimal(1), "lakh": Decimal(100000), "crore": Decimal(10000000)}


def _amounts(text: str) -> set[Decimal]:
    return {
        Decimal(match.group(1).replace(",", ""))
        * MULTIPLIER[match.group(2).lower() if match.group(2) else None]
        for match in AMOUNT.finditer(text)
    }


def _paragraphs(content: dict) -> list[tuple[int, str, list[tuple[str, str | None]]]]:
    result = []
    for index, block in enumerate(content.get("content", [])):
        if block.get("type") not in {"paragraph", "heading"}:
            continue
        text_parts = []
        for child in block.get("content", []):
            if child.get("type") == "text":
                text_parts.append(child.get("text", ""))
            elif child.get("type") == "citationRef":
                text_parts.append(child.get("attrs", {}).get("display", ""))
        text = "".join(text_parts)
        citations = []
        for child in block.get("content", []):
            for mark in child.get("marks", []):
                if mark.get("type") == "citation":
                    citations.append((child.get("text", ""), mark.get("attrs", {}).get("quote")))
            if child.get("type") == "citationRef":
                attrs = child.get("attrs", {})
                citations.append((attrs.get("display", ""), attrs.get("quote")))
        if text.strip():
            result.append((index, text.strip(), citations))
    return result


def _normalized(text: str) -> str:
    return " ".join(text.split()).casefold()


def _legal_citation(db: Session, display: str) -> tuple[Source | None, EvidenceSpan | None]:
    if not display.strip():
        return None, None
    sources = db.scalars(
        select(Source).where(
            Source.matter_id.is_(None),
            Source.source_type.in_(["judgment", "statute"]),
            Source.authority_level.in_(["official_primary", "curated_primary"]),
        )
    ).all()
    for source in sources:
        names = [source.canonical_title, source.neutral_citation]
        if _normalized(display) not in {_normalized(name) for name in names if name}:
            continue
        if source.versions:
            latest = max(source.versions, key=lambda item: item.version_number)
            if latest.evidence_spans:
                return source, latest.evidence_spans[0]
    return None, None


def _quote_status(quote: str, source_text: str) -> tuple[str, str]:
    wanted = _normalized(quote)
    if wanted in _normalized(source_text):
        return "supported", "Quote matches the stored source passage"
    sentences = re.split(r"(?<=[.!?])\s+", source_text)
    if len(wanted) >= 20 and any(
        SequenceMatcher(None, wanted, _normalized(sentence)).ratio() >= 0.9
        for sentence in sentences
    ):
        return "contradicted", "A close stored passage uses different wording"
    return "unresolved", "Quote was not located in the selected source passage"


def check_citations(db: Session, version) -> list[Finding]:
    """Check citation identity and quotation without claiming legal support or currency."""
    db.execute(
        update(Finding)
        .where(
            Finding.document_version_id == version.id,
            Finding.dimension.in_(("identity", "quotation", "support", "treatment")),
            Finding.stale_at.is_(None),
        )
        .values(status="stale", stale_at=datetime.now(UTC))
    )
    findings: list[Finding] = []
    for block_index, _text, citations in _paragraphs(version.content_json):
        for citation, quote in citations:
            source, legal_span = _legal_citation(db, citation)
            identified = source is not None and legal_span is not None
            identity = Finding(
                document_version_id=version.id,
                block_index=block_index,
                claim_text=citation,
                claim_sha256=hashlib.sha256(citation.encode()).hexdigest(),
                dimension="identity",
                status="supported" if identified else "unresolved",
                method="exact" if identified else "retrieval",
                reason=(
                    "Citation matches stored legal-source identity fields"
                    if identified
                    else "Citation identity was not found in the curated legal sources"
                ),
                limitations=[
                    "Identity does not establish proposition support or current treatment"
                ],
            )
            db.add(identity)
            db.flush()
            if identified:
                db.add(
                    FindingEvidence(
                        finding_id=identity.id,
                        evidence_span_id=legal_span.id,
                        relation="source",
                    )
                )
            findings.append(identity)

            if isinstance(quote, str) and quote.strip():
                status, reason = (
                    _quote_status(quote, legal_span.quoted_text)
                    if identified
                    else (
                        "unresolved",
                        "Citation identity is unresolved, so the quote cannot be checked",
                    )
                )
                quotation = Finding(
                    document_version_id=version.id,
                    block_index=block_index,
                    claim_text=quote,
                    claim_sha256=hashlib.sha256(quote.encode()).hexdigest(),
                    dimension="quotation",
                    status=status,
                    method="normalized" if identified else "retrieval",
                    reason=reason,
                    limitations=["Compared only with the stored source text"],
                )
                db.add(quotation)
                db.flush()
                if identified:
                    db.add(
                        FindingEvidence(
                            finding_id=quotation.id,
                            evidence_span_id=legal_span.id,
                            relation="source",
                        )
                    )
                findings.append(quotation)

            for dimension, reason in (
                (
                    "support",
                    "A lawyer must confirm that the passage supports the draft proposition",
                ),
                (
                    "treatment",
                    "Later judicial treatment has not been checked from an authoritative source",
                ),
            ):
                finding = Finding(
                    document_version_id=version.id,
                    block_index=block_index,
                    claim_text=citation,
                    claim_sha256=hashlib.sha256(citation.encode()).hexdigest(),
                    dimension=dimension,
                    status="needs_review" if identified else "unresolved",
                    method="retrieval",
                    reason=reason,
                    limitations=["No automated legal conclusion is made"],
                )
                db.add(finding)
                db.flush()
                findings.append(finding)
    db.commit()
    return findings


def check_version(db: Session, version, matter_id: UUID) -> list[Finding]:
    db.execute(
        update(Finding)
        .where(Finding.document_version_id == version.id, Finding.stale_at.is_(None))
        .values(status="stale", stale_at=datetime.now(UTC))
    )
    sources = db.scalars(select(Source).where(Source.matter_id == matter_id)).all()
    evidence: dict[Decimal, list[tuple[UUID, EvidenceSpan]]] = {}
    for source in sources:
        if not source.versions:
            continue
        latest = max(source.versions, key=lambda item: item.version_number)
        for chunk in latest.chunks:
            amounts = _amounts(chunk.text)
            if not amounts or chunk.page is None:
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
            for amount in amounts:
                evidence.setdefault(amount, []).append((source.id, span))

    findings = []
    for block_index, text, citations in _paragraphs(version.content_json):
        claim_hash = hashlib.sha256(text.encode()).hexdigest()
        claim_amounts = _amounts(text)
        source_ids = {source_id for spans in evidence.values() for source_id, _ in spans}
        conflicting = (
            len(evidence) > 1 and len(source_ids) > 1 and bool(claim_amounts & evidence.keys())
        )
        finding = Finding(
            document_version_id=version.id,
            block_index=block_index,
            claim_text=text,
            claim_sha256=claim_hash,
            dimension="fact_consistency",
            status="contradicted" if conflicting else "needs_review",
            method="exact" if conflicting else "retrieval",
            reason="Matter records contain conflicting amounts"
            if conflicting
            else "No complete factual assessment is available",
            limitations=[]
            if conflicting
            else ["This check does not establish that a client record is true"],
        )
        db.add(finding)
        db.flush()
        if conflicting:
            span_relations: dict[UUID, tuple[EvidenceSpan, str]] = {}
            for amount, spans in evidence.items():
                for _, span in spans:
                    relation = "supports" if amount in claim_amounts else "contradicts"
                    if span.id not in span_relations or relation == "supports":
                        span_relations[span.id] = (span, relation)
            for span, relation in span_relations.values():
                db.add(
                    FindingEvidence(
                        finding_id=finding.id,
                        evidence_span_id=span.id,
                        relation=relation,
                    )
                )
        findings.append(finding)
        for citation, quote in citations:
            source, legal_span = _legal_citation(db, citation)
            identified = source is not None and legal_span is not None
            citation_finding = Finding(
                document_version_id=version.id,
                block_index=block_index,
                claim_text=citation,
                claim_sha256=hashlib.sha256(citation.encode()).hexdigest(),
                dimension="identity",
                status="supported" if identified else "unresolved",
                method="exact" if identified else "retrieval",
                reason="Citation matches stored legal source metadata"
                if identified
                else "Citation identity was not found in the curated legal sources",
                limitations=["Current legal treatment was not checked"],
            )
            db.add(citation_finding)
            db.flush()
            if identified:
                db.add(
                    FindingEvidence(
                        finding_id=citation_finding.id,
                        evidence_span_id=legal_span.id,
                        relation="source",
                    )
                )
            findings.append(citation_finding)
            if isinstance(quote, str) and quote.strip():
                status, reason = (
                    _quote_status(quote, legal_span.quoted_text)
                    if identified
                    else (
                        "unresolved",
                        "Citation identity is unresolved, so the quote cannot be checked",
                    )
                )
                quote_finding = Finding(
                    document_version_id=version.id,
                    block_index=block_index,
                    claim_text=quote,
                    claim_sha256=hashlib.sha256(quote.encode()).hexdigest(),
                    dimension="quotation",
                    status=status,
                    method="normalized" if identified else "retrieval",
                    reason=reason,
                    limitations=["Only the selected stored source passage was compared"],
                )
                db.add(quote_finding)
                db.flush()
                if identified:
                    db.add(
                        FindingEvidence(
                            finding_id=quote_finding.id,
                            evidence_span_id=legal_span.id,
                            relation="source",
                        )
                    )
                findings.append(quote_finding)
    db.commit()
    return findings
