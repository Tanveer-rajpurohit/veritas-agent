import logging
import re
import time
from collections.abc import Callable
from typing import TypeVar
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import func, select, update
from strands import Agent

from app.agents.citation_reviewer import (
    create_citation_reviewer_agent,
    create_citation_reviewer_formatter,
)
from app.agents.fact_reviewer.agent import (
    create_fact_reviewer_agent,
    create_fact_reviewer_formatter,
)
from app.agents.main_agent import create_main_agent
from app.agents.model_provider import invoke_with_fallback
from app.agents.writer.agent import create_writer_agent, create_writer_formatter
from app.db.session import SessionLocal
from app.models.agent_runs import AgentEvent, AgentRun
from app.models.conversations import Message
from app.models.drafts import Draft
from app.models.matters import Matter
from app.models.sources import Source
from app.schemas.agents.citation_reviewer import CitationReviewerResult
from app.schemas.agents.fact_reviewer import FactReviewerResult, FactReviewRunRequest
from app.schemas.agents.writer import WriterResult
from app.services.drafts.draft_service import draft_service
from app.services.reviews.checks import check_citations
from app.services.reviews.claim_extractor import claim_extractor
from app.services.reviews.fact_review_service import fact_review_service

logger = logging.getLogger(__name__)


def _is_drafting_intent(text: str | None) -> bool:
    if not text:
        return False
    t = text.lower().strip()
    has_draft_verb = bool(
        re.search(
            r"\b(draft|make|prepare|write|create|generate|file|build|compose|author)\b",
            t,
        )
    )
    has_doc_noun = bool(
        re.search(
            r"\b(draft|brief|application|petition|synopsis|notice|pleading|case|file|doc|document|affidavit|complaint|submission)\b",
            t,
        )
    )
    has_phrase = bool(
        re.search(
            r"\b(make.*draft|draft.*for|draft.*against|draft.*base|create.*draft|write.*draft|file.*case|case.*file|make it)\b",
            t,
        )
    )
    return has_phrase or (has_draft_verb and has_doc_noun)
ResultT = TypeVar("ResultT", bound=BaseModel)


def _extract_json(raw: str) -> str:
    """Strip markdown code fences and leading noise to extract a JSON object."""
    text = raw.strip()
    # Remove ```json ... ``` or ``` ... ``` wrapping
    if text.startswith("```"):
        # Strip opening fence (```json or ```)
        first_newline = text.find("\n")
        if first_newline != -1:
            text = text[first_newline + 1 :]
        # Strip closing fence
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
        text = text.strip()
    # Some models prefix with a bare "json\n" or "JSON\n"
    if text.lower().startswith("json\n") or text.lower().startswith("json\r"):
        text = text[4:].strip()
    # Find the first '{' and last '}' to extract the JSON object
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        text = text[start : end + 1]
    return text


def _format_handoff(
    formatter_factory: Callable[..., Agent],
    result_model: type[ResultT],
    role: str,
    handoff: object,
) -> ResultT:
    base_prompt = f"{role} handoff:\n\n{handoff}"
    prompt = base_prompt
    for attempt in range(3):
        try:
            formatted = invoke_with_fallback(
                lambda model: formatter_factory(model),
                prompt,
                f"{role} formatter",
            )
            if formatted.structured_output is not None:
                return result_model.model_validate(formatted.structured_output)
            return result_model.model_validate_json(_extract_json(str(formatted)))
        except Exception as exc:
            if attempt == 2:
                raise
            logger.info(
                "Retrying %s formatter after %s on attempt %s", role, type(exc).__name__, attempt + 1
            )
            prompt = (
                f"{base_prompt}\n\nThe previous attempt was rejected: {type(exc).__name__}. "
                "Return one raw JSON object only. Do not wrap it in markdown code fences, "
                "do not add prose before or after it, and include every required field."
            )
    raise RuntimeError("formatter retry loop ended unexpectedly")



def _append_event(db, run_id: UUID, event_type: str, payload: dict) -> None:
    sequence = (
        db.scalar(select(func.max(AgentEvent.sequence)).where(AgentEvent.run_id == run_id)) or 0
    )
    db.add(AgentEvent(run_id=run_id, sequence=sequence + 1, event_type=event_type, payload=payload))
    db.commit()


