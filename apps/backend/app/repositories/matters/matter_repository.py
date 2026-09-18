from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.matters import Matter, MatterMember
from app.schemas.matters import MatterCreateRequest, MatterUpdateRequest


class MatterRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: MatterCreateRequest, user_id: UUID) -> Matter:
        matter = Matter(
            title=payload.title,
            description=payload.description,
            case_number=payload.case_number,
            court=payload.court,
            matter_type=payload.matter_type,
            stage=payload.stage,
        )
        self.db.add(matter)
        self.db.flush()
        self.db.add(MatterMember(matter_id=matter.id, user_id=user_id, role="owner"))
        self.db.commit()
        self.db.refresh(matter)
        return matter

    def get_by_id(self, matter_id: UUID, user_id: UUID) -> Matter | None:
        return self.db.scalar(
            select(Matter)
            .join(MatterMember)
            .where(Matter.id == matter_id, MatterMember.user_id == user_id)
        )

    def list_all(self, user_id: UUID) -> list[Matter]:
        stmt = (
            select(Matter)
            .join(MatterMember)
            .where(MatterMember.user_id == user_id)
            .order_by(Matter.created_at.desc())
        )
        return list(self.db.scalars(stmt).all())

    def update(self, matter: Matter, payload: MatterUpdateRequest) -> Matter:
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(matter, field, value)
        self.db.commit()
        self.db.refresh(matter)
        return matter

    def delete(self, matter: Matter) -> None:
        self.db.delete(matter)
        self.db.commit()
