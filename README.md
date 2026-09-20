# Veritas Agent

Veritas is an evidence-first legal drafting and review workspace for Indian lawyers. It helps a lawyer prepare an English IBC Section 7 working brief, connect important claims to records and legal authorities, inspect citation and factual conflicts, and keep review status aligned with the current document version.

Veritas supports legal work; it does not replace professional judgment, determine legal truth, or autonomously file, sign, email, or approve documents.

## Product workflow

1. Create a matter and upload client records.
2. Extract page-aware evidence from those records.
3. Ask the Main Agent to plan a bounded drafting or review task.
4. Let the Writer propose an editable working brief.
5. Run Citation Reviewer and Fact Reviewer checks.
6. Inspect exact evidence, resolve conflicts, and record human decisions.
7. Mark affected findings stale whenever relevant text or evidence changes.
8. Export the current version as a clearly labelled draft PDF and JSON package.

## Planned architecture

- **Web:** Next.js, TypeScript, Tailwind CSS, and Tiptap
- **API:** FastAPI and Pydantic
- **Agent workflow:** AWS Strands with a Main Agent, Writer, Citation Reviewer, and Fact Reviewer
- **Data:** PostgreSQL for application state and immutable document versions
- **Files:** S3-compatible object storage
- **Jobs:** PostgreSQL-backed background worker

The application—not a model—owns authorization, state transitions, finding invalidation, approval, and export eligibility.

The Build It baseline uses Strands directly and visibly. Cedar and OpenSearch remain optional until the core review workflow is complete and they support a real feature. Runtime details live in [the agent implementation](docs/agent-implementation.md).

## Current status

The MVP supports authenticated matters, evidence upload and extraction, agent-assisted drafting and review, immutable document versions, findings linked to evidence, and draft PDF/JSON export. See [MVP scope](docs/mvp.md) for the submission workflow and deferred features.

## Repository structure

```text
veritas-agent/
|-- apps/
|   |-- backend/        # FastAPI service
|   `-- web/            # Next.js application
|-- docs/
|   |-- build plan/     # Binding product and engineering specification
|   `-- idea/           # Earlier product research and drafts
|-- packages/           # Shared frontend configuration
`-- README.md
```

## Run the backend

```powershell
cd apps/backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Open:

- API root: http://localhost:8000/
- Health check: http://localhost:8000/health
- Swagger UI: http://localhost:8000/docs

The backend also participates in the Turborepo development command, so `pnpm dev` at the repository root starts all configured development apps after Python dependencies are installed.

## Documentation

- [Product idea](docs/idea.md)
- [MVP scope and demo path](docs/mvp.md)
- [Agent implementation](docs/agent-implementation.md)
- [Data sources](docs/sources.md)
- [Presentation notes](docs/presentation.md)

## Hackathon scope

The target demo is one English IBC matter, two synthetic records containing a deliberate factual conflict, one editable brief, citation and fact findings linked to exact evidence, stale-on-edit behavior, and draft PDF/JSON export. The planned submission track is AWS Build It with Best UI consideration.

## Safety and data

Use only synthetic or properly redacted demo records. Never commit secrets, private client data, paid-source content, or unrestricted object-storage credentials.
