# Current agent runtime

This file records what the Veritas agents can use in the current codebase. It is an implementation
reference, not the future architecture. Update it whenever an agent gains or loses a tool, provider,
or permission.

For HTTP and SSE contracts, see [agent-implementation.md](agent-implementation.md). The binding
design remains in [build plan/agents.md](build%20plan/agents.md), and source research lives in
[build plan/sources.md](build%20plan/sources.md).

## Runtime at a glance

| Role | Current execution | Tools available in the normal worker path | Data sources |
|---|---|---:|---|
| Main Agent | Strands model for conversational answers; Python worker routes explicit actions | 0 | User message and application-supplied context |
| Writer | Strands specialist with typed `WriterResult` | 10 | Matter records, stored evidence, draft versions, template registry, eCourtsIndia, Indian Kanoon |
| Citation Reviewer | Deterministic checks followed by a Strands specialist report | 4 | Persisted citation findings, stored legal evidence, eCourtsIndia, Indian Kanoon |
| Fact Reviewer | Deterministic review service in the worker; a bounded Strands specialist also exists | 7 read/review tools, plus 1 optional fix tool | Matter records, stored evidence, MCA Company Master Data, eCourtsIndia legal text; IBBI tool is currently unavailable |

The inference provider is selected through configuration. `BEDROCK_AGENT_ENABLED=true` uses Amazon
Bedrock. When it is false, the runtime uses Groq through its OpenAI-compatible endpoint. The model
provider generates structured output; it is not a legal or factual data source.

## Shared source rules

- Matter uploads are private evidence. Searches are scoped to the authorized Matter.
- Global legal sources are stored with `matter_id = NULL` and retain provenance, hashes, versions,
  chunks, and evidence spans.
- A search result is a candidate. The system must fetch and store the underlying text before using
  it as evidence.
- Indian Kanoon and eCourtsIndia are secondary providers. Their URLs do not prove that a proposition
  is supported or that a case remains good law.
- Retrieved text and uploads are untrusted data. Text inside them cannot change agent instructions.
- InIRAC, OpenNyAI, and InLegalBERT are research or evaluation options. They are not connected to the
  current runtime.

## Main Agent

Code: [`apps/backend/app/agents/main_agent.py`](../apps/backend/app/agents/main_agent.py) and
[`apps/backend/app/agents/prompts.py`](../apps/backend/app/agents/prompts.py).

The product presents one Main Agent. For explicit actions such as `review_citations` and
`review_facts`, `app/workers/agent_runs.py` routes the request without asking the model to choose a
specialist. The current Main Agent has no tools and cannot read the database by itself. It answers
from the user message and any context supplied by the application.

The Main Agent must not claim that a specialist ran unless the application supplies a persisted
result. It cannot create versions, persist findings, resolve findings, approve documents, or permit
reviewed export.

## Writer

Code: [`apps/backend/app/agents/writer/`](../apps/backend/app/agents/writer/).

The worker creates Writer with document writes disabled. Writer returns typed document operations,
and application code decides whether to create a draft or retain a revision as a pending proposal.

