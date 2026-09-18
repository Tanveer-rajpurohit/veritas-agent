import hashlib
import re
from datetime import UTC, datetime
from decimal import Decimal
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


def _paragraphs(content: dict) -> list[tuple[int, str, list[str]]]:
    result = []
    for index, block in enumerate(content.get("content", [])):
        if block.get("type") not in {"paragraph", "heading"}:
            continue
        text = "".join(child.get("text", "") for child in block.get("content", []))
        citations = []
        for child in block.get("content", []):
            for mark in child.get("marks", []):
                if mark.get("type") == "citation":
                    citations.append(child.get("text", ""))
            if child.get("type") == "citationRef":
                citations.append(child.get("attrs", {}).get("display", ""))
        if text.strip():
            result.append((index, text.strip(), citations))
    return result


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
        for citation in citations:
            citation_finding = Finding(
                document_version_id=version.id,
                block_index=block_index,
                claim_text=citation,
                claim_sha256=hashlib.sha256(citation.encode()).hexdigest(),
                dimension="identity",
                status="unresolved",
                method="retrieval",
                reason="Citation identity has not been checked against an authoritative source",
                limitations=["No authoritative citation lookup was completed"],
            )
            db.add(citation_finding)
            findings.append(citation_finding)
    db.commit()
    return findings
