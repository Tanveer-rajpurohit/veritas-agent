# Veritas web

Next.js frontend for the Veritas legal drafting workspace.

## Local setup

Run backend on `http://localhost:8000`, then start web app from repository root:

```powershell
pnpm --filter web dev
```

Web app runs on `http://localhost:3001`. Backend configuration must include that exact origin in
`ALLOWED_ORIGINS`; cookie-authenticated mutations also validate `Origin`/`Referer`. Set
`APP_BASE_URL=http://localhost:3001` so verification and password-reset links open the web app.

API base defaults to `http://localhost:8000/api/v1`. Override only when needed:

```text
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Authentication uses backend-owned opaque `HttpOnly` session cookies. Frontend must not store access
or refresh tokens. Every API request uses `credentials: "include"`; `/auth/me` is session truth.

## Checks

```powershell
pnpm --filter web lint
pnpm --filter web check-types
pnpm --filter web build
```