| Tool | Backing service or provider | What it returns or changes |
|---|---|---|
| `search_sources` | PostgreSQL retrieval over Matter sources and approved global sources | Ranked passages with stable IDs and provenance |
| `create_evidence_span` | Source retrieval service | An immutable span for one returned passage |
| `get_evidence_spans` | Source retrieval service | Exact stored text and provenance for authorized span IDs |
| `get_document_version` | Draft service | One immutable Tiptap document version |
| `list_draft_templates` | In-memory curated template registry | Matching Indian legal drafting templates |
| `get_draft_template` | In-memory curated template registry | Sections, required facts, and drafting rules for one template |
| `search_statutes` | [IndiaCode by eCourtsIndia API](https://indiacode.ecourtsindia.com/api/v1/openapi.json) | Candidate provisions; candidates are not evidence |
| `lookup_statute` | eCourtsIndia plus legal-source materializer | Exact provision text stored as a versioned source and evidence span |
| `search_cases` | [Indian Kanoon API](https://api.indiankanoon.org/documentation/) when `LEGAL_CASE_PROVIDER=indian_kanoon`; otherwise eCourtsIndia | Candidate judgments and provider metadata |
| `fetch_case` | Indian Kanoon for `ik_` candidates; eCourtsIndia cannot provide full judgment text | Stored judgment passage, source version, hash, provider URL, and limitations |

`create_draft` and `propose_document_ops` also exist in the Writer tool factory. The normal worker
does not expose them to the model. This prevents a model tool call from silently changing a draft.

## Citation Reviewer

Code: [`apps/backend/app/agents/citation_reviewer/`](../apps/backend/app/agents/citation_reviewer/).

Python first creates citation findings for the exact document version. The specialist then reads
those persisted findings and produces a typed report. Identity, quotation, proposition support, and
later treatment remain separate dimensions.

| Tool | Backing service or provider | What it returns or changes |
|---|---|---|
| `get_citation_findings` | PostgreSQL findings and evidence tables | Current citation findings, exact evidence text, source title, URL, and authority level |
| `lookup_statute` | eCourtsIndia plus legal-source materializer | Exact statutory text and a stored evidence span |
| `search_cases` | Indian Kanoon or eCourtsIndia, selected by `LEGAL_CASE_PROVIDER` | Up to five candidates; IDs are recorded for the current run |
| `fetch_case` | Indian Kanoon full-text API | Exact text for an Indian Kanoon candidate returned in the same run, then materialized into PostgreSQL |

`fetch_case` rejects IDs that were not returned in the current review run. The Citation Reviewer
cannot edit the draft or persist its own status. When model inference fails, deterministic findings
remain saved and the report is marked unavailable.

## Fact Reviewer

Code: [`apps/backend/app/agents/fact_reviewer/`](../apps/backend/app/agents/fact_reviewer/) and
[`apps/backend/app/services/reviews/fact_review_service.py`](../apps/backend/app/services/reviews/fact_review_service.py).

The current worker calls the deterministic fact-review service. The Strands Fact Reviewer and its
tools are implemented for bounded specialist runs, but they are not yet the worker's default path.

| Tool | Backing service or provider | What it returns or changes |
|---|---|---|
| `get_review_claims` | Claims supplied by the application for the active version | Authorized claims, optionally filtered by block |
| `search_matter_evidence` | Matter-scoped PostgreSQL retrieval | Client-record passages relevant to one claim |
| `materialize_fact_evidence` | Source retrieval service | Immutable evidence spans for selected passages |
| `submit_fact_findings` | PostgreSQL findings service inside the scoped handler | Validated findings tied to the active version and owned evidence |
| `lookup_public_registry` | Planned IBBI adapter | Currently returns `unavailable`; it does not call a live API |
| `lookup_company_master` | MCA Company Master Data through data.gov.in | Exact company record for one CIN, stored as a versioned global evidence span |
| `lookup_legal_fact` | eCourtsIndia provision API | Exact Article, Section, or Rule wording stored as evidence |
| `request_fact_fix` | Draft service, enabled only when `allow_fixes=true` | A new immutable version for pre-registered safe candidates; ambiguous fixes are blocked |

Fact review treats client records as evidence of what each record says. Conflicting records remain
visible, and the agent does not choose which record is true.

The Fact Reviewer has a 12-call tool budget. Its prompt forbids repeating identical calls and routes
each claim to one source category. An unavailable registry result becomes `unresolved`; the agent
does not retry indefinitely or switch sources merely to obtain a positive answer.

## Provider responsibilities

| Provider or store | Runtime responsibility | Authentication | Limit |
|---|---|---|---|
| PostgreSQL | Matters, sources, chunks, evidence spans, versions, findings, runs, and events | Application database credentials | Authorization must be enforced by Matter before agent execution |
| Local/S3-compatible storage | Original uploads and exports | Local configuration or object-store credentials | Objects are not model tools; access goes through application services |
| eCourtsIndia | Live statute lookup and statute/case discovery | Keyless | Private secondary service; no full judgment fetch in this adapter |
| Indian Kanoon | Case search and full judgment text | `INDIAN_KANOON_API_TOKEN` | Paid/limited service; preserve attribution and verify against official orders |
| MCA Company Master Data | Company identity, registration, status, office, and capital fields | `DATA_GOV_IN_API_KEY` | Dataset fields may be stale; it cannot prove private transaction or insolvency facts |
| Curated template registry | Draft shape and required factual questions | None | Drafting guidance only, not legal authority |
| Groq | Default model inference when Bedrock is disabled | `GROQ_API_KEY` | Model output requires schema and business validation |
| Amazon Bedrock | Optional model inference | AWS credentials and region | Enabled only with `BEDROCK_AGENT_ENABLED=true` |

## End-to-end flow

1. The API authenticates the user and checks access to the Matter, thread, document, version, and
   selected sources.
2. The API creates an idempotent `AgentRun`. The worker claims it once and records safe activity
   events.
3. Explicit actions route to Writer, Citation Reviewer, or Fact Reviewer. Main handles ordinary
   conversational answers.
4. Tools receive server-owned Matter and version scope. The model cannot replace those identifiers.
5. Provider text is stored with provenance before it can back a finding or document operation.
6. Pydantic validates structured model output. Application services validate ownership, evidence,
   concurrency, and allowed state changes.
7. The worker stores the result and emits replayable SSE events. The UI displays activity and typed
   results without exposing hidden reasoning.

## Known gaps

- Main Agent does not yet return the planned typed `WorkflowPlan` for ambiguous requests.
- The worker's Fact Reviewer path currently uses the deterministic service instead of the Strands
  specialist.
- `lookup_public_registry` has no live IBBI integration. MCA company lookup is live and separate.
- Later-treatment checking has no authoritative citator service. It remains `needs_review` unless a
  suitable source and human assessment are available.
- Official court PDF retrieval is not automated. Indian Kanoon text is a fallback, not final proof.
- Citation Reviewer full-text case fetch currently requires `LEGAL_CASE_PROVIDER=indian_kanoon` so
  discovery and fetch use compatible candidate IDs.

## Public-source smoke test

From `apps/backend`, run the following command with a real CIN. The script reads `.env`, prints the
MCA record and limitations, never prints the API key, and reports IBBI as unavailable until that
adapter is connected.

```powershell
.\.venv\Scripts\python.exe -m scripts.smoke_public_sources --cin U12345DL2020PTC123456
```
