import uuid
from datetime import date, datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.sources.chunk import SourceChunk
    from app.models.sources.evidence import EvidenceSpan
    from app.models.sources.page import SourcePage


class Source(Base):
    """
    Top-level logical record for an evidence source or legal corpus item.
    Represents documents, statutes, judgments, or synthetic test fixtures.
    """
    __tablename__ = "sources"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    matter_id: Mapped[uuid.UUID | None] = mapped_column(
        index=True,
        nullable=True,
        comment="Matter ID scoping all uploaded documents and drafts",
    )
    source_type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="client_record, statute, rule, form, judgment, synthetic_fixture",
    )
    canonical_title: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )
    authority_level: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        comment="matter_evidence, official_primary, curated_primary, discovery_only",
    )
    court: Mapped[str | None] = mapped_column(
        String(256),
        nullable=True,
    )
    case_number: Mapped[str | None] = mapped_column(
        String(256),
        nullable=True,
    )
    neutral_citation: Mapped[str | None] = mapped_column(
        String(256),
        nullable=True,
    )
    decision_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True,
    )
    official_url: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    confidentiality: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="private",
        server_default=text("'private'"),
    )
    is_synthetic: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )

    versions: Mapped[list["SourceVersion"]] = relationship(
        "SourceVersion",
        back_populates="source",
        cascade="all, delete-orphan",
        order_by="SourceVersion.version_number",
    )


class SourceVersion(Base):
    """
    Immutable file capture for a source. A re-uploaded or modified document
    creates a new version, never overwriting historical extraction.
    """
    __tablename__ = "source_versions"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    source_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("sources.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    object_key: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Local path or S3 storage key",
    )
    mime_type: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )
    file_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )
    extraction_method: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment="pymupdf, pdfplumber, textract, etc.",
    )
    extraction_version: Mapped[str | None] = mapped_column(
        String(32),
        nullable=True,
    )
    extraction_status: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="pending",
        server_default=text("'pending'"),
        comment="pending, processing, completed, failed",
    )
    page_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    reviewed_by_human: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=text("false"),
    )
    provenance_note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )

    __table_args__ = (
        UniqueConstraint("source_id", "version_number", name="uq_source_version_number"),
    )

    source: Mapped["Source"] = relationship(
        "Source",
        back_populates="versions",
    )
    pages: Mapped[list["SourcePage"]] = relationship(
        "SourcePage",
        back_populates="source_version",
        cascade="all, delete-orphan",
        order_by="SourcePage.page_number",
    )
    chunks: Mapped[list["SourceChunk"]] = relationship(
        "SourceChunk",
        back_populates="source_version",
        cascade="all, delete-orphan",
        order_by="SourceChunk.chunk_index",
    )
    evidence_spans: Mapped[list["EvidenceSpan"]] = relationship(
        "EvidenceSpan",
        back_populates="source_version",
        cascade="all, delete-orphan",
    )
