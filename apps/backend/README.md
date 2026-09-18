# Veritas Backend

FastAPI service for Veritas, an evidence-first legal drafting and review workspace for Indian lawyers.

The backend currently includes the application shell, health endpoints, and a Strands Main Agent demo with Server-Sent Events streaming. Matter storage, document ingestion, specialist agents, review findings, and export workflows will be added as later vertical slices.

## Setup

From `apps/backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
# Replace AUTH_SECRET in .env with a random value of at least 32 characters.
python -m uvicorn app.main:app --reload --port 8000
```

For macOS or Linux, activate the environment with `source .venv/bin/activate` and copy the environment file with `cp .env.example .env`.

## Quality checks

Run these commands from `apps/backend` before committing:

```powershell
python -m ruff format --check --no-cache .
python -m ruff check --no-cache .
python -m pytest
```

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
- `POST /api/v1/matters/{id}/documents` creates an empty working brief.
- `POST /api/v1/documents/{id}/versions` saves Tiptap JSON with a base version and `Idempotency-Key` header.
- `GET /api/v1/documents/{id}` and `GET /api/v1/document-versions/{id}` return owned saved content.
- `POST /api/v1/document-versions/{id}/checks` records conservative fact and citation findings.
- `GET /api/v1/document-versions/{id}/findings` returns findings with exact source spans.
- `POST /api/v1/findings/{id}/resolutions` records a reasoned human decision.
- `POST /api/v1/document-versions/{id}/exports` creates a draft PDF or JSON export.
- `GET /api/v1/exports/{id}/download` returns the authorized export. Reviewed exports are blocked.
- `POST /api/v1/agent/chat/stream` streams Main Agent events when enabled.
- `GET /docs` opens the Swagger UI.
- `GET /redoc` opens the ReDoc reference.

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
