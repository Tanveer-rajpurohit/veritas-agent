# Agent architecture and contracts

## Architecture

The visible “agents” are roles with narrow inputs, outputs, and tools. They run inside an application-controlled workflow. Strands supports the agents-as-tools pattern, where an orchestrator calls specialists; use it for delegation while keeping state transitions in Python. [Strands pattern](https://strandsagents.com/docs/user-guide/concepts/multi-agent/agents-as-tools/)

| Role | Purpose | May read | May write | Must not do |
|---|---|---|---|---|
| Main | Understand task, ask questions, sequence specialists, explain result | Matter metadata, chosen sources, documents/findings | Messages, workflow tasks; request validated document ops | Mark findings resolved, approve/export, invent evidence |
| Writer | Create/revise structured draft from supplied evidence | Draft brief, permitted evidence passages, template | Proposed document operations | Search outside allowed tools, approve its claims |
| Citation Reviewer | Inspect legal references and their support | Target version, legal sources/adapters | Citation findings/evidence links | Rewrite draft silently, equate “found” with good law |
| Fact Reviewer | Compare draft propositions with matter records | Target version, client-source spans | Fact findings/evidence links | Declare records true, make legal conclusions |

The translator is deferred. When added, it creates a new document version and invalidates semantic checks.

## Main-agent orchestration

Use deterministic routing for explicit UI actions. Use the main model for ambiguous chat tasks, but constrain its output to a WorkflowPlan schema. The executor validates source IDs, document IDs, allowed tools, maximum steps, and user authorization before running anything.

Specialists communicate only through typed results returned to the orchestrator and persisted task records. Do not pass private reasoning traces or allow free-form agent-to-agent loops.

## Core schemas

```json
{
  "WorkflowPlan": {
    "intent": "draft|revise|citation_review|fact_review|answer",
    "document_id": "uuid|null",
    "source_ids": ["uuid"],
    "steps": [{"agent": "writer", "task": "string", "depends_on": []}],
    "questions": ["string"]
  }
}
```

```json
{
  "Claim": {
    "claim_id": "uuid",
    "kind": "client_fact|legal_proposition|quotation|citation",
    "text": "string",
    "block_id": "string",
    "from": 0,
    "to": 32,
    "candidate_evidence_ids": ["uuid"]
  },
  "Finding": {
    "claim_id": "uuid",
    "dimension": "identity|quotation|support|treatment|fact_consistency",
    "status": "supported|contradicted|unresolved|needs_review",
    "evidence_span_ids": ["uuid"],
    "method": "exact|normalized|retrieval|model_assessment|human",
    "reason": "string",
    "limitations": ["string"]
  }
}
```

Strands structured output can validate schema-shaped model responses, but schema validity is not truth. Business validation must confirm referenced IDs exist and belong to the authorized matter. [Structured output](https://strandsagents.com/docs/user-guide/concepts/agents/structured-output/)

## Tool contracts

- `search_sources(matter_id, query, source_types, limit)` returns passages with stable IDs and provenance.
- `get_evidence_spans(ids)` returns exact text, offsets, page, source version, and checksum.
- `lookup_statute(act_key, provision)` returns text plus origin/provenance; no legal conclusion.
- `search_case(query)` returns candidates; never a verified status.
- `fetch_case(candidate_id)` returns identifiers and passages.
- `propose_document_ops(base_version, ops[])` validates and creates a candidate version.
- `submit_findings(document_version_id, findings[])` validates enumerations, evidence ownership, and claim hash.

Approval and export are application commands unavailable to every model.

## Context discipline

Retrieve the few passages needed per step. Keep uploaded document text inside delimited data fields; strip or quarantine instructions embedded within sources. Label every context block by origin. Cap tool calls and tokens per task. The main agent summarizes tool results for chat, while the evidence drawer shows exact stored passages.

## Failure behavior

If tools time out, return partial completion and list which checks did not run. If structured output fails validation, retry once with validation errors; then fail visibly. If source coverage is insufficient, request more records. If legal sources disagree or treatment is unknown, require human review.

## Model policy

Select models through configuration after a kickoff evaluation. Use a capable model for planning/drafting and a smaller model for bounded extraction or classification only if it passes fixtures. The user's ChatGPT Plus/Codex access can help build the project, but application inference through an API has separate authentication and billing. [OpenAI authentication](https://learn.chatgpt.com/docs/auth)
