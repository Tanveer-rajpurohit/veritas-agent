# Agent implementation contract

This document is the frontend integration contract for the single visible Veritas Main Agent.
Specialists are application-routed roles; the UI does not expose an agent selector.

## Frontend implementation status

The protected application routes validate the current user before mounting workspace or agent
queries. Workspace and Agent matter selectors use the authenticated Matter API; source uploads and
downloads also use the authenticated API rather than local demo records or public object URLs.

The visual Agent chat is still a demo surface. Persisted threads, messages, agent runs, SSE event
replay, finding resolution, and proposal accept/reject hooks exist in `apps/web`, but they are not
yet connected to `AgentChatView`. Until that wiring is complete, demo responses must not be
presented as completed backend analysis, verified legal work, or durable conversation history.

Before calling the Agent frontend production-ready, complete this flow:

1. Select an authenticated Matter returned by `GET /api/v1/matters/`.
2. Create or reuse a persisted thread, then persist the user's message.
3. Create an agent run with the returned thread and message identifiers.
4. Consume authenticated SSE events and reconnect with `Last-Event-ID` after interruption.
5. Render only safe activity summaries from persisted events; never simulated reasoning.
6. Fetch the terminal run result and linked findings from their authenticated endpoints.
7. For Writer proposals, render a preview and connect Apply, Reject, and Keep Editing exactly as
   specified below.
8. Remove seeded sessions, seeded draft artifacts, timer-generated answers, and client-only draft
   downloads from the production Agent path.

## Why runs use a worker

`app/agents/main_agent.py` configures the Strands model and prompt. It can interpret a request, but
it is not a job queue, authorization boundary, audit store, or database transaction manager.

`app/workers/agent_runs.py` is the trusted executor. It atomically claims a persisted run, invokes
the requested specialist, validates typed output, writes safe events before they are streamed, and
records completion or failure. A disconnected browser can reconnect without restarting the model
task. Models never receive permission to approve edits, resolve findings, or export documents.

## Create a run

`POST /api/v1/matters/{matter_id}/agent-runs`

Headers: `Authorization: Bearer …`, `Idempotency-Key: <unique key>`

```json
{
  "thread_id": "uuid",
  "message_id": "uuid",
  "agent": "main",
  "document_id": "uuid",
  "document_version_id": "uuid",
  "source_ids": [],
  "requested_action": "review_citations"
}
```

Supported Main Agent actions are `answer`, `review_citations`, and `review_facts`. Drafting currently
uses the `writer` role internally. The server validates the thread, message, Matter, document,
version, and every selected source.

## Read state and activity

- `GET /api/v1/agent-runs/{run_id}` returns durable state and the typed result.
- `GET /api/v1/agent-runs/{run_id}/events` returns `text/event-stream`.
- Reconnect with `Last-Event-ID: {run_id}:{sequence}` to replay only later events.

Event names currently include:

- `task.queued`, `task.started`, `task.completed`, `task.failed`;
- `tool.started`, `tool.completed`;
- `message.created`, `artifact.ready`.

Render activity summaries such as “Checking stored legal authorities.” Do not label this panel
“chain of thought,” and do not request or render private reasoning. Tool events may show the tool
name, source title, result counts, dimensions, limitations, and safe error code.

## Citation result

Citation review first persists deterministic findings, then invokes the bounded Strands Citation
Reviewer to synthesize a typed report. The run returns `finding_ids`, the document version, every
status observed per dimension, `reviewer_status`, and `reviewer_report`. If inference is unavailable,
the findings remain available and no report is fabricated. Fetch findings from:

`GET /api/v1/document-versions/{version_id}/findings`

Citation evidence includes `source_title`, `source_url`, and `source_url_verified`. A verified URL
means HTTPS plus an approved legal-source host; it does not mean the proposition or legal treatment
was verified. Render identity, quotation, support, and treatment as separate rows.

The specialist tools are `get_citation_findings`, `lookup_statute`, `search_cases`, and
`fetch_case`. The document version is fixed server-side. `fetch_case` accepts only a candidate
returned by `search_cases` in the same run.

## Writer proposal: preview, accept, reject

A revision run does not edit the document. Its result contains:

```json
{
  "document_id": "uuid",
  "base_version_id": "uuid",
  "proposed_operations": [],
  "proposal_status": "pending",
  "assumptions": [],
  "unresolved_questions": []
}
```

The frontend should render a diff or operation preview with three actions:

- **Accept changes** calls `POST /api/v1/agent-runs/{run_id}/apply` with a new
  `Idempotency-Key`. The backend rechecks editor permission and the base version, then creates one
  immutable version. A stale base returns `409` and never overwrites newer work.
- **Reject** calls `POST /api/v1/agent-runs/{run_id}/reject`. No document version is created.
- **Keep editing** leaves the proposal pending.

An accepted proposal cannot be rejected. A rejected proposal cannot be applied. Repeating apply
with the same idempotency key returns the same document version.

## UI states

Show `queued`, `running`, `partial`, `completed`, and `failed` distinctly. A successful model call
may still contain unresolved findings. Use “I could not confirm this citation from the available
sources” and identify the missing source or human review. Never display “verified” from a search hit,
a URL, model memory, or one aggregate score.

## Public company facts

Fact Reviewer can call `lookup_company_master` with an exact CIN. The backend queries the MCA
Company Master Data resource on data.gov.in and stores the returned record as versioned global
evidence. The result may support only fields present in that record, such as company identity,
registration status, registered office, and capital. It cannot verify debt, default, notice delivery,
or insolvency status. An unavailable or missing record remains unresolved.

## Export from the agent page

The document-preview export buttons must use the backend rather than generating a trusted-looking
file only in the browser:

1. `POST /api/v1/document-versions/{version_id}/exports` with an `Idempotency-Key` and
   `{"format":"pdf","mode":"draft"}` or `{"format":"json","mode":"draft"}`.
2. Use the returned authenticated `download_url`.
3. `GET /api/v1/exports/{export_id}/download` downloads the server-generated artifact.

Only draft PDF and JSON exports are currently implemented. The UI must not offer a reviewed export
or imply DOCX is server-verified. Reviewed export remains disabled until the backend review gate is
implemented.
