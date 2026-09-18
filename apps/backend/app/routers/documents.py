import hashlib
import json
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.db.session import get_db
from app.models.drafts import Draft
from app.models.matters import User
from app.repositories.drafts.draft_repository import draft_repository
from app.repositories.matters import MatterRepository
from app.services.sources.retrieval import retrieval_service

router = APIRouter(prefix="/api/v1", tags=["Documents"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]


class CreateDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(min_length=1, max_length=255)


class SaveVersion(BaseModel):
    model_config = ConfigDict(extra="forbid")
    base_version_id: UUID
    schema_version: int = Field(ge=1, le=1)
    content: dict
    change_summary: str = Field(default="Document edited", max_length=255)


class DocumentResponse(BaseModel):
    id: UUID
    matter_id: UUID
    title: str
    current_version_id: UUID
    version_no: int
    content: dict


class VersionResponse(BaseModel):
    id: UUID
    document_id: UUID
    version_no: int
    parent_version_id: UUID | None
    content: dict
    content_sha256: str


def _owned_draft(db: Session, document_id: UUID, user_id: UUID) -> Draft:
    draft = draft_repository.get_draft_by_id(db, document_id)
    if draft is None or MatterRepository(db).get_by_id(draft.matter_id, user_id) is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return draft


def _validate_content(content: dict) -> list[UUID]:
    if len(json.dumps(content, ensure_ascii=False).encode()) > 1_000_000:
        raise HTTPException(status_code=422, detail="Document exceeds 1 MB")
    allowed_nodes = {
        "doc",
        "paragraph",
        "heading",
        "text",
        "bulletList",
        "orderedList",
        "listItem",
        "blockquote",
        "table",
        "tableRow",
        "tableCell",
        "citationRef",
        "factRef",
        "placeholder",
        "pageBreak",
        "hardBreak",
        "horizontalRule",
    }
    allowed_marks = {
        "bold",
        "italic",
        "underline",
        "strike",
        "code",
        "link",
        "citation",
        "textStyle",
        "annotation",
    }
    span_ids = []

    def walk(node: dict, depth: int) -> None:
        if depth > 32 or not isinstance(node, dict) or node.get("type") not in allowed_nodes:
            raise HTTPException(status_code=422, detail="Invalid document node")
        if node.get("type") == "text" and not isinstance(node.get("text"), str):
            raise HTTPException(status_code=422, detail="Invalid document text")
        attrs = node.get("attrs", {})
        if not isinstance(attrs, dict):
            raise HTTPException(status_code=422, detail="Invalid document attributes")
        for raw_id in attrs.get("evidence_span_ids", []):
            try:
                span_ids.append(UUID(str(raw_id)))
            except ValueError:
                raise HTTPException(status_code=422, detail="Invalid evidence reference") from None
        for mark in node.get("marks", []):
            if not isinstance(mark, dict) or mark.get("type") not in allowed_marks:
                raise HTTPException(status_code=422, detail="Invalid document mark")
            mark_attrs = mark.get("attrs", {})
            if not isinstance(mark_attrs, dict):
                raise HTTPException(status_code=422, detail="Invalid mark attributes")
            href = mark_attrs.get("href")
            if href is not None and (
                not isinstance(href, str) or not href.startswith(("https://", "http://"))
            ):
                raise HTTPException(status_code=422, detail="Invalid link")
        children = node.get("content", [])
        if not isinstance(children, list):
            raise HTTPException(status_code=422, detail="Invalid document content")
        for child in children:
            walk(child, depth + 1)

    if content.get("type") != "doc":
        raise HTTPException(status_code=422, detail="Document root must be doc")
    walk(content, 0)
    return span_ids


def _version_response(version) -> VersionResponse:
    return VersionResponse(
        id=version.id,
        document_id=version.draft_id,
        version_no=version.version_no,
        parent_version_id=version.parent_version_id,
        content=version.content_json,
        content_sha256=version.content_sha256,
    )


@router.post("/matters/{matter_id}/documents", response_model=DocumentResponse, status_code=201)
def create_document(
    matter_id: UUID, payload: CreateDocument, db: DbSession, user: CurrentUser
) -> DocumentResponse:
    if MatterRepository(db).get_by_id(matter_id, user.id) is None:
        raise HTTPException(status_code=404, detail="Matter not found")
    draft = Draft(
        matter_id=matter_id,
        title=payload.title.strip(),
        kind="brief",
        content_json={"type": "doc", "content": []},
        version_no=1,
    )
    draft = draft_repository.create_draft(db, draft, created_by_id=str(user.id))
    version = draft_repository.get_latest_version(db, draft.id)
    return DocumentResponse(
        id=draft.id,
        matter_id=matter_id,
        title=draft.title,
        current_version_id=version.id,
        version_no=version.version_no,
        content=version.content_json,
    )


@router.get("/documents/{document_id}", response_model=DocumentResponse)
def get_document(document_id: UUID, db: DbSession, user: CurrentUser) -> DocumentResponse:
    draft = _owned_draft(db, document_id, user.id)
    version = draft_repository.get_latest_version(db, draft.id)
    return DocumentResponse(
        id=draft.id,
        matter_id=draft.matter_id,
        title=draft.title,
        current_version_id=version.id,
        version_no=version.version_no,
        content=version.content_json,
    )


@router.get("/document-versions/{version_id}", response_model=VersionResponse)
def get_document_version(version_id: UUID, db: DbSession, user: CurrentUser) -> VersionResponse:
    version = draft_repository.get_version_by_id(db, version_id)
    if version is None:
        raise HTTPException(status_code=404, detail="Version not found")
    _owned_draft(db, version.draft_id, user.id)
    return _version_response(version)


@router.post("/documents/{document_id}/versions", response_model=VersionResponse, status_code=201)
def save_version(
    document_id: UUID,
    payload: SaveVersion,
    db: DbSession,
    user: CurrentUser,
    idempotency_key: Annotated[str, Header(min_length=1, max_length=128)],
) -> VersionResponse:
    draft = _owned_draft(db, document_id, user.id)
    span_ids = _validate_content(payload.content)
    if span_ids:
        try:
            retrieval_service.get_evidence_spans(db, draft.matter_id, span_ids)
        except ValueError:
            raise HTTPException(
                status_code=422, detail="Evidence reference is unavailable"
            ) from None
    request_hash = hashlib.sha256(
        json.dumps(payload.model_dump(mode="json"), sort_keys=True).encode()
    ).hexdigest()
    try:
        version = draft_repository.create_new_version(
            db=db,
            draft=draft,
            content_json=payload.content,
            base_version_id=payload.base_version_id,
            created_by_type="human",
            created_by_id=str(user.id),
            change_summary=payload.change_summary,
            user_id=user.id,
            idempotency_key=idempotency_key,
            request_hash=request_hash,
        )
    except ValueError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="Version conflict or reused idempotency key"
        ) from None
    return _version_response(version)
