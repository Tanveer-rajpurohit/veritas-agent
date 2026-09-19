from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    document_version_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("document_versions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    block_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    block_index: Mapped[int] = mapped_column(Integer, nullable=False)
    from_offset: Mapped[int] = mapped_column(Integer, nullable=False)
    to_offset: Mapped[int] = mapped_column(Integer, nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    claim_sha256: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    __table_args__ = (
        UniqueConstraint(
            "document_version_id",
            "block_index",
            "from_offset",
            "to_offset",
            "claim_sha256",
            name="uq_claim_version_location_hash",
        ),
    )
