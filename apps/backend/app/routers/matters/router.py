from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.matter import Matter
from app.repositories.matter_repository import MatterRepository
from app.schemas.matter import MatterCreateRequest, MatterResponse, MatterUpdateRequest

router = APIRouter(
    prefix="/api/v1/matters",
    tags=["Matters"],
)

DbSession = Annotated[Session, Depends(get_db)]


@router.post("/", response_model=MatterResponse, status_code=status.HTTP_201_CREATED)
async def create_matter(
    payload: MatterCreateRequest,
    db: DbSession,
) -> Matter:
    """Create a new legal matter."""
    repo = MatterRepository(db)
    return repo.create(payload)


@router.get("/", response_model=list[MatterResponse])
async def get_matters(db: DbSession) -> list[Matter]:
    """List all legal matters."""
    repo = MatterRepository(db)
    return repo.list_all()


@router.get("/{matter_id}", response_model=MatterResponse)
async def get_matter(
    matter_id: UUID,
    db: DbSession,
) -> Matter:
    """Get a single matter by its UUID."""
    repo = MatterRepository(db)
    matter = repo.get_by_id(matter_id)
    if not matter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matter not found")
    return matter


@router.patch("/{matter_id}", response_model=MatterResponse)
async def update_matter(
    matter_id: UUID,
    payload: MatterUpdateRequest,
    db: DbSession,
) -> Matter:
    """Update fields of an existing matter."""
    repo = MatterRepository(db)
    matter = repo.get_by_id(matter_id)
    if not matter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matter not found")
    return repo.update(matter, payload)


@router.delete("/{matter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_matter(
    matter_id: UUID,
    db: DbSession,
) -> None:
    """Delete an existing matter."""
    repo = MatterRepository(db)
    matter = repo.get_by_id(matter_id)
    if not matter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matter not found")
    repo.delete(matter)
