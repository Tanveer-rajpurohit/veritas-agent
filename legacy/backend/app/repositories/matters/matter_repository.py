from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auth import User
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
            created_by=user_id,
        )
        self.db.add(matter)
        self.db.flush()
        member = MatterMember(
            matter_id=matter.id,
            user_id=user_id,
            role="owner",
            created_by=user_id,
        )
        self.db.add(member)
        return matter

    def get_by_id(self, matter_id: UUID, user_id: UUID) -> Matter | None:
        return self.db.scalar(
            select(Matter)
            .join(MatterMember, MatterMember.matter_id == Matter.id)
            .where(Matter.id == matter_id, MatterMember.user_id == user_id)
        )

    def get_with_membership(
        self, matter_id: UUID, user_id: UUID
    ) -> tuple[Matter, MatterMember] | None:
        stmt = (
            select(Matter, MatterMember)
            .join(MatterMember, MatterMember.matter_id == Matter.id)
            .where(Matter.id == matter_id, MatterMember.user_id == user_id)
        )
        row = self.db.execute(stmt).first()
        if row is None:
            return None
        return row.Matter, row.MatterMember

    def list_all(self, user_id: UUID) -> list[Matter]:
        stmt = (
            select(Matter, MatterMember.role)
            .join(MatterMember, MatterMember.matter_id == Matter.id)
            .where(MatterMember.user_id == user_id)
            .order_by(Matter.created_at.desc())
        )
        rows = self.db.execute(stmt).all()
        result = []
        for matter, role in rows:
            matter.role = role
            result.append(matter)
        return result

    def update(self, matter: Matter, payload: MatterUpdateRequest) -> Matter:
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(matter, field, value)
        return matter

    def delete(self, matter: Matter) -> None:
        self.db.delete(matter)

    def list_members(self, matter_id: UUID) -> list[tuple[MatterMember, User]]:
        stmt = (
            select(MatterMember, User)
            .join(User, User.id == MatterMember.user_id)
            .where(MatterMember.matter_id == matter_id)
            .order_by(MatterMember.created_at.asc())
        )
        return list(self.db.execute(stmt).all())

    def get_member(self, matter_id: UUID, user_id: UUID) -> MatterMember | None:
        return self.db.scalar(
            select(MatterMember).where(
                MatterMember.matter_id == matter_id,
                MatterMember.user_id == user_id,
            )
        )

    def add_member(
        self, matter_id: UUID, user_id: UUID, role: str, created_by: UUID
    ) -> MatterMember:
        member = MatterMember(
            matter_id=matter_id,
            user_id=user_id,
            role=role,
            created_by=created_by,
        )
        self.db.add(member)
        return member

    def _owner_count_for_update(self, matter_id: UUID) -> int:
        owners = self.db.scalars(
            select(MatterMember)
            .where(MatterMember.matter_id == matter_id, MatterMember.role == "owner")
            .with_for_update()
        ).all()
        return len(owners)

    def update_member_role(self, member: MatterMember, role: str) -> MatterMember:
        if (
            member.role == "owner"
            and role != "owner"
            and self._owner_count_for_update(member.matter_id) <= 1
        ):
            raise ValueError("Cannot demote the last owner of a matter")
        member.role = role
        self.db.add(member)
        return member

    def remove_member(self, member: MatterMember) -> None:
        if member.role == "owner" and self._owner_count_for_update(member.matter_id) <= 1:
            raise ValueError("Cannot remove the last owner of a matter")
        self.db.delete(member)
