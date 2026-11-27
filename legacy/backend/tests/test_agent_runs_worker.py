import hashlib
import json
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.agent_runs import AgentEvent, AgentRun
from app.models.conversations import Message, Thread
from app.models.drafts import DocumentVersion, Draft
from app.models.matters import Matter, MatterMember, User
from app.workers.agent_runs import process_agent_run

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


def _seed_matter_and_draft(db):
    user = User(
        id=uuid4(),
        email="lawyer@example.com",
        password_hash="hashed_pw",
    )
    db.add(user)

    matter = Matter(
        id=uuid4(),
        title="Insolvency Petition Matter",
        created_by=user.id,
    )
    db.add(matter)

    member = MatterMember(
        matter_id=matter.id,
        user_id=user.id,
        role="owner",
    )
    db.add(member)

    draft = Draft(
        id=uuid4(),
        matter_id=matter.id,
        title="Section 7 Petition",
    )
    db.add(draft)

    content_json = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "attrs": {"block_id": "block-1"},
                "content": [
                    {
                        "type": "text",
                        "text": "The operational creditor claims an outstanding default of ₹4.85 crore.",
                    }
                ],
            }
        ],
    }

    raw_text = json.dumps(content_json, sort_keys=True)
    content_hash = hashlib.sha256(raw_text.encode()).hexdigest()

    version = DocumentVersion(
        id=uuid4(),
        draft_id=draft.id,
        version_no=1,
        content_json=content_json,
        content_sha256=content_hash,
        change_summary="Initial draft",
        created_by_id="user_1",
    )
    db.add(version)

    thread = Thread(
        id=uuid4(),
        matter_id=matter.id,
        title="Review Thread",
        created_by=user.id,
    )
    db.add(thread)

    msg = Message(
        id=uuid4(),
        thread_id=thread.id,
        role="user",
        content="Please review facts in the petition",
    )
    db.add(msg)

    db.commit()
    return user, matter, draft, version, thread, msg


def test_fact_reviewer_worker_execution_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("app.workers.agent_runs.SessionLocal", TestingSessionLocal)

    with TestingSessionLocal() as db:
        user, matter, draft, version, thread, msg = _seed_matter_and_draft(db)

        run = AgentRun(
            id=uuid4(),
            matter_id=matter.id,
            thread_id=thread.id,
            message_id=msg.id,
            agent="fact_reviewer",
            requested_action="review_facts",
            status="queued",
            user_id=user.id,
            document_id=draft.id,
            base_version_id=version.id,
            idempotency_key=f"key-{uuid4()}",
            request_hash=hashlib.sha256(b"req1").hexdigest(),
        )
        db.add(run)
        db.commit()
        run_id = run.id

    mock_agent = MagicMock()
    mock_agent_result = MagicMock()
    mock_agent_result.structured_output = {
        "findings": [],
        "unchecked_claim_ids": [],
        "run_limitations": ["Verified against matter documents"],
        "correction_candidates": [],
    }
    mock_agent.return_value = mock_agent_result

    def mock_create_agent(db, matter_id, document_version_id, claims, allow_fixes):
        mock_handlers = MagicMock()
        return mock_agent, mock_handlers

    monkeypatch.setattr(
        "app.workers.agent_runs.create_fact_reviewer_agent",
        mock_create_agent,
    )
    monkeypatch.setattr(
        "app.workers.agent_runs.create_fact_reviewer_formatter",
        lambda: mock_agent,
    )

    process_agent_run(run_id)

    with TestingSessionLocal() as db:
        updated_run = db.get(AgentRun, run_id)
        assert updated_run.status == "completed"
        assert updated_run.result is not None
        assert updated_run.result["reviewer_status"] == "completed"
        assert updated_run.result["finding_count"] >= 1
        assert "message" in updated_run.result

        events = db.scalars(
            select(AgentEvent).where(AgentEvent.run_id == run_id).order_by(AgentEvent.sequence)
        ).all()
        event_types = [e.event_type for e in events]
        assert "task.started" in event_types
        assert "tool.started" in event_types
        assert "finding.created" in event_types
        assert "tool.completed" in event_types
        assert "artifact.ready" in event_types
        assert "task.completed" in event_types


def test_fact_reviewer_worker_execution_llm_failure_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("app.workers.agent_runs.SessionLocal", TestingSessionLocal)

    with TestingSessionLocal() as db:
        user, matter, draft, version, thread, msg = _seed_matter_and_draft(db)

        run = AgentRun(
            id=uuid4(),
            matter_id=matter.id,
            thread_id=thread.id,
            message_id=msg.id,
            agent="fact_reviewer",
            requested_action="review_facts",
            status="queued",
            user_id=user.id,
            document_id=draft.id,
            base_version_id=version.id,
            idempotency_key=f"key-{uuid4()}",
            request_hash=hashlib.sha256(b"req2").hexdigest(),
        )
        db.add(run)
        db.commit()
        run_id = run.id

    def mock_create_agent_failure(*args, **kwargs):
        raise RuntimeError("LLM rate limit reached")

    monkeypatch.setattr(
        "app.workers.agent_runs.create_fact_reviewer_agent",
        mock_create_agent_failure,
    )

    process_agent_run(run_id)

    with TestingSessionLocal() as db:
        updated_run = db.get(AgentRun, run_id)
        assert updated_run.status == "completed"
        assert updated_run.result is not None
        assert updated_run.result["reviewer_status"] == "unavailable"
        assert updated_run.result["finding_count"] >= 1
        assert len(updated_run.result["findings"]) >= 1

        events = db.scalars(
            select(AgentEvent).where(AgentEvent.run_id == run_id).order_by(AgentEvent.sequence)
        ).all()
        event_types = [e.event_type for e in events]
        assert "task.started" in event_types
        assert "finding.created" in event_types
        assert "task.completed" in event_types
