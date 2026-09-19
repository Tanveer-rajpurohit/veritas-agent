import hashlib
import json
from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.db.session import get_db
from app.dependencies.matter import (
    get_agent_run_for_user,
    get_matter_for_user,
    get_thread_for_user,
)
from app.models.agent_runs import AgentEvent, AgentRun
from app.models.conversations import Message
from app.models.matters import User
from app.models.sources import Source
from app.repositories.drafts.draft_repository import draft_repository
from app.schemas.agents.writer import DocumentOperation
from app.schemas.matters import MatterRole
from app.services.drafts.draft_service import draft_service
from app.workers.agent_runs import process_agent_run

router = APIRouter(prefix="/api/v1", tags=["Agent Runs"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]


class CreateRun(BaseModel):
    model_config = ConfigDict(extra="forbid")
    thread_id: UUID
    message_id: UUID
    agent: Literal["main", "writer", "citation_reviewer", "fact_reviewer"]
    document_id: UUID | None = None
    document_version_id: UUID | None = None
    source_ids: list[UUID] = Field(default_factory=list, max_length=20)
    requested_action: Literal[
        "answer",
        "prepare_working_brief",
        "revise_working_brief",
        "review_facts",
        "apply_safe_fact_fixes",
        "review_citations",
    ]


class RunResponse(BaseModel):
    run_id: UUID
    status: str
    agent: str
    events_url: str
    result: dict | None
    error_code: str | None
    created_at: datetime


class ApplyProposalResponse(BaseModel):
    run_id: UUID
    proposal_status: Literal["accepted"]
    document_id: UUID
    document_version_id: UUID


class RejectProposalResponse(BaseModel):
    run_id: UUID
    proposal_status: Literal["rejected"]


def _response(run: AgentRun) -> RunResponse:
    return RunResponse(
        run_id=run.id,
        status=run.status,
        agent=run.agent,
        events_url=f"/api/v1/agent-runs/{run.id}/events",
        result=run.result,
        error_code=run.error_code,
        created_at=run.created_at,
    )


@router.post("/matters/{matter_id}/agent-runs", response_model=RunResponse, status_code=202)
def create_run(
    matter_id: UUID,
    payload: CreateRun,
    background_tasks: BackgroundTasks,
    db: DbSession,
    user: CurrentUser,
    idempotency_key: Annotated[str, Header(min_length=1, max_length=128)],
) -> RunResponse:
    allowed_actions = {
        "main": {"answer", "review_citations", "review_facts"},
        "writer": {"prepare_working_brief", "revise_working_brief"},
        "citation_reviewer": {"review_citations"},
        "fact_reviewer": {"review_facts", "apply_safe_fact_fixes"},
    }
    if payload.requested_action not in allowed_actions[payload.agent]:
        raise HTTPException(status_code=422, detail="Action is not supported by this agent")
    required_role: MatterRole = (
        "editor"
        if payload.requested_action
        in {"prepare_working_brief", "revise_working_brief", "apply_safe_fact_fixes"}
        else "reviewer"
    )
    get_matter_for_user(db, matter_id, user.id, required_role)
    document_required_actions = {
        "revise_working_brief",
        "review_facts",
        "apply_safe_fact_fixes",
        "review_citations",
    }
    if payload.requested_action in document_required_actions and payload.document_id is None:
        raise HTTPException(status_code=422, detail="A document is required for revision")
    thread, _ = get_thread_for_user(
        db, payload.thread_id, user.id, required_role, matter_id=matter_id
    )
    message = db.scalar(
        select(Message).where(
            Message.id == payload.message_id,
            Message.thread_id == thread.id,
            Message.role == "user",
        )
    )
    if message is None:
        raise HTTPException(status_code=404, detail="Message not found")
    if payload.document_id is not None:
        draft = draft_repository.get_draft_by_id(db, payload.document_id, matter_id)
        if draft is None:
            raise HTTPException(status_code=404, detail="Document not found")
        if payload.document_version_id is None:
            raise HTTPException(status_code=422, detail="Current document version is required")
        current = draft_repository.get_latest_version(db, draft.id)
        if current.id != payload.document_version_id:
            raise HTTPException(status_code=409, detail="Document version conflict")
    elif payload.document_version_id is not None:
        raise HTTPException(status_code=422, detail="Document ID is required")
    if payload.source_ids:
        sources = db.scalars(
            select(Source).where(
                Source.id.in_(payload.source_ids),
                or_(Source.matter_id == matter_id, Source.matter_id.is_(None)),
            )
        ).all()
        if len(sources) != len(set(payload.source_ids)):
            raise HTTPException(status_code=404, detail="Source not found")
    request_hash = hashlib.sha256(
        json.dumps(payload.model_dump(mode="json"), sort_keys=True).encode()
    ).hexdigest()
    previous = db.scalar(
        select(AgentRun).where(
            AgentRun.user_id == user.id,
            AgentRun.matter_id == matter_id,
            AgentRun.idempotency_key == idempotency_key,
        )
    )
    if previous is not None:
        if previous.request_hash != request_hash:
            raise HTTPException(status_code=409, detail="Idempotency key was reused")
        if previous.status == "queued":
            background_tasks.add_task(process_agent_run, previous.id)
        return _response(previous)
    run = AgentRun(
        matter_id=matter_id,
        user_id=user.id,
        thread_id=thread.id,
        message_id=message.id,
        agent=payload.agent,
        requested_action=payload.requested_action,
        document_id=payload.document_id,
        base_version_id=payload.document_version_id,
        source_ids=[str(source_id) for source_id in payload.source_ids],
        idempotency_key=idempotency_key,
        request_hash=request_hash,
    )
    db.add(run)
    db.flush()
    db.add(
        AgentEvent(
            run_id=run.id, sequence=1, event_type="task.queued", payload={"agent": run.agent}
        )
    )
    db.commit()
    db.refresh(run)
    background_tasks.add_task(process_agent_run, run.id)
    return _response(run)


@router.get("/agent-runs/{run_id}", response_model=RunResponse)
def get_run(run_id: UUID, db: DbSession, user: CurrentUser) -> RunResponse:
    run, _ = get_agent_run_for_user(db, run_id, user.id, "viewer")
    return _response(run)


@router.post("/agent-runs/{run_id}/apply", response_model=ApplyProposalResponse, status_code=201)
def apply_writer_proposal(
    run_id: UUID,
    db: DbSession,
    user: CurrentUser,
    idempotency_key: Annotated[str, Header(min_length=1, max_length=128)],
) -> ApplyProposalResponse:
    run, _ = get_agent_run_for_user(db, run_id, user.id, "editor")
    if run.status != "completed" or run.agent != "writer" or not run.document_id:
        raise HTTPException(status_code=409, detail="This run has no applicable document proposal")
    result = dict(run.result or {})
    if result.get("proposal_status") == "accepted" and result.get("document_version_id"):
        return ApplyProposalResponse(
            run_id=run.id,
            proposal_status="accepted",
            document_id=run.document_id,
            document_version_id=UUID(result["document_version_id"]),
        )
    if result.get("proposal_status") == "rejected":
        raise HTTPException(status_code=409, detail="This proposal was rejected")
    raw_operations = result.get("proposed_operations") or []
    if not raw_operations:
        raise HTTPException(status_code=409, detail="This run has no proposed edits")
    operations = [DocumentOperation.model_validate(item) for item in raw_operations]
    request_hash = hashlib.sha256(
        json.dumps(raw_operations, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    try:
        version = draft_service.propose_document_ops(
            db=db,
            matter_id=run.matter_id,
            draft_id=run.document_id,
            base_version_id=run.base_version_id,
            operations=operations,
            change_summary="Accepted Writer proposal",
            created_by_id=str(user.id),
            user_id=user.id,
            idempotency_key=idempotency_key,
            request_hash=request_hash,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=409, detail="Document changed before this proposal was applied"
        ) from exc
    result.update(
        proposal_status="accepted",
        document_version_id=str(version.id),
    )
    run.result = result
    db.add(run)
    db.commit()
    return ApplyProposalResponse(
        run_id=run.id,
        proposal_status="accepted",
        document_id=run.document_id,
        document_version_id=version.id,
    )


@router.post("/agent-runs/{run_id}/reject", response_model=RejectProposalResponse)
def reject_writer_proposal(
    run_id: UUID,
    db: DbSession,
    user: CurrentUser,
) -> RejectProposalResponse:
    run, _ = get_agent_run_for_user(db, run_id, user.id, "editor")
    result = dict(run.result or {})
    if run.status != "completed" or run.agent != "writer" or not result.get("proposed_operations"):
        raise HTTPException(status_code=409, detail="This run has no document proposal")
    if result.get("proposal_status") == "accepted":
        raise HTTPException(status_code=409, detail="An accepted proposal cannot be rejected")
    result["proposal_status"] = "rejected"
    run.result = result
    db.add(run)
    db.commit()
    return RejectProposalResponse(run_id=run.id, proposal_status="rejected")


@router.get("/agent-runs/{run_id}/events")
def get_run_events(
    run_id: UUID,
    db: DbSession,
    user: CurrentUser,
    last_event_id: Annotated[str | None, Header()] = None,
) -> StreamingResponse:
    get_agent_run_for_user(db, run_id, user.id, "viewer")
    cursor = 0
    if last_event_id:
        try:
            prefix, sequence = last_event_id.split(":", 1)
            if prefix != str(run_id):
                raise ValueError
            cursor = int(sequence)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid event cursor") from None
    events = db.scalars(
        select(AgentEvent)
        .where(AgentEvent.run_id == run_id, AgentEvent.sequence > cursor)
        .order_by(AgentEvent.sequence)
    ).all()

    def stream():
        for event in events:
            body = {
                "event_id": f"{run_id}:{event.sequence}",
                "run_id": str(run_id),
                **event.payload,
            }
            yield f"id: {run_id}:{event.sequence}\nevent: {event.event_type}\ndata: {json.dumps(body)}\n\n"

    return StreamingResponse(
        stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"}
    )
