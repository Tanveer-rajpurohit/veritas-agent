from uuid import UUID

from sqlalchemy import ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.auth.user import User

__all__ = ["MatterMember", "User"]


class MatterMember(Base):
    __tablename__ = "matter_members"

    matter_id: Mapped[UUID] = mapped_column(
        Uuid, ForeignKey("matters.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("users.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(16), nullable=False)
