from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Matter(Base):
    __tablename__ = "matters"

    id: Mapped[UUID] = mapped_column(Uuid, primary_key=True, default=uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    case_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    court: Mapped[str | None] = mapped_column(String(255), nullable=True)
    matter_type: Mapped[str] = mapped_column(
        String(100), default="Insolvency (IBC)", nullable=False
    )
    stage: Mapped[str] = mapped_column(String(100), default="Drafting", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
