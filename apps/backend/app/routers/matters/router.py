from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, status

from app.schemas.matter import MatterCreateRequest, MatterResponse

router = APIRouter(
    prefix="/api/v1/matters",
    tags=["Matters"],
)

_MATTERS_STORE: dict[UUID, dict] = {}


@router.post("/", response_model=MatterResponse, status_code=status.HTTP_201_CREATED)
async def create_matter(payload: MatterCreateRequest) -> dict:
    now = datetime.now(UTC)
    matter_id = uuid4()

    record = {
        "id": matter_id,
        "title": payload.title,
        "description": payload.description,
        "court": payload.court,
        "case_number": payload.case_number,
        "matter_type": payload.matter_type,
        "stage": payload.stage,
        "created_at": now,
        "updated_at": now,
    }

    _MATTERS_STORE[matter_id] = record
    return record


@router.get("/", response_model=list[MatterResponse])
async def get_matters():
    return list(_MATTERS_STORE.values())


@router.get("/{matter_id}", response_model=MatterResponse)
async def get_matter(matter_id: UUID):
    if matter_id not in _MATTERS_STORE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matter not found")
    return _MATTERS_STORE[matter_id]
