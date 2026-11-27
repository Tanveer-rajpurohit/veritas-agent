from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.drafts.draft import Draft


class DocumentVersion(Base):
    """
    Immutable document version capturing the full editor state and cryptographic hash.
    Conforms to the specification in docs/build plan/database.md.
    """

    __tablename__ = "document_versions"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    draft_id: Mapped[UUID] = mapped_column(
        Uuid,
        ForeignKey("drafts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    version_no: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    parent_version_id: Mapped[UUID | None] = mapped_column(
        Uuid,
        ForeignKey("document_versions.id", ondelete="SET NULL"),
        nullable=True,
    )
    content_json: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
    )
    content_sha256: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    schema_version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    created_by_type: Mapped[str] = mapped_column(
        String(32),
        default="agent",
        nullable=False,
    )
    created_by_id: Mapped[str] = mapped_column(
        String(128),
        default="writer_agent",
        nullable=False,
    )
    change_summary: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    __table_args__ = (UniqueConstraint("draft_id", "version_no", name="uq_draft_version_no"),)

    draft: Mapped["Draft"] = relationship(
        "Draft",
        back_populates="versions",
    )
    parent_version: Mapped["DocumentVersion | None"] = relationship(
        "DocumentVersion",
        remote_side=[id],
    )
