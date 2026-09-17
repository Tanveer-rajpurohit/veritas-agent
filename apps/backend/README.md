# Veritas Backend

FastAPI service for Veritas, an evidence-first legal drafting and review workspace for Indian lawyers.

This first setup intentionally includes only the application shell and health endpoints. Matter storage, document ingestion, Strands orchestration, review findings, and export workflows will be added as later vertical slices.

## Setup

From `apps/backend`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

For macOS or Linux, activate the environment with `source .venv/bin/activate` and copy the environment file with `cp .env.example .env`.

## Endpoints

- `GET /` returns API name, version, and status.
- `GET /health` returns the service health status.
- `GET /docs` opens the Swagger UI.
- `GET /redoc` opens the ReDoc reference.

Example health response:

```json
{"status":"ok"}
```

## Structure

```text
apps/backend/
|-- app/
|   |-- core/config.py
|   |-- routers/health/router.py
|   `-- main.py
|-- .env.example
|-- package.json
`-- requirements.txt
```
