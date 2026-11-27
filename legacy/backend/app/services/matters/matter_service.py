from uuid import UUID

from sqlalchemy.orm import Session

from app.models.matters import Matter, MatterMember
from app.repositories.matters import MatterRepository
from app.schemas.matters import MatterCreateRequest, MatterUpdateRequest


class MatterService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = MatterRepository(db)

    def create(self, payload: MatterCreateRequest, user_id: UUID) -> Matter:
        try:
            matter = self.repo.create(payload, user_id)
            self.db.commit()
            self.db.refresh(matter)
            return matter
        except Exception:
            self.db.rollback()
            raise

    def update(self, matter: Matter, payload: MatterUpdateRequest) -> Matter:
        try:
            updated = self.repo.update(matter, payload)
            self.db.commit()
            self.db.refresh(updated)
            return updated
        except Exception:
            self.db.rollback()
            raise

    def delete(self, matter: Matter) -> None:
        try:
            self.repo.delete(matter)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise

    def add_member(
        self, matter_id: UUID, user_id: UUID, role: str, created_by: UUID
    ) -> MatterMember:
        try:
            member = self.repo.add_member(matter_id, user_id, role, created_by)
            self.db.commit()
            self.db.refresh(member)
            return member
        except Exception:
            self.db.rollback()
            raise

    def update_member_role(self, member: MatterMember, role: str) -> MatterMember:
        try:
            updated = self.repo.update_member_role(member, role)
            self.db.commit()
            self.db.refresh(updated)
            return updated
        except Exception:
            self.db.rollback()
            raise

    def remove_member(self, member: MatterMember) -> None:
        try:
            self.repo.remove_member(member)
            self.db.commit()
        except Exception:
            self.db.rollback()
            raise
