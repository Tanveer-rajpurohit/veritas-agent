import uuid
from typing import TYPE_CHECKING

from sqlalchemy import (
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.sources.chunk import SourceChunk
    from app.models.sources.source import SourceVersion


class SourcePage(Base):
    """
    Page-level extraction data retaining bounding dimensions and verbatim text.
    """
    __tablename__ = "source_pages"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
    )
    source_version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("source_versions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    text_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    extraction_confidence: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    width_points: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )
    height_points: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("source_version_id", "page_number", name="uq_source_page_number"),
    )

    # Relationships
    source_version: Mapped["SourceVersion"] = relationship(
        "SourceVersion",
        back_populates="pages",
    )
    chunks: Mapped[list["SourceChunk"]] = relationship(
        "SourceChunk",
        back_populates="page",
    )
