from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import current_user
from app.db.session import get_db
from app.dependencies.matter import get_thread_for_user, require_matter_role
from app.models.conversations import Message, Thread
from app.models.matters import Matter, MatterMember, User

router = APIRouter(prefix="/api/v1", tags=["Conversations"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(current_user)]


class CreateThread(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: str = Field(default="New conversation", min_length=1, max_length=255)


class ThreadResponse(BaseModel):
    id: UUID
    matter_id: UUID
    title: str
    created_at: datetime


class CreateMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content: str = Field(min_length=1, max_length=10000)


class MessageResponse(BaseModel):
    id: UUID
    thread_id: UUID
    role: str
    content: str
    created_at: datetime


def owned_thread(db: Session, thread_id: UUID, user_id: UUID) -> Thread:
    thread, _ = get_thread_for_user(db, thread_id, user_id, "viewer")
    return thread


def _thread_response(thread: Thread) -> ThreadResponse:
    return ThreadResponse(
        id=thread.id, matter_id=thread.matter_id, title=thread.title, created_at=thread.created_at
    )


def _message_response(message: Message) -> MessageResponse:
    return MessageResponse(
        id=message.id,
        thread_id=message.thread_id,
        role=message.role,
        content=message.content,
        created_at=message.created_at,
    )


@router.post("/matters/{matter_id}/threads", response_model=ThreadResponse, status_code=201)
def create_thread(
    payload: CreateThread,
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("editor"))],
    db: DbSession,
    user: CurrentUser,
) -> ThreadResponse:
    matter, _ = auth_data
    if not payload.title.strip():
        raise HTTPException(status_code=422, detail="Thread title is required")
    thread = Thread(matter_id=matter.id, title=payload.title.strip(), created_by=user.id)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return _thread_response(thread)


@router.get("/matters/{matter_id}/threads", response_model=list[ThreadResponse])
def list_threads(
    auth_data: Annotated[tuple[Matter, MatterMember], Depends(require_matter_role("viewer"))],
    db: DbSession,
) -> list[ThreadResponse]:
    matter, _ = auth_data
    threads = db.scalars(
        select(Thread).where(Thread.matter_id == matter.id).order_by(Thread.created_at.desc())
    ).all()
    return [_thread_response(thread) for thread in threads]


@router.get("/threads/{thread_id}", response_model=ThreadResponse)
def get_thread(thread_id: UUID, db: DbSession, user: CurrentUser) -> ThreadResponse:
    return _thread_response(owned_thread(db, thread_id, user.id))


@router.post("/threads/{thread_id}/messages", response_model=MessageResponse, status_code=201)
def create_message(
    thread_id: UUID, payload: CreateMessage, db: DbSession, user: CurrentUser
) -> MessageResponse:
    if not payload.content.strip():
        raise HTTPException(status_code=422, detail="Message cannot be blank")
    thread, _ = get_thread_for_user(db, thread_id, user.id, "editor")
    message = Message(thread_id=thread.id, role="user", content=payload.content.strip())
    db.add(message)
    db.commit()
    db.refresh(message)
    return _message_response(message)


@router.get("/threads/{thread_id}/messages", response_model=list[MessageResponse])
def list_messages(thread_id: UUID, db: DbSession, user: CurrentUser) -> list[MessageResponse]:
    thread, _ = get_thread_for_user(db, thread_id, user.id, "viewer")
    messages = db.scalars(
        select(Message).where(Message.thread_id == thread.id).order_by(Message.created_at)
    ).all()
    return [_message_response(message) for message in messages]
