import hashlib
import json
import os
import tempfile
import textwrap
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

import boto3
import pymupdf
from botocore.exceptions import ClientError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.reviews import Finding, FindingEvidence, FindingResolution
from app.models.sources import EvidenceSpan, Source


def _validate_export_key(object_key: str) -> None:
    path = Path(object_key)
    if path.name != object_key or path.suffix not in {".pdf", ".json"}:
        raise ValueError("Invalid export key")
    try:
        UUID(path.stem)
    except ValueError:
        raise ValueError("Invalid export key") from None


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
        _validate_export_key(object_key)
        return (self.base_path / object_key).read_bytes()

    def delete(self, object_key: str) -> None:
        _validate_export_key(object_key)
        (self.base_path / object_key).unlink(missing_ok=True)


class S3ExportStorage:
    def __init__(self, client=None) -> None:
        if not settings.MINIO_SECRET_KEY:
            raise ValueError("MINIO_SECRET_KEY is required for S3 export storage")
        self.client = client or boto3.client(
            "s3",
            endpoint_url=settings.MINIO_ENDPOINT,
            aws_access_key_id=settings.MINIO_ACCESS_KEY,
            aws_secret_access_key=settings.MINIO_SECRET_KEY,
            region_name="us-east-1",
        )
        self.bucket = settings.MINIO_EXPORT_BUCKET
        self._bucket_ready = False

    def _ensure_bucket(self) -> None:
        if self._bucket_ready:
            return
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") not in {"404", "NoSuchBucket"}:
                raise
            self.client.create_bucket(Bucket=self.bucket)
        self._bucket_ready = True

    def save(self, export_id: UUID, format: str, content: bytes) -> str:
        self._ensure_bucket()
        object_key = f"{export_id}.{format}"
        self.client.put_object(Bucket=self.bucket, Key=object_key, Body=content)
        return object_key

    def read(self, object_key: str) -> bytes:
        _validate_export_key(object_key)
        return self.client.get_object(Bucket=self.bucket, Key=object_key)["Body"].read()

    def delete(self, object_key: str) -> None:
        _validate_export_key(object_key)
        self.client.delete_object(Bucket=self.bucket, Key=object_key)


if settings.EXPORT_STORAGE_BACKEND == "s3":
    export_storage = S3ExportStorage()
elif settings.EXPORT_STORAGE_BACKEND == "local":
    export_storage = ExportStorage()
else:
    raise ValueError("EXPORT_STORAGE_BACKEND must be 'local' or 's3'")


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
