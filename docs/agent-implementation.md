# Current agent implementation

This is the working contract for the agent runtime and frontend. Update it when a tool, data source, action, or permission changes.

## User-facing model

The product shows one Veritas Main Agent. The composer offers four work modes:

| Mode | Matter required | Runtime action |
| --- | --- | --- |
| Auto | No for a general answer; yes for evidence work | General stream or server-selected action |
| Draft + verify | Yes | Writer, Fact Reviewer, then Citation Reviewer |
| Check facts | Yes | Fact Reviewer on the latest saved draft |
| Check citations | Yes | Citation Reviewer on the latest saved draft |

Specialists are internal roles. The UI may name the role that performed an activity, but it does not expose separate agent chat rooms.

## Execution boundary

`app/agents/main_agent.py` configures the Strands model. `app/workers/agent_runs.py` is the trusted executor for Matter work. The worker claims a persisted run, invokes bounded specialists, validates typed results, records safe events, and commits application state.

The model cannot authorize a Matter, choose another user's source, approve an edit, mark a finding resolved, or export a reviewed document. Server-side code owns those decisions.

## Agent and source matrix

| Role | Tools and services | Data sources | Writes |
| --- | --- | --- | --- |
| Main Agent | General authenticated streaming; routes persisted Matter actions | User prompt and application-supplied context | Assistant message only |
| Writer | `search_sources`, `create_evidence_span`, `get_evidence_spans`, `get_document_version`, template lookup, statute lookup, case search and fetch | Matter passages, template registry, eCourtsIndia, Indian Kanoon | Returns typed document operations. The worker creates a draft or pending proposal. |
| Fact Reviewer | Claim extraction, Matter evidence search, evidence materialization, MCA lookup, legal provision lookup, finding submission, bounded safe fix request | Matter records, MCA Company Master Data, eCourtsIndia | Persists findings. A safe fix creates a new version only when enabled by application code. |
| Citation Reviewer | Persisted citation findings, statute lookup, case search, guarded case fetch | Stored evidence, eCourtsIndia, Indian Kanoon | Persists no draft edit. It returns a typed report over saved findings. |

## Draft + verify flow

1. `POST /api/v1/matters/{matter_id}/threads` creates or reuses a Matter-scoped conversation.
2. `POST /api/v1/threads/{thread_id}/messages` persists the user message.
3. `POST /api/v1/matters/{matter_id}/agent-runs` creates an idempotent run with `requested_action: "draft_and_review"`.
4. Writer returns typed operations. The worker creates version 1 of a new draft.
5. Fact review extracts claims and stores findings against that exact version.
6. Citation review stores identity, quotation, support, and treatment findings.
7. The run result includes the document and version identifiers plus finding identifiers.
8. The UI opens `/drafting/{document_id}` for editing and evidence inspection.

If a specialist fails, the run fails with a safe error. The worker does not invent a successful report.

## Existing draft review

Fact and citation actions use the latest draft in the selected Matter when the client does not supply a document identifier. The server resolves that draft only after checking the user's Matter role. A Matter with no draft returns an actionable `422` response.

Writer revisions remain proposals. Accepting a proposal calls `POST /api/v1/agent-runs/{run_id}/apply` with an idempotency key. The backend checks editor access and base-version freshness before creating a version. Rejecting calls `POST /api/v1/agent-runs/{run_id}/reject` and creates no version.

## Activity stream

`GET /api/v1/agent-runs/{run_id}/events` returns persisted server-sent events. Event types include `task.queued`, `task.started`, `tool.started`, `tool.completed`, `artifact.ready`, `message.created`, `task.completed`, and `task.failed`.

The frontend renders short activity labels such as "Checking factual claims against Matter evidence." It must not request, store, or display hidden reasoning. Reconnection uses `Last-Event-ID` so the server can replay later events.

## General conversation

Without a Matter, Auto mode calls `POST /api/v1/agent/chat/stream`. This path can answer general questions but has no private Matter context, cannot upload evidence, cannot create a draft, and cannot claim that a review ran.

## Attachments

Attachments require a selected Matter. The frontend uploads each file through `POST /api/v1/matters/{matter_id}/uploads`, receives a source identifier, and passes authorized source identifiers into the run. The API rejects any source outside the Matter or approved global corpus.

## Review semantics

- Supported means the stored evidence supports the checked claim or dimension.
- Contradicted means stored evidence conflicts with it.
- Unresolved means the available sources did not establish an answer.
- Stale means the document content changed after the finding was created.
- A verified source URL confirms only that the URL passed the provider and host checks. It does not prove proposition support or later treatment.

## Security requirements

- Authenticate every run, event stream, source, draft, finding, and export endpoint.
- Enforce Matter role checks on the server. Never trust a Matter or source identifier from the model.
- Keep provider keys and object-store credentials outside prompts and responses.
- Treat uploaded and retrieved text as untrusted content that cannot override the system prompt.
- Bound tool calls and reject repeated calls with the same arguments.
- Hash and version source text before it supports a finding.
- Do not log document bodies, tokens, secrets, or raw provider responses containing private data.

## Provider configuration

`BEDROCK_AGENT_ENABLED=true` selects Amazon Bedrock. When false, the runtime uses Groq. Provider selection changes inference only; it does not change the evidence rules.

See [sources.md](sources.md) for provider responsibilities and limitations, [mvp.md](mvp.md) for the demo acceptance path, and [presentation.md](presentation.md) for the submission narrative.

