from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.db.session import get_db
from app.dependencies.matter import get_export_for_user, get_version_for_user
from app.models.drafts.export import DraftExport
from app.models.matters import User
from app.repositories.drafts.draft_repository import draft_repository
from app.services.exports.draft import (
    build_package,
    checksum,
    export_storage,
    render_pdf,
    serialize_json,
)

router = APIRouter(prefix="/api/v1", tags=["Exports"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]


class ExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    format: str
    mode: str = "draft"


class ExportResponse(BaseModel):
    id: UUID
    document_version_id: UUID
    format: str
    mode: str
    sha256: str
    download_url: str
    created_at: datetime


def _response(export: DraftExport) -> ExportResponse:
    return ExportResponse(
        id=export.id,
        document_version_id=export.document_version_id,
        format=export.format,
        mode="draft",
        sha256=export.sha256,
        download_url=f"/api/v1/exports/{export.id}/download",
        created_at=export.created_at,
    )


@router.post(
    "/document-versions/{version_id}/exports", response_model=ExportResponse, status_code=201
)
def create_export(
    version_id: UUID,
    payload: ExportRequest,
    db: DbSession,
    user: CurrentUser,
    idempotency_key: Annotated[str, Header(min_length=1, max_length=128)],
) -> ExportResponse:
    version, draft, _ = get_version_for_user(db, version_id, user.id, "viewer")
    if draft_repository.get_latest_version(db, draft.id).id != version_id:
        raise HTTPException(status_code=409, detail="Export requires the current version")
    if payload.mode != "draft":
        raise HTTPException(status_code=409, detail="Reviewed export is not yet eligible")
    if payload.format not in {"pdf", "json"}:
        raise HTTPException(status_code=422, detail="Unsupported export format")
    previous = db.scalar(
        select(DraftExport).where(
            DraftExport.user_id == user.id,
            DraftExport.document_version_id == version_id,
            DraftExport.idempotency_key == idempotency_key,
        )
    )
    if previous is not None:
        if previous.format != payload.format:
            raise HTTPException(status_code=409, detail="Idempotency key was reused")
        return _response(previous)
    package = build_package(db, draft, version)
    content = render_pdf(package) if payload.format == "pdf" else serialize_json(package)
    export = DraftExport(
        document_version_id=version_id,
        user_id=user.id,
        format=payload.format,
        object_key="",
        sha256=checksum(content),
        idempotency_key=idempotency_key,
    )
    db.add(export)
    db.flush()
    export.object_key = export_storage.save(export.id, payload.format, content)
    try:
        db.commit()
    except Exception:
        db.rollback()
        export_storage.delete(export.object_key)
        raise
    db.refresh(export)
    return _response(export)


@router.get("/exports/{export_id}", response_model=ExportResponse)
def get_export(export_id: UUID, db: DbSession, user: CurrentUser) -> ExportResponse:
    export, _ = get_export_for_user(db, export_id, user.id, "viewer")
    return _response(export)


@router.get("/exports/{export_id}/download")
def download_export(export_id: UUID, db: DbSession, user: CurrentUser) -> Response:
    export, _ = get_export_for_user(db, export_id, user.id, "viewer")
    content = export_storage.read(export.object_key)
    media_type = "application/pdf" if export.format == "pdf" else "application/json"
    return Response(
        content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="veritas-draft-{export.id}.{export.format}"'
        },
    )