def _think(db, run_id: UUID, text: str) -> None:
    _append_event(db, run_id, "agent.thinking", {"text": text})


def _say(db, run_id: UUID, text: str) -> None:
    _append_event(db, run_id, "message.delta", {"text": text})


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
            is_drafting = (
                (run.agent == "main" and run.requested_action == "draft_and_review")
                or (
                    run.agent == "main"
                    and run.matter_id
                    and message
                    and _is_drafting_intent(message.content)
                )
            )
            if is_drafting:
                _think(db, run_id, "Reading the authorized Matter records and selecting a document form.")
                _append_event(
                    db,
                    run_id,
                    "tool.started",
                    {"tool": "writer", "summary": "Drafting from authorized Matter sources"},
                )
                writer_context = [
                    f"User Drafting Request: {message.content}",
                    "Task: Create a new authoritative legal working draft from authorized Matter evidence. "
                    "Analyze the attached records (invoices, default notices, contracts, communications). "
                    "Formulate a structured pleading, statutory notice, or petition with proper legal grounds. "
                    "Cite facts strictly from retrieved evidence and use precise '[PLACEHOLDER: ...]' "
                    "placeholders for any details not found in the records. "
                    "Draft the document now. Do not ask the user for more details before drafting and do "
                    "not return a questionnaire; every missing detail becomes a placeholder plus one "
                    "focused unresolved question.",
                ]
                if run.source_ids:
                    writer_context.append(
                        f"Sources selected by the user: {', '.join(run.source_ids)}"
                    )
                writer_result = invoke_with_fallback(
                    lambda model: create_writer_agent(
                        db, run.matter_id, model=model, allow_document_writes=False
                    ),
                    "\n\n".join(writer_context),
                    "Writer",
                )
                proposal = _format_handoff(
                    create_writer_formatter, WriterResult, "Writer", writer_result
                )
                if not proposal.operations:
                    raise ValueError("Writer returned no document operations")

                first_line = (message.content or "").strip().splitlines()
                title = (first_line[0][:120] if first_line else "") or "Legal working draft"
                version = draft_service.create_draft(
                    db=db,
                    matter_id=run.matter_id,
                    title=title,
                    operations=proposal.operations,
                    created_by_id=str(run.user_id),
                )
                run.document_id = version.draft_id
                run.base_version_id = version.id
                db.add(run)
                db.commit()
                _append_event(
                    db,
                    run_id,
                    "tool.completed",
                    {"tool": "writer", "summary": "Created an immutable working draft"},
                )
                _say(
                    db,
                    run_id,
                    f"I drafted **{title}** as version 1 with "
                    f"{len(proposal.operations)} evidence-linked section(s).",
                )

                _think(db, run_id, "Extracting factual claims and comparing them with the Matter records.")
                _append_event(
                    db,
                    run_id,
                    "tool.started",
                    {
                        "tool": "fact_review",
                        "summary": "Checking factual claims against Matter evidence",
                    },
                )
                fact_review = None
                fact_status = "unavailable"
                try:
                    fact_review = fact_review_service.run(
                        db=db,
                        version_id=version.id,
                        user_id=run.user_id,
                        request=FactReviewRunRequest(checks=["fact"], mode="review_only"),
                        idempotency_key=f"{run.idempotency_key}:facts",
                    )
                    fact_status = "completed"
                except Exception as exc:
                    db.rollback()
                    logger.warning(
                        "Fact review unavailable for run %s: %s", run_id, type(exc).__name__
                    )
                    _append_event(
                        db,
                        run_id,
                        "tool.completed",
                        {
                            "tool": "fact_review",
                            "summary": "Fact review could not run. Claims stay unresolved.",
                            "status": "unavailable",
                        },
                    )
                    _say(
                        db,
                        run_id,
                        "Fact review could not run on this version, so every factual claim "
                        "stays **unresolved** rather than verified.",
                    )

                fact_findings = list(fact_review.findings) if fact_review else []
                fact_counts = fact_review.summary if fact_review else {}
                if fact_status == "completed":
                    _append_event(
                        db,
                        run_id,
                        "tool.completed",
                        {
                            "tool": "fact_review",
                            "summary": f"Recorded {len(fact_findings)} factual finding(s)",
                            "summary_counts": fact_counts,
                        },
                    )
                    _say(
                        db,
                        run_id,
                        f"Fact review recorded {len(fact_findings)} finding(s): "
                        f"{fact_counts.get('supported', 0)} supported, "
                        f"{fact_counts.get('contradicted', 0)} contradicted, "
                        f"{fact_counts.get('unresolved', 0)} unresolved.",
                    )

                reviewed_version_id = (
                    fact_review.document_version_id if fact_review else version.id
                )
                reviewed_version = draft_service.get_document_version(
                    db=db,
                    version_id=reviewed_version_id,
                    matter_id=run.matter_id,
                )

                _think(db, run_id, "Checking every authority for identity, quotation, and proposition support.")
                _append_event(
                    db,
                    run_id,
                    "tool.started",
                    {"tool": "citation_review", "summary": "Checking citations in the new draft"},
                )
                citation_findings = []
                citation_status = "unavailable"
                try:
                    citation_findings = check_citations(db, reviewed_version)
                    citation_status = "completed"
                    _append_event(
                        db,
                        run_id,
                        "tool.completed",
                        {
                            "tool": "citation_review",
                            "summary": f"Recorded {len(citation_findings)} citation finding(s)",
                        },
                    )
                    _say(
                        db,
                        run_id,
                        f"Citation review recorded {len(citation_findings)} finding(s) across "
                        "identity, quotation, proposition support, and legal treatment.",
                    )
                except Exception as exc:
                    db.rollback()
                    logger.warning(
                        "Citation review unavailable for run %s: %s", run_id, type(exc).__name__
                    )
                    _append_event(
                        db,
                        run_id,
                        "tool.completed",
                        {
                            "tool": "citation_review",
                            "summary": "Citation review could not run. Authorities stay unresolved.",
                            "status": "unavailable",
                        },
                    )
                    _say(
                        db,
                        run_id,
                        "Citation review could not run, so the cited authorities stay "
                        "**unresolved** and still need counsel review.",
                    )

                _append_event(
                    db,
                    run_id,
                    "artifact.ready",
                    {
                        "document_id": str(version.draft_id),
                        "document_version_id": str(reviewed_version.id),
                    },
                )
                summary_lines = [
                    f"I created the working draft **{title}** and ran the verification passes."
                ]
                if fact_status == "completed":
                    summary_lines.append(
                        f"Fact review recorded {len(fact_findings)} finding(s) "
                        f"({fact_counts.get('supported', 0)} supported, "
                        f"{fact_counts.get('contradicted', 0)} contradicted, "
                        f"{fact_counts.get('unresolved', 0)} unresolved)."
                    )
                else:
                    summary_lines.append(
                        "Fact review was unavailable, so factual claims remain unresolved."
                    )
                if citation_status == "completed":
                    summary_lines.append(
                        f"Citation review recorded {len(citation_findings)} finding(s)."
                    )
                else:
                    summary_lines.append(
                        "Citation review was unavailable, so authorities remain unresolved."
                    )
                summary_lines.append(
                    "Open the draft to inspect the exact evidence and the unresolved items."
                )
                run.result = {
                    "document_id": str(version.draft_id),
                    "document_version_id": str(reviewed_version.id),
                    "fact_finding_ids": [str(item.id) for item in fact_findings],
                    "citation_finding_ids": [str(item.id) for item in citation_findings],
                    "fact_review_status": fact_status,
                    "citation_review_status": citation_status,
                    "assumptions": proposal.assumptions,
                    "unresolved_questions": proposal.unresolved_questions,
                    "message": " ".join(summary_lines),
                }

            elif run.agent == "writer":
                _think(db, run_id, "Inspecting the base version before proposing any edit.")
                _append_event(
                    db,
                    run_id,
                    "tool.started",
                    {"tool": "writer", "summary": "Preparing evidence-linked document operations"},
                )
                context = [message.content]
                if run.base_version_id:
                    context.append(f"Current document version ID: {run.base_version_id}")
                if run.source_ids:
                    context.append(f"Sources selected by the user: {', '.join(run.source_ids)}")
                result = invoke_with_fallback(
                    lambda model: create_writer_agent(
                        db, run.matter_id, model=model, allow_document_writes=False
                    ),
                    "\n\n".join(context),
                    "Writer",
                )
                proposal = _format_handoff(create_writer_formatter, WriterResult, "Writer", result)
                if not proposal.operations or run.document_id is not None:
                    version = None
                else:
                    version = draft_service.create_draft(
                        db=db,
                        matter_id=run.matter_id,
                        title=(message.content or "").strip()[:120] or "Legal working draft",
                        operations=proposal.operations,
                        created_by_id=str(run.user_id),
                    )
                is_proposal = bool(run.document_id and proposal.operations)
                run.result = {
                    "document_id": (
                        str(version.draft_id)
                        if version
                        else str(run.document_id)
                        if run.document_id
                        else None
                    ),
                    "document_version_id": str(version.id) if version else None,
                    "base_version_id": str(run.base_version_id) if run.base_version_id else None,
                    "proposed_operations": [
                        operation.model_dump(mode="json") for operation in proposal.operations
                    ]
                    if run.document_id is not None
                    else [],
                    "proposal_status": "pending" if is_proposal else None,
                    "assumptions": proposal.assumptions,
                    "unresolved_questions": proposal.unresolved_questions,
                    "message": (
                        f"I prepared {len(proposal.operations)} proposed edit(s) against the "
                        "current version. Accept to create a new immutable version, or reject to "
                        "leave the draft unchanged."
                    )
                    if is_proposal
                    else (
                        f"I drafted a new working document with {len(proposal.operations)} "
                        "evidence-linked section(s)."
                        if version
                        else "I could not derive any safe document operation from this request."
                    ),
                }
                _append_event(
                    db,
                    run_id,
                    "tool.completed",
                    {
                        "tool": "writer",
                        "summary": f"Prepared {len(proposal.operations)} document operation(s)",
                    },
                )
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
            elif run.agent == "citation_reviewer" or run.requested_action == "review_citations":
                version = draft_service.get_document_version(
                    db=db,
                    version_id=run.base_version_id,
                    matter_id=run.matter_id,
                )
                _append_event(
                    db,
                    run_id,
                    "tool.started",
                    {"tool": "citation_review", "summary": "Checking stored legal authorities"},
                )
                findings = check_citations(db, version)
                dimensions: dict[str, list[str]] = {}
                for item in findings:
                    dimensions.setdefault(item.dimension, []).append(item.status)
                reviewer_result = None
                reviewer_status = "unavailable"
                try:
                    agent_result = invoke_with_fallback(
                        lambda model: create_citation_reviewer_agent(
                            db, version.id, model=model
                        )[0],
                        "Review the persisted citation findings for document version "
                        f"{version.id}. Return all four dimensions and precise next actions.",
                        "Citation Reviewer",
                    )
                    reviewer_result = _format_handoff(
                        create_citation_reviewer_formatter,
                        CitationReviewerResult,
                        "Citation Reviewer",
                        agent_result,
                    )
                    reviewer_status = "completed"
                except Exception as exc:
                    logger.warning(
                        "Citation Reviewer summary unavailable for run %s: %s",
                        run_id,
                        type(exc).__name__,
                    )
                run.result = {
                    "document_id": str(run.document_id),
                    "document_version_id": str(version.id),
                    "finding_ids": [str(item.id) for item in findings],
                    "dimensions": dimensions,
                    "reviewer_status": reviewer_status,
                    "reviewer_report": (
                        reviewer_result.model_dump(mode="json") if reviewer_result else None
                    ),
                    "suggested_actions": reviewer_result.suggested_actions
                    if reviewer_result
                    else [
                        "Open unresolved findings and attach an authoritative source.",
                        "Have counsel review proposition support and later legal treatment.",
                    ],
                    "message": reviewer_result.message
                    if reviewer_result
                    else (
                        "Citation checks were saved, but the Citation Reviewer summary is "
                        "unavailable. Open the findings to review unresolved dimensions."
                    ),
                }
                _append_event(
                    db,
                    run_id,
                    "tool.completed",
                    {
                        "tool": "citation_review",
                        "summary": f"Created {len(findings)} citation findings",
                        "dimensions": dimensions,
                    },
                )
            elif run.agent == "fact_reviewer" or run.requested_action in (
                "review_facts",
                "apply_safe_fact_fixes",
            ):
                mode = (
                    "apply_safe_fixes"
                    if run.requested_action == "apply_safe_fact_fixes"
                    else "review_only"
                )
                _append_event(
                    db,
                    run_id,
                    "tool.started",
                    {
                        "tool": "fact_review",
                        "summary": "Verifying factual claims against Matter records and public registries",
                    },
                )
                review = fact_review_service.run(
                    db=db,
                    version_id=run.base_version_id,
                    user_id=run.user_id,
                    request=FactReviewRunRequest(checks=["fact"], mode=mode),
                    idempotency_key=run.idempotency_key,
                )
                for finding in review.findings:
                    _append_event(
                        db,
                        run_id,
                        "finding.created",
                        {
                            "finding_id": str(finding.id),
                            "claim_id": str(finding.claim_id) if finding.claim_id else None,
                            "dimension": finding.dimension,
                            "status": finding.status,
                            "claim_text": finding.claim_text,
                            "reason": finding.reason,
                        },
                    )

                version = draft_service.get_document_version(
                    db=db,
                    version_id=review.document_version_id,
                    matter_id=run.matter_id,
                )
                fact_claims = claim_extractor.extract_claims(
                    document_version_id=version.id,
                    content_json=version.content_json,
                )

                reviewer_result = None
                reviewer_status = "unavailable"
                try:
                    agent_prompt = (
                        f"Perform factual verification for document version {review.document_version_id} "
                        f"in Matter {run.matter_id}. There are {len(review.findings)} finding(s) recorded. "
                        "Review unresolved claims and verify against official sources. "
                        "Return a complete plain-text handoff for the formatting pass."
                    )
                    agent_result = invoke_with_fallback(
                        lambda model: create_fact_reviewer_agent(
                            db=db,
                            matter_id=run.matter_id,
                            document_version_id=review.document_version_id,
                            claims=fact_claims,
                            model=model,
                            allow_fixes=(mode == "apply_safe_fixes"),
                        )[0],
                        agent_prompt,
                        "Fact Reviewer",
                    )
                    reviewer_result = _format_handoff(
                        create_fact_reviewer_formatter,
                        FactReviewerResult,
                        "Fact Reviewer",
                        agent_result,
                    )
                    reviewer_status = "completed"
                except Exception as exc:
                    logger.warning(
                        "Fact Reviewer reasoning unavailable for run %s: %s",
                        run_id,
                        type(exc).__name__,
                    )

                _append_event(
                    db,
                    run_id,
                    "tool.completed",
                    {
                        "tool": "fact_review",
                        "summary": f"Completed fact verification with {len(review.findings)} finding(s)",
                        "summary_counts": review.summary,
                    },
                )
                _append_event(
                    db,
                    run_id,
                    "artifact.ready",
                    {
                        "document_id": str(run.document_id) if run.document_id else None,
                        "document_version_id": str(review.document_version_id),
                        "finding_count": len(review.findings),
                    },
                )
                run.result = {
                    "document_id": str(run.document_id) if run.document_id else None,
                    "document_version_id": str(review.document_version_id),
                    "base_version_id": str(run.base_version_id) if run.base_version_id else None,
                    "mode": mode,
                    "finding_count": len(review.findings),
                    "findings": [f.model_dump(mode="json") for f in review.findings],
                    "summary": review.summary,
                    "reviewer_status": reviewer_status,
                    "reviewer_report": (
                        reviewer_result.model_dump(mode="json") if reviewer_result else None
                    ),
                    "created_version_id": (
                        str(review.created_version_id) if review.created_version_id else None
                    ),
                    "applied_correction_ids": [str(cid) for cid in review.applied_correction_ids],
                    "blocked_correction_ids": [str(cid) for cid in review.blocked_correction_ids],
                    "message": (
                        f"Fact verification completed with {len(review.findings)} finding(s). "
                        f"Review summary: {review.summary.get('supported', 0)} supported, "
                        f"{review.summary.get('needs_review', 0)} needs review, "
                        f"{review.summary.get('contradicted', 0)} contradicted, "
                        f"{review.summary.get('unresolved', 0)} unresolved."
                    ),
                }
            else:
                matter_info = ""
                if run.matter_id:
                    matter = db.get(Matter, run.matter_id)
                    if matter:
                        matter_info = (
                            "=== CURRENT ATTACHED MATTER CONTEXT ===\n"
                            f"Matter Name: {matter.title}\n"
                            f"Matter ID: {matter.id}\n"
                            f"Case Number: {matter.case_number or 'Not assigned'}\n"
                            f"Court / Forum: {matter.court or 'Not specified'}\n"
                            f"Matter Type: {matter.matter_type}\n"
                            f"Stage: {matter.stage}\n"
                        )
                        if matter.description:
                            matter_info += f"Description: {matter.description}\n"

                        sources = db.scalars(
                            select(Source)
                            .where(Source.matter_id == run.matter_id)
                            .order_by(Source.created_at.desc())
                        ).all()
                        if sources:
                            matter_info += f"\nAttached Documents / Sources in this Matter ({len(sources)} available):\n"
                            for s in sources[:10]:
                                matter_info += f"- {s.canonical_title} [Type: {s.source_type}, Authority: {s.authority_level}]\n"
                        else:
                            matter_info += "\nAttached Documents: No files uploaded to this matter yet.\n"

                        drafts = db.scalars(
                            select(Draft)
                            .where(Draft.matter_id == run.matter_id)
                            .order_by(Draft.created_at.desc())
                        ).all()
                        if drafts:
                            matter_info += f"\nWorking Drafts in this Matter ({len(drafts)}):\n"
                            for d in drafts[:5]:
                                matter_info += f"- {d.title} (v{d.version_no}, {d.kind})\n"

                        matter_info += (
                            f"\nINSTRUCTION REGARDING ATTACHED MATTER:\n"
                            f"You are actively working inside Matter '{matter.title}'. "
                            f"If the user asks whether you can see, recognize, or access the attached matter or documents, "
                            f"confirm clearly that you have full access to Matter '{matter.title}' (Case: {matter.case_number or 'Pending'}, Court: {matter.court or 'General'}), "
                            f"mention any attached documents listed above, and explain what you can do (drafting pleadings, fact review against records, or citation verification).\n\n"
                        )

                _think(db, run_id, "Reviewing the Matter context and the conversation so far.")
                history = db.scalars(
                    select(Message)
                    .where(Message.thread_id == run.thread_id)
                    .order_by(Message.created_at.desc())
                    .limit(11)
                ).all()
                history = list(reversed(history))
                convo = [f"{m.role}: {m.content[:2000]}" for m in history if m.id != message.id][
                    -10:
                ]
                prompt = ""
                if matter_info:
                    prompt += matter_info
                if convo:
                    prompt += "Conversation so far:\n" + "\n".join(convo) + "\n\n"
                prompt += f"Current user message: {message.content}"
                result = invoke_with_fallback(
                    lambda model: create_main_agent(model=model),
                    prompt,
                    "Main Agent",
                )
                response_text = str(result)[:10000]
                db.add(Message(thread_id=run.thread_id, role="assistant", content=response_text))
                run.result = {"message": response_text}
                _append_event(db, run_id, "message.created", {"text": response_text})
            run.status = "completed"
            _append_event(db, run_id, "task.completed", {"status": "completed"})
        except Exception as exc:
            db.rollback()
            logger.exception("Agent run %s failed: %s: %s", run_id, type(exc).__name__, exc)
            try:
                run = db.get(AgentRun, run_id)
                if run is not None:
                    err_detail = f"{type(exc).__name__}: {exc}"[:200]
                    run.status = "failed"
                    run.error_code = "agent_unavailable"
                    run.result = {"message": err_detail}
                    db.add(run)
                    db.flush()
                    _append_event(
                        db,
                        run_id,
                        "task.failed",
                        {"code": "agent_unavailable", "message": err_detail},
                    )
                    db.commit()
            except Exception as commit_exc:
                logger.error("Failed to persist error state for run %s: %s", run_id, commit_exc)
                db.rollback()


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
