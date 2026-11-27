from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.db.session import get_db
from app.dependencies.matter import get_source_for_user, require_matter_role
from app.models.matters import Matter, MatterMember, User
from app.models.sources import Source, SourcePage, SourceVersion
from app.services.sources.pipeline import ingestion_pipeline
from app.services.sources.storage import storage_service

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
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("editor"))],
    db: DbSession,
    user: CurrentUser,
    file: Annotated[UploadFile, File()],
    is_synthetic: bool = False,
) -> SourceResponse:
    matter, _ = auth_data
    filename = file.filename or ""
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if extension not in {"pdf", "txt", "md", "png", "jpg", "jpeg"}:
        raise HTTPException(
            status_code=415,
            detail="OCR_UNAVAILABLE: Only PDF, TXT, MD, PNG, JPG are supported. Convert the scan and retry.",
        )
    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if not content or len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413, detail="UPLOAD_TOO_LARGE: File is empty or exceeds 10 MB"
        )
    if extension == "pdf" and not content.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=415,
            detail="INVALID_PDF: File header is not a valid PDF. Re-export and retry.",
        )
    if extension in {"txt", "md"}:
        try:
            content.decode("utf-8")
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=415, detail="INVALID_TEXT: Text files must be UTF-8"
            ) from None
    try:
        source, version, _ = ingestion_pipeline.ingest_file(
            db=db,
            content=content,
            filename=filename,
            matter_id=matter.id,
            is_synthetic=is_synthetic,
        )
    except ValueError as exc:
        msg = str(exc)
        if "empty" in msg.lower():
            raise HTTPException(status_code=422, detail=f"EMPTY_SOURCE: {msg}") from None
        raise HTTPException(
            status_code=422,
            detail=f"EXTRACTION_FAILED: {msg} The file was stored; mark needs_review and retry.",
        ) from None
    return _response(source, version)


@router.get("/matters/{matter_id}/sources", response_model=list[SourceResponse])
def list_sources(
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("viewer"))],
    db: DbSession,
) -> list[SourceResponse]:
    matter, _ = auth_data
    sources = db.scalars(
        select(Source).where(Source.matter_id == matter.id).order_by(Source.created_at.desc())
    ).all()
    return [
        _response(source, max(source.versions, key=lambda version: version.version_number))
        for source in sources
        if source.versions
    ]


@router.get("/sources/{source_id}", response_model=SourceResponse)
def get_source(source_id: UUID, db: DbSession, user: CurrentUser) -> SourceResponse:
    source, version, _ = get_source_for_user(db, source_id, user.id, "viewer")
    return _response(source, version)


@router.get("/sources/{source_id}/download")
def download_source(source_id: UUID, db: DbSession, user: CurrentUser) -> Response:
    _, version, _ = get_source_for_user(db, source_id, user.id, "viewer")
    content = storage_service.read_file(version.object_key)
    return Response(
        content,
        media_type=version.mime_type,
        headers={"Content-Disposition": f'attachment; filename="source-{source_id}"'},
    )


@router.get("/sources/{source_id}/preview")
def preview_source(source_id: UUID, db: DbSession, user: CurrentUser) -> dict[str, str | int]:
    _, version, _ = get_source_for_user(db, source_id, user.id, "viewer")
    return {
        "url": storage_service.create_preview_url(version.object_key, version.mime_type),
        "expires_in": 300,
        "mime_type": version.mime_type,
    }


@router.get("/sources/{source_id}/pages/{page_number}", response_model=PageResponse)
def get_source_page(
    source_id: UUID, page_number: int, db: DbSession, user: CurrentUser
) -> PageResponse:
    _, version, _ = get_source_for_user(db, source_id, user.id, "viewer")
    page = db.scalar(
        select(SourcePage).where(
            SourcePage.source_version_id == version.id,
            SourcePage.page_number == page_number,
        )
    )
    if page is None:
        raise HTTPException(status_code=404, detail="Page not found")
    return PageResponse(
        source_id=source_id,
        source_version_id=version.id,
        page_number=page.page_number,
        text=page.text,
        extraction_confidence=page.extraction_confidence,
    )
