import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.sources.chunk import SourceChunk
    from app.models.sources.page import SourcePage
    from app.models.sources.source import SourceVersion


class EvidenceSpan(Base):
    """
    Exact quoted text span linked directly to an underlying chunk and page,
    providing auditable provenance for Writer Agent claims.
    """
    __tablename__ = "evidence_spans"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    source_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("source_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("source_pages.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    chunk_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("source_chunks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    start_offset: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    end_offset: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    quoted_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    quoted_text_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    created_by: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        comment="writer_agent, user, evaluator, etc.",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        server_default=text("now()"),
    )

    source_version: Mapped["SourceVersion"] = relationship(
        "SourceVersion",
        back_populates="evidence_spans",
    )
    page: Mapped["SourcePage | None"] = relationship(
        "SourcePage",
    )
    chunk: Mapped["SourceChunk | None"] = relationship(
        "SourceChunk",
        back_populates="evidence_spans",
    )
