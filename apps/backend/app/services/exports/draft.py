import hashlib
import json
import os
import tempfile
import textwrap
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

import pymupdf
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.reviews import Finding, FindingEvidence, FindingResolution
from app.models.sources import EvidenceSpan, Source


class ExportStorage:
    def __init__(self) -> None:
        self.base_path = Path(settings.EXPORT_STORAGE_PATH).resolve()

    def save(self, export_id: UUID, format: str, content: bytes) -> str:
        self.base_path.mkdir(parents=True, exist_ok=True)
        name = f"{export_id}.{format}"
        descriptor, temporary = tempfile.mkstemp(dir=self.base_path, prefix=".export-")
        try:
            with os.fdopen(descriptor, "wb") as output:
                output.write(content)
                output.flush()
                os.fsync(output.fileno())
            Path(temporary).replace(self.base_path / name)
        except Exception:
            Path(temporary).unlink(missing_ok=True)
            raise
        return name

    def read(self, object_key: str) -> bytes:
        if Path(object_key).name != object_key:
            raise ValueError("Invalid export key")
        return (self.base_path / object_key).read_bytes()

    def delete(self, object_key: str) -> None:
        if Path(object_key).name != object_key:
            raise ValueError("Invalid export key")
        (self.base_path / object_key).unlink(missing_ok=True)


export_storage = ExportStorage()


def build_package(db: Session, draft, version) -> dict:
    sources = db.scalars(select(Source).where(Source.matter_id == draft.matter_id)).all()
    manifest = []
    for source in sources:
        if not source.versions:
            continue
        latest = max(source.versions, key=lambda item: item.version_number)
        manifest.append(
            {
                "id": str(source.id),
                "name": source.canonical_title,
                "version_id": str(latest.id),
                "version": latest.version_number,
                "sha256": latest.file_sha256,
                "synthetic": source.is_synthetic,
            }
        )
    findings = db.scalars(select(Finding).where(Finding.document_version_id == version.id)).all()
    finding_items = []
    for finding in findings:
        links = db.execute(
            select(FindingEvidence, EvidenceSpan)
            .join(EvidenceSpan, FindingEvidence.evidence_span_id == EvidenceSpan.id)
            .where(FindingEvidence.finding_id == finding.id)
        ).all()
        resolution = db.scalar(
            select(FindingResolution)
            .where(FindingResolution.finding_id == finding.id)
            .order_by(FindingResolution.created_at.desc())
        )
        finding_items.append(
            {
                "id": str(finding.id),
                "claim_sha256": finding.claim_sha256,
                "dimension": finding.dimension,
                "status": finding.status,
                "method": finding.method,
                "reason": finding.reason,
                "limitations": finding.limitations,
                "checked_at": finding.checked_at.isoformat(),
                "resolution": {"action": resolution.action, "reason": resolution.reason}
                if resolution
                else None,
                "evidence": [
                    {
                        "span_id": str(span.id),
                        "source_version_id": str(span.source_version_id),
                        "page_id": str(span.page_id),
                        "start_offset": span.start_offset,
                        "end_offset": span.end_offset,
                        "text": span.quoted_text,
                        "relation": link.relation,
                    }
                    for link, span in links
                ],
            }
        )
    return {
        "format": "veritas-document",
        "format_version": 1,
        "document": {
            "id": str(draft.id),
            "title": draft.title,
            "version_id": str(version.id),
            "version": version.version_no,
            "sha256": version.content_sha256,
            "content": version.content_json,
        },
        "sources": manifest,
        "findings": finding_items,
        "review": {"state": "review_needed", "approved_by": None},
        "generated_at": datetime.now(UTC).isoformat(),
    }


def _blocks(content: dict) -> list[str]:
    lines = []

    def text(node: dict) -> str:
        if node.get("type") == "text":
            return node.get("text", "")
        return "".join(text(child) for child in node.get("content", []))

    for block in content.get("content", []):
        value = text(block).strip()
        if value:
            lines.append(value)
    return lines


def render_pdf(package: dict) -> bytes:
    document = pymupdf.open()
    title = package["document"]["title"]
    lines = ["WORKING DRAFT - REQUIRES PROFESSIONAL REVIEW"]
    lines.extend(textwrap.wrap(title, width=88))
    lines.append("")
    for block in _blocks(package["document"]["content"]):
        lines.extend(textwrap.wrap(block.replace("\u20b9", "INR "), width=88) or [""])
        lines.append("")
    lines.extend(["Review findings", ""])
    findings = package["findings"]
    if not findings:
        lines.append("No review checks have been recorded for this version.")
    for finding in findings:
        summary = f"{finding['dimension']}: {finding['status']} - {finding['reason']}"
        lines.extend(textwrap.wrap(summary, width=88))
        for evidence in finding["evidence"]:
            lines.extend(textwrap.wrap(f"Source passage: {evidence['text']}", width=88))
        lines.append("")
    lines.append(
        f"Document version {package['document']['version']} | Generated {package['generated_at']}"
    )

    page = None
    y = 0
    for line in lines:
        if page is None or y > 785:
            page = document.new_page(width=595, height=842)
            y = 55
            page.insert_text(
                (48, 820),
                "WORKING DRAFT - REQUIRES PROFESSIONAL REVIEW",
                fontsize=8,
                fontname="helv",
            )
        if line:
            page.insert_text((48, y), line, fontsize=10, fontname="helv")
        y += 15
    content = document.tobytes(garbage=4, deflate=True)
    document.close()
    return content


def serialize_json(package: dict) -> bytes:
    return json.dumps(package, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def checksum(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()
