from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.db.session import get_db
from app.dependencies.matter import require_matter_role
from app.models.auth import User
from app.models.matters import Matter, MatterMember
from app.repositories.matters import MatterRepository
from app.schemas.matters import (
    AddMemberRequest,
    MatterCreateRequest,
    MatterMemberResponse,
    MatterResponse,
    MatterUpdateRequest,
    UpdateMemberRequest,
)
from app.services.matters import MatterService

router = APIRouter(
    prefix="/api/v1/matters",
    tags=["Matters"],
)

DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]


@router.post("/", response_model=MatterResponse, status_code=status.HTTP_201_CREATED)
async def create_matter(
    payload: MatterCreateRequest,
    db: DbSession,
    user: CurrentUser,
) -> Matter:
    """Create a new legal matter and assign owner membership in one transaction."""
    matter = MatterService(db).create(payload, user.id)
    matter.role = "owner"
    return matter


@router.get("/", response_model=list[MatterResponse])
async def get_matters(db: DbSession, user: CurrentUser) -> list[Matter]:
    """List all legal matters where the user is a member."""
    repo = MatterRepository(db)
    return repo.list_all(user.id)


@router.get("/{matter_id}", response_model=MatterResponse)
async def get_matter(
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("viewer"))],
) -> Matter:
    """Get a single matter by its UUID for authorized members."""
    matter, membership = auth_data
    matter.role = membership.role
    return matter


@router.patch("/{matter_id}", response_model=MatterResponse)
async def update_matter(
    payload: MatterUpdateRequest,
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("editor"))],
    db: DbSession,
) -> Matter:
    """Update fields of an existing matter (requires editor or owner role)."""
    matter, membership = auth_data
    updated = MatterService(db).update(matter, payload)
    updated.role = membership.role
    return updated


@router.delete("/{matter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_matter(
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("owner"))],
    db: DbSession,
) -> None:
    """Delete an existing matter (requires owner role)."""
    matter, _ = auth_data
    MatterService(db).delete(matter)


@router.get("/{matter_id}/members", response_model=list[MatterMemberResponse])
async def list_matter_members(
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("owner"))],
    db: DbSession,
) -> list[MatterMemberResponse]:
    """List members for owner management."""
    matter, _ = auth_data
    repo = MatterRepository(db)
    members_and_users = repo.list_members(matter.id)
    return [
        MatterMemberResponse(
            matter_id=m.matter_id,
            user_id=m.user_id,
            role=m.role,
            email=u.email,
            created_at=m.created_at,
            created_by=m.created_by,
        )
        for m, u in members_and_users
    ]


@router.post(
    "/{matter_id}/members",
    response_model=MatterMemberResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_matter_member(
    payload: AddMemberRequest,
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("owner"))],
    db: DbSession,
    current_user_obj: CurrentUser,
) -> MatterMemberResponse:
    """Add a member to the matter (requires owner role)."""
    matter, _ = auth_data
    repo = MatterRepository(db)

    target_user: User | None = None
    if payload.user_id:
        target_user = db.get(User, payload.user_id)
    elif payload.email:
        target_user = db.scalar(select(User).where(User.email == payload.email))

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    existing = repo.get_member(matter.id, target_user.id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this matter",
        )

    new_member = MatterService(db).add_member(
        matter_id=matter.id,
        user_id=target_user.id,
        role=payload.role,
        created_by=current_user_obj.id,
    )
    return MatterMemberResponse(
        matter_id=new_member.matter_id,
        user_id=new_member.user_id,
        role=new_member.role,
        email=target_user.email,
        created_at=new_member.created_at,
        created_by=new_member.created_by,
    )


@router.patch("/{matter_id}/members/{user_id}", response_model=MatterMemberResponse)
async def update_matter_member_role(
    user_id: UUID,
    payload: UpdateMemberRequest,
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("owner"))],
    db: DbSession,
) -> MatterMemberResponse:
    """Update a member's role (requires owner role)."""
    matter, _ = auth_data
    repo = MatterRepository(db)
    member = repo.get_member(matter.id, user_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in matter",
        )

    target_user = db.get(User, user_id)
    try:
        updated_member = MatterService(db).update_member_role(member, payload.role)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None

    return MatterMemberResponse(
        matter_id=updated_member.matter_id,
        user_id=updated_member.user_id,
        role=updated_member.role,
        email=target_user.email if target_user else None,
        created_at=updated_member.created_at,
        created_by=updated_member.created_by,
    )


@router.delete("/{matter_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_matter_member(
    user_id: UUID,
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("owner"))],
    db: DbSession,
) -> None:
    """Remove a member from the matter (requires owner role)."""
    matter, _ = auth_data
    repo = MatterRepository(db)
    member = repo.get_member(matter.id, user_id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in matter",
        )

    try:
        MatterService(db).remove_member(member)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from None
