import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.sources.evidence import EvidenceSpan
    from app.models.sources.page import SourcePage
    from app.models.sources.source import SourceVersion


class SourceChunk(Base):
    """
    Bounded, page-aware text chunk with dense vector embedding for semantic search.
    """

    __tablename__ = "source_chunks"

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
    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    start_offset: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    end_offset: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    token_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    heading_path: Mapped[list[str] | None] = mapped_column(
        JSON().with_variant(ARRAY(String), "postgresql"),
        nullable=True,
    )
    embedding_model: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(settings.EMBEDDING_DIMENSION),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC),
        server_default=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("source_version_id", "chunk_index", name="uq_source_chunk_index"),
    )

    source_version: Mapped["SourceVersion"] = relationship(
        "SourceVersion",
        back_populates="chunks",
    )
    page: Mapped["SourcePage | None"] = relationship(
        "SourcePage",
        back_populates="chunks",
    )
    evidence_spans: Mapped[list["EvidenceSpan"]] = relationship(
        "EvidenceSpan",
        back_populates="chunk",
    )
