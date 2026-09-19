from datetime import UTC, datetime
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.auth.user import User

if TYPE_CHECKING:
    from app.models.matters.matter import Matter

__all__ = ["MatterMember", "User"]


class MatterMember(Base):
    __tablename__ = "matter_members"
    __table_args__ = (
        CheckConstraint(
            "role IN ('owner', 'editor', 'reviewer', 'viewer')",
            name="ck_matter_members_role",
        ),
    )

    matter_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("matters.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    created_by: Mapped[UUID | None] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    matter: Mapped["Matter"] = relationship("Matter", back_populates="members")
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
