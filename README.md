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

The Build It baseline uses Strands directly and visibly. The event also permits Cedar, SAM/LocalStack, OpenSearch, PartyRock, and other AWS open-source technologies, but Veritas does not need to use every option. Cedar and OpenSearch remain optional until the core review workflow is complete and they support a real feature. The binding stack and substitution policy live in [the technical architecture](docs/build%20plan/tech.md).

## Current status

The repository currently contains the monorepo scaffold, planning documents, the Next.js starter, and a basic FastAPI backend with root and health endpoints. Product features are not implemented yet.

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

Start with [the build-plan index](docs/build%20plan/README.md), then read the [master specification](docs/build%20plan/veritas-master-doc.md), [MVP plan](docs/build%20plan/mvp.md), and [AI implementation brief](docs/build%20plan/main.md).

## Hackathon scope

The target demo is one English IBC matter, two synthetic records containing a deliberate factual conflict, one editable brief, citation and fact findings linked to exact evidence, stale-on-edit behavior, and draft PDF/JSON export. The planned submission track is AWS Build It with Best UI consideration.

## Safety and data

Use only synthetic or properly redacted demo records. Never commit secrets, private client data, paid-source content, or unrestricted object-storage credentials.
