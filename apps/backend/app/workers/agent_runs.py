import logging
import time
from uuid import UUID

from sqlalchemy import func, select, update

from app.agents.main_agent import create_main_agent
from app.agents.writer.agent import create_writer_agent
from app.db.session import SessionLocal
from app.models.agent_runs import AgentEvent, AgentRun
from app.models.conversations import Message
from app.schemas.agents.writer import WriterResult
from app.services.drafts.draft_service import draft_service

logger = logging.getLogger(__name__)


def _append_event(db, run_id: UUID, event_type: str, payload: dict) -> None:
    sequence = (
        db.scalar(select(func.max(AgentEvent.sequence)).where(AgentEvent.run_id == run_id)) or 0
    )
    db.add(AgentEvent(run_id=run_id, sequence=sequence + 1, event_type=event_type, payload=payload))
    db.commit()


def process_agent_run(run_id: UUID) -> None:
    with SessionLocal() as db:
        claimed = db.execute(
            update(AgentRun)
            .where(AgentRun.id == run_id, AgentRun.status == "queued")
            .values(status="running")
        )
        if claimed.rowcount != 1:
            db.rollback()
            return
        db.commit()
        run = db.get(AgentRun, run_id)
        _append_event(db, run_id, "task.started", {"agent": run.agent})
        try:
            message = db.get(Message, run.message_id)
            if run.agent == "writer":
                agent = create_writer_agent(db, run.matter_id, allow_document_writes=False)
                context = [message.content]
                if run.base_version_id:
                    context.append(f"Current document version ID: {run.base_version_id}")
                if run.source_ids:
                    context.append(f"Sources selected by the user: {', '.join(run.source_ids)}")
                result = agent("\n\n".join(context))
                proposal = WriterResult.model_validate(result.structured_output)
                if not proposal.operations:
                    version = None
                elif run.document_id is not None:
                    version = draft_service.propose_document_ops(
                        db=db,
                        matter_id=run.matter_id,
                        draft_id=run.document_id,
                        base_version_id=run.base_version_id,
                        operations=proposal.operations,
                        created_by_id="writer_agent",
                    )
                else:
                    version = draft_service.create_draft(
                        db=db,
                        matter_id=run.matter_id,
                        title="IBC Section 7 working brief",
                        operations=proposal.operations,
                        created_by_id="writer_agent",
                    )
                run.result = {
                    "document_id": str(version.draft_id) if version else None,
                    "document_version_id": str(version.id) if version else None,
                    "assumptions": proposal.assumptions,
                    "unresolved_questions": proposal.unresolved_questions,
                }
                if version:
                    _append_event(
                        db,
                        run_id,
                        "artifact.ready",
                        {
                            "document_id": str(version.draft_id),
                            "document_version_id": str(version.id),
                        },
                    )
            else:
                agent = create_main_agent()
                result = agent(message.content)
                response_text = str(result)[:10000]
                db.add(Message(thread_id=run.thread_id, role="assistant", content=response_text))
                run.result = {"message": response_text}
                _append_event(db, run_id, "message.created", {"text": response_text})
            run.status = "completed"
            _append_event(db, run_id, "task.completed", {"status": "completed"})
        except Exception as exc:
            db.rollback()
            logger.error("Agent run %s failed: %s", run_id, type(exc).__name__)
            run = db.get(AgentRun, run_id)
            run.status = "failed"
            run.error_code = "agent_unavailable"
            _append_event(
                db,
                run_id,
                "task.failed",
                {"code": "agent_unavailable", "message": "The agent could not complete this run."},
            )


def run_pending() -> None:
    while True:
        with SessionLocal() as db:
            run_ids = db.scalars(
                select(AgentRun.id)
                .where(AgentRun.status == "queued")
                .order_by(AgentRun.created_at)
                .limit(10)
            ).all()
        for run_id in run_ids:
            process_agent_run(run_id)
        time.sleep(2)


if __name__ == "__main__":
    run_pending()
