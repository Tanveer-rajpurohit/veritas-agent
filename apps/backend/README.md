# Veritas Backend

FastAPI service for Veritas, an evidence-first legal drafting and review workspace for Indian lawyers.

The backend supports authenticated matters, source uploads and extraction, versioned working briefs, conservative review findings, draft exports, persistent conversations, and queued Main Agent and Writer runs.

## Setup

Start PostgreSQL and MinIO from the repository root with `docker compose up -d`, then from `apps/backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
# The sample MinIO credentials match docker-compose.yml; replace both for non-local use.
# Replace AUTH_SECRET in .env with a random value of at least 32 characters.
python -m alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

In a second terminal, run `python -m app.workers.agent_runs` from `apps/backend` to process queued runs after API restarts. The API also starts runs in a background task when a request succeeds. Set either Groq or Bedrock credentials before running an agent.

For macOS or Linux, activate the environment with `source .venv/bin/activate` and copy the environment file with `cp .env.example .env`.

## Quality checks

Run these commands from `apps/backend` before committing:

```powershell
python -m ruff format --check --no-cache .
python -m ruff check --no-cache .
python -m pytest
python -m alembic check
```

Database tables are managed only by Alembic. For a local database that already matches the baseline schema, inspect and back it up before running `python -m alembic stamp b38381765488`; never stamp an unverified database.

Use `python -m ruff format --no-cache .` to apply formatting. Tests use pytest and live in the
top-level `tests/` directory; this flat layout keeps the current backend easy to navigate
while its test suite is small.

## Endpoints

- `GET /` returns API name, version, and status.
- `GET /health` returns the service health status.
- `POST /api/v1/auth/register` creates an account and returns a bearer token.
- `POST /api/v1/auth/login` returns a bearer token for an existing account.
- `/api/v1/matters/` requires that token and returns only the caller's matters.
- `POST /api/v1/matters/{id}/uploads` accepts PDF, TXT, and MD records up to 10 MB.
- `GET /api/v1/matters/{id}/sources` and `GET /api/v1/sources/{id}/pages/{page}` return scoped evidence.
- `GET /api/v1/sources/{id}/download` returns the authorized original file.
- `POST /api/v1/matters/{id}/threads` and `/api/v1/threads/{id}/messages` persist scoped conversations.
- `POST /api/v1/matters/{id}/agent-runs` starts a Main Agent answer or Writer brief run with an `Idempotency-Key` header.
- `GET /api/v1/agent-runs/{id}` returns run status and output; `/events` replays persisted SSE events using `Last-Event-ID`.
- `POST /api/v1/matters/{id}/documents` creates an empty working brief.
- `POST /api/v1/documents/{id}/versions` saves Tiptap JSON with a base version and `Idempotency-Key` header.
- `GET /api/v1/documents/{id}` and `GET /api/v1/document-versions/{id}` return owned saved content.
- `POST /api/v1/document-versions/{id}/checks` records fact conflicts, curated citation identity, and quotation findings. A `citationRef` may include `attrs.quote` for passage comparison.
- `GET /api/v1/document-versions/{id}/findings` returns findings with exact source spans.
- `POST /api/v1/findings/{id}/resolutions` records a reasoned human decision.
- `POST /api/v1/document-versions/{id}/exports` creates a draft PDF or JSON export.
- `GET /api/v1/exports/{id}/download` returns the authorized export. Reviewed exports are blocked.
- `POST /api/v1/agent/chat/stream` streams Main Agent events when enabled.
- `GET /docs` opens the Swagger UI.
- `GET /redoc` opens the ReDoc reference.

Provider results are stored as `discovery_only` until curated. Citation identity support requires an exact title or neutral citation match to a stored primary source with a passage. Quotation comparison checks that selected passage; an absent quote remains unresolved unless a close passage with different wording is found. These checks do not establish current legal treatment.

Example health response:

```json
{"status":"ok"}
```

## Main Agent demo

The Main Agent uses one provider switch: `BEDROCK_AGENT_ENABLED=true` selects Bedrock; `false` automatically uses Groq:

```env
BEDROCK_AGENT_ENABLED=false
```

To use the GroqCloud model shown in the project setup:

```env
BEDROCK_AGENT_ENABLED=false
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b
```

To use Amazon Bedrock instead, configure AWS credentials and select the provider:

```env
BEDROCK_AGENT_ENABLED=true
AWS_REGION=ap-south-1
AWS_BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

Both AWS keys are required when Bedrock is enabled. Never commit credential values.

`GROQ_BASE_URL` remains configurable because Groq exposes an OpenAI-compatible API, but the default and currently supported fallback is GroqCloud.

Example request:

```powershell
curl.exe -N -X POST http://localhost:8000/api/v1/agent/chat/stream `
  -H "Content-Type: application/json" `
  -d '{"message":"What information do you need to prepare an IBC Section 7 working brief?"}'
```

The endpoint emits `start`, `text`, optional `tool`, `done`, and safe `error` SSE events. This demo has no tools or matter access yet; its prompt requires it to state those limits rather than invent evidence.

## Structure

```text
apps/backend/
|-- app/
|   |-- agents/           # Strands Main Agent and prompts
|   |-- core/config.py
|   |-- routers/agent/    # SSE chat endpoint
|   |-- routers/health/router.py
|   |-- schemas/agent.py
|   |-- services/agent_service.py
|   `-- main.py
|-- .env.example
|-- package.json
|-- pyproject.toml
|-- requirements.txt
|-- requirements-dev.txt
`-- tests/
```
