from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.db.session import get_db
from app.models.agent_runs import AgentRun
from app.models.auth import User
from app.models.conversations import Thread
from app.models.drafts import DocumentVersion, Draft, DraftExport
from app.models.matters import Matter, MatterMember
from app.models.reviews import Finding
from app.models.sources import Source, SourceVersion
from app.schemas.matters import MatterRole

ROLE_HIERARCHY: dict[MatterRole, set[MatterRole]] = {
    "viewer": {"viewer", "reviewer", "editor", "owner"},
    "reviewer": {"reviewer", "editor", "owner"},
    "editor": {"editor", "owner"},
    "owner": {"owner"},
}


def check_role(membership: MatterMember, required_role: MatterRole) -> None:
    allowed = ROLE_HIERARCHY[required_role]
    if membership.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions for this matter",
        )


def require_matter_role(
    required_role: MatterRole = "viewer",
) -> Callable[..., tuple[Matter, MatterMember]]:
    """FastAPI dependency factory enforcing matter membership and minimum role."""

    def dependency(
        matter_id: UUID,
        user: Annotated[User, Depends(current_user)],
        db: Annotated[Session, Depends(get_db)],
    ) -> tuple[Matter, MatterMember]:
        stmt = (
            select(Matter, MatterMember)
            .join(MatterMember, MatterMember.matter_id == Matter.id)
            .where(Matter.id == matter_id, MatterMember.user_id == user.id)
        )
        row = db.execute(stmt).first()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matter not found")

        matter, membership = row.Matter, row.MatterMember
        check_role(membership, required_role)
        return matter, membership

    return dependency


def get_matter_for_user(
    db: Session,
    matter_id: UUID,
    user_id: UUID,
    required_role: MatterRole = "viewer",
) -> tuple[Matter, MatterMember]:
    stmt = (
        select(Matter, MatterMember)
        .join(MatterMember, MatterMember.matter_id == Matter.id)
        .where(Matter.id == matter_id, MatterMember.user_id == user_id)
    )
    row = db.execute(stmt).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Matter not found")
    matter, membership = row.Matter, row.MatterMember
    check_role(membership, required_role)
    return matter, membership


def get_draft_for_user(
    db: Session,
    document_id: UUID,
    user_id: UUID,
    required_role: MatterRole = "viewer",
) -> tuple[Draft, MatterMember]:
    stmt = (
        select(Draft, MatterMember)
        .join(MatterMember, MatterMember.matter_id == Draft.matter_id)
        .where(Draft.id == document_id, MatterMember.user_id == user_id)
    )
    row = db.execute(stmt).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    draft, membership = row.Draft, row.MatterMember
    check_role(membership, required_role)
    return draft, membership


def get_version_for_user(
    db: Session,
    version_id: UUID,
    user_id: UUID,
    required_role: MatterRole = "viewer",
) -> tuple[DocumentVersion, Draft, MatterMember]:
    stmt = (
        select(DocumentVersion, Draft, MatterMember)
        .join(Draft, Draft.id == DocumentVersion.draft_id)
        .join(MatterMember, MatterMember.matter_id == Draft.matter_id)
        .where(DocumentVersion.id == version_id, MatterMember.user_id == user_id)
    )
    row = db.execute(stmt).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    version, draft, membership = row.DocumentVersion, row.Draft, row.MatterMember
    check_role(membership, required_role)
    return version, draft, membership


def get_source_for_user(
    db: Session,
    source_id: UUID,
    user_id: UUID,
    required_role: MatterRole = "viewer",
) -> tuple[Source, SourceVersion, MatterMember]:
    stmt = (
        select(Source, SourceVersion, MatterMember)
        .join(SourceVersion, SourceVersion.source_id == Source.id)
        .join(MatterMember, MatterMember.matter_id == Source.matter_id)
        .where(Source.id == source_id, MatterMember.user_id == user_id)
        .order_by(SourceVersion.version_number.desc())
    )
    row = db.execute(stmt).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    source, version, membership = row.Source, row.SourceVersion, row.MatterMember
    check_role(membership, required_role)
    return source, version, membership


def get_finding_for_user(
    db: Session,
    finding_id: UUID,
    user_id: UUID,
    required_role: MatterRole = "viewer",
) -> tuple[Finding, MatterMember]:
    stmt = (
        select(Finding, MatterMember)
        .join(DocumentVersion, DocumentVersion.id == Finding.document_version_id)
        .join(Draft, Draft.id == DocumentVersion.draft_id)
        .join(MatterMember, MatterMember.matter_id == Draft.matter_id)
        .where(Finding.id == finding_id, MatterMember.user_id == user_id)
    )
    row = db.execute(stmt).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found")
    finding, membership = row.Finding, row.MatterMember
    check_role(membership, required_role)
    return finding, membership


def get_thread_for_user(
    db: Session,
    thread_id: UUID,
    user_id: UUID,
    required_role: MatterRole = "viewer",
    matter_id: UUID | None = None,
) -> tuple[Thread, MatterMember]:
    stmt = (
        select(Thread, MatterMember)
        .join(MatterMember, MatterMember.matter_id == Thread.matter_id)
        .where(Thread.id == thread_id, MatterMember.user_id == user_id)
    )
    if matter_id is not None:
        stmt = stmt.where(Thread.matter_id == matter_id)
    row = db.execute(stmt).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found")
    thread, membership = row.Thread, row.MatterMember
    check_role(membership, required_role)
    return thread, membership


def get_agent_run_for_user(
    db: Session,
    run_id: UUID,
    user_id: UUID,
    required_role: MatterRole = "viewer",
) -> tuple[AgentRun, MatterMember]:
    stmt = (
        select(AgentRun, MatterMember)
        .join(MatterMember, MatterMember.matter_id == AgentRun.matter_id)
        .where(AgentRun.id == run_id, MatterMember.user_id == user_id)
    )
    row = db.execute(stmt).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent run not found")
    run, membership = row.AgentRun, row.MatterMember
    check_role(membership, required_role)
    return run, membership


def get_export_for_user(
    db: Session,
    export_id: UUID,
    user_id: UUID,
    required_role: MatterRole = "viewer",
) -> tuple[DraftExport, MatterMember]:
    stmt = (
        select(DraftExport, MatterMember)
        .join(DocumentVersion, DocumentVersion.id == DraftExport.document_version_id)
        .join(Draft, Draft.id == DocumentVersion.draft_id)
        .join(MatterMember, MatterMember.matter_id == Draft.matter_id)
        .where(DraftExport.id == export_id, MatterMember.user_id == user_id)
    )
    row = db.execute(stmt).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Export not found")
    export, membership = row.DraftExport, row.MatterMember
    check_role(membership, required_role)
    return export, membership
