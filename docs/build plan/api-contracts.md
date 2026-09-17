# API and event contracts

Prefix all endpoints with `/v1`. Every request is authenticated. Idempotency keys are required on create-version, agent-run, resolve, approve, and export commands.

## Core HTTP surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/matters` | Create matter |
| GET | `/matters` | List authorized matters |
| GET | `/matters/{id}` | Matter summary |
| POST | `/matters/{id}/uploads` | Create scoped upload |
| POST | `/sources/{id}/complete` | Finalize upload and enqueue extraction |
| GET | `/sources/{id}` | Metadata and extraction state |
| GET | `/sources/{id}/pages/{page}` | Authorized preview/page text |
| POST | `/matters/{id}/threads` | Create conversation |
| POST | `/threads/{id}/messages` | Save message and optionally start run |
| POST | `/matters/{id}/agent-runs` | Start explicit role/workflow |
| GET | `/agent-runs/{id}/events` | SSE with cursor replay |
| POST | `/documents` | Create empty document |
| GET | `/documents/{id}` | Metadata/current version |
| GET | `/document-versions/{id}` | Immutable content and review summary |
| POST | `/documents/{id}/versions` | Save validated new version |
| POST | `/document-versions/{id}/checks` | Run citation/fact scans |
| GET | `/document-versions/{id}/findings` | Filtered review queue |
| POST | `/findings/{id}/resolutions` | Resolve/waive with reason |
| POST | `/document-versions/{id}/approve` | Human approval after gate |
| POST | `/document-versions/{id}/exports` | Draft/reviewed PDF or JSON |
| GET | `/exports/{id}` | Export state and authorized download |

## Create agent run

```json
{
  "thread_id": "uuid",
  "agent": "main",
  "message_id": "uuid",
  "document_id": "uuid-or-null",
  "document_version_id": "uuid-or-null",
  "source_ids": ["uuid"],
  "requested_action": "prepare_working_brief"
}
```

Response `202` includes `run_id`, `status`, and `events_url`. The server derives user/matter identity; it never accepts them as trusted body fields.

## SSE envelope

```text
event: task.started
data: {"event_id":"01...","run_id":"...","task":"fact_review","ts":"..."}

event: finding.created
data: {"event_id":"01...","finding_id":"...","document_version_id":"...","summary":"Conflicting default amount"}

event: artifact.ready
data: {"event_id":"01...","document_id":"...","document_version_id":"..."}
```

Persist events before emitting. Client reconnects with `Last-Event-ID`; duplicate events are safe. Send high-level statuses and structured outputs, not hidden chain-of-thought.

## Save version

```json
{
  "base_version_id": "uuid",
  "schema_version": 1,
  "content": {"type":"doc","content":[]},
  "change_summary": "Resolved default amount from bank certificate"
}
```

Return `201`; return `409 VERSION_CONFLICT` with current version metadata when base is stale. Validate maximum size/depth, known node types, safe links, reference ownership, and JSON schema.

## Error shape

```json
{
  "error": {
    "code": "REVIEW_GATE_FAILED",
    "message": "Reviewed export is not available for this version.",
    "details": [{"finding_id":"uuid","reason":"citation quotation mismatch"}],
    "request_id": "uuid"
  }
}
```

Use stable codes: forbidden, not_found, invalid_schema, unsupported_file, extraction_failed, source_unavailable, version_conflict, check_incomplete, review_gate_failed, rate_limited, provider_unavailable.

## Export policy response

Before generating, return eligibility dimensions: current version, coverage complete, stale count, blocking count, missing placeholders, human review, and source limitations acknowledged. Only the backend calculates the result.
