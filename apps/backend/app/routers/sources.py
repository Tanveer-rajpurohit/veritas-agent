from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.db.session import get_db
from app.models.matters import User
from app.models.sources import Source, SourcePage, SourceVersion
from app.repositories.matters import MatterRepository
from app.services.sources.pipeline import ingestion_pipeline

router = APIRouter(prefix="/api/v1", tags=["Sources"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


class SourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    matter_id: UUID
    canonical_title: str
    source_type: str
    is_synthetic: bool
    version_id: UUID
    version_number: int
    extraction_status: str
    page_count: int | None


class PageResponse(BaseModel):
    source_id: UUID
    source_version_id: UUID
    page_number: int
    text: str
    extraction_confidence: float | None


def _owned_matter(db: Session, matter_id: UUID, user_id: UUID) -> None:
    if MatterRepository(db).get_by_id(matter_id, user_id) is None:
        raise HTTPException(status_code=404, detail="Matter not found")


def _source_version(db: Session, source_id: UUID, user_id: UUID) -> tuple[Source, SourceVersion]:
    row = db.execute(
        select(Source, SourceVersion)
        .join(SourceVersion, SourceVersion.source_id == Source.id)
        .where(Source.id == source_id)
        .order_by(SourceVersion.version_number.desc())
    ).first()
    if row is None or row.Source.matter_id is None:
        raise HTTPException(status_code=404, detail="Source not found")
    _owned_matter(db, row.Source.matter_id, user_id)
    return row.Source, row.SourceVersion


def _response(source: Source, version: SourceVersion) -> SourceResponse:
    return SourceResponse(
        id=source.id,
        matter_id=source.matter_id,
        canonical_title=source.canonical_title,
        source_type=source.source_type,
        is_synthetic=source.is_synthetic,
        version_id=version.id,
        version_number=version.version_number,
        extraction_status=version.extraction_status,
        page_count=version.page_count,
    )


@router.post("/matters/{matter_id}/uploads", response_model=SourceResponse, status_code=201)
async def upload_source(
    matter_id: UUID,
    db: DbSession,
    user: CurrentUser,
    file: Annotated[UploadFile, File()],
    is_synthetic: bool = False,
) -> SourceResponse:
    _owned_matter(db, matter_id, user.id)
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in {"pdf", "txt", "md"}:
        raise HTTPException(status_code=415, detail="Only PDF, TXT, and MD files are supported")
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if not content or len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File is empty or exceeds 10 MB")
    if extension == "pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(status_code=415, detail="Invalid PDF file")
    if extension in {"txt", "md"}:
        try:
            content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(status_code=415, detail="Text files must be UTF-8") from None
    try:
        source, version, _ = ingestion_pipeline.ingest_file(
            db=db,
            content=content,
            filename=filename,
            matter_id=matter_id,
            is_synthetic=is_synthetic,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from None
    return _response(source, version)


@router.get("/matters/{matter_id}/sources", response_model=list[SourceResponse])
def list_sources(matter_id: UUID, db: DbSession, user: CurrentUser) -> list[SourceResponse]:
    _owned_matter(db, matter_id, user.id)
    sources = db.scalars(
        select(Source).where(Source.matter_id == matter_id).order_by(Source.created_at.desc())
    ).all()
    return [
        _response(source, max(source.versions, key=lambda version: version.version_number))
        for source in sources
        if source.versions
    ]


@router.get("/sources/{source_id}", response_model=SourceResponse)
def get_source(source_id: UUID, db: DbSession, user: CurrentUser) -> SourceResponse:
    source, version = _source_version(db, source_id, user.id)
    return _response(source, version)


@router.get("/sources/{source_id}/pages/{page_number}", response_model=PageResponse)
def get_source_page(
    source_id: UUID, page_number: int, db: DbSession, user: CurrentUser
) -> PageResponse:
    source, version = _source_version(db, source_id, user.id)
    page = db.scalar(
        select(SourcePage).where(
            SourcePage.source_version_id == version.id,
            SourcePage.page_number == page_number,
        )
    )
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    return PageResponse(
        source_id=source.id,
        source_version_id=version.id,
        page_number=page.page_number,
        text=page.text,
        extraction_confidence=page.extraction_confidence,
    )
