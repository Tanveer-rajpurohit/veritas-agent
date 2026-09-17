from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.matter import Matter
from app.schemas.matter import MatterCreateRequest


class MatterRepository:
    """Repository handling SQL persistence queries for Matters."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: MatterCreateRequest) -> Matter:
        matter = Matter(
            title=payload.title,
            description=payload.description,
            case_number=payload.case_number,
            court=payload.court,
            matter_type=payload.matter_type,
            stage=payload.stage,
        )
        self.db.add(matter)
        self.db.commit()
        self.db.refresh(matter)
        return matter

    def get_by_id(self, matter_id: UUID) -> Matter | None:
        return self.db.get(Matter, matter_id)

    def list_all(self) -> list[Matter]:
        stmt = select(Matter).order_by(Matter.created_at.desc())
        return list(self.db.scalars(stmt).all())
