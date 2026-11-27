# Progress

Branch: `feature/workspace-platform`. Read `instruction.md` first.

## Status
- Features passing: 9 / 60 (F001, F003, F004, F005, F006, F008, F009, F011, F012).
- Next up: F014 (Home), F013 (split view), F002; F007 once the Google redirect URI is added

## Decisions log
- 2026-11-27: Node 22 is the dev baseline (machine has 22.14, no version manager; upgrading is a system change). Engine set to `>=22`. tsup needs 22.18+, so the server bundles with esbuild.
- 2026-11-27: Legacy hackathon code moved to `legacy/web` and `legacy/backend` (outside the pnpm workspace) as reference. User chose "your choice, good end result".
- 2026-11-27: Workspace packages ship TypeScript source (`exports: ./src/index.ts`), no build step. Next uses `transpilePackages`; the server dev uses tsx and the prod build uses esbuild.
- 2026-11-27: The web app proxies `/api/*` to the server (Next rewrites) so auth cookies stay first-party.
- 2026-11-27: TypeScript 6.0.3 (typescript-eslint compatible), not TS 7.
- 2026-11-27: Added F059 (agent asks clarifying questions) and F060 (AI provenance: model + time on every AI output) at the user's request.
- 2026-11-27: User approved using the shared Gemini key; it lives only in the gitignored root `.env`.
- 2026-11-27: Google/Microsoft OAuth client IDs will be added by the user later. F007 and F047-F049 stay blocked until then.

- 2026-11-27: MinIO replaced by RustFS 1.0.5 (Apache-2.0, S3 API). quay.io and Docker Hub MinIO images are no longer published (401 / not found). Compose service is now `blob`. features.json steps that say "MinIO" are read as "the blob store" (text left unchanged per the status-only rule).
- 2026-11-27: Docker Desktop 4.47 crashed on a stale `%LOCALAPPDATA%\Docker\run\dockerInference` socket. User approved a fix; the file couldn't be deleted, but a restart worked. If Docker fails again, restart Docker Desktop.
- 2026-11-27: Integration tests (`pnpm --filter @veritas/db test:integration`) need DATABASE_URL; plain `pnpm test` skips them. CI (F057) will run them with services.

- 2026-11-27: This machine has a system-wide GEMINI_API_KEY env var. Node `--env-file` never overrides existing vars, so that value wins over `.env`. Tell the user; testing env validation needs `env -u GEMINI_API_KEY`.
- 2026-11-27: Local AUTH_SECRET and CONNECTOR_KEK generated randomly into `.env` (never committed).

- 2026-11-27: Visual direction set by the user: Space Grotesk (UI) + PT Mono (numbers/code), both OFL; (revised same day) white light theme and true-black dark theme with cool neutral greys; black primary buttons (white in dark); teal brand for focus/links/active. Orb is a painterly sphere of blurred colour fields with contained grain (ElevenLabs-style reference from the user), one tone per agent mode: lagoon/General, ember/Legal, moss/Analyst, coral/Presenter, glacier/Researcher, pearl/neutral. Grain is contained to the orb, a deliberate exception to slop rule 20. Note: global slop rule 11 bans Space Grotesk + Instrument Serif, not Space Grotesk alone; this was an explicit user request anyway.
- 2026-11-27: E2E uses Playwright with the installed Chrome (`channel: chrome`), so there is no browser download; axe-core checks WCAG 2.2 AA. `/_design` is served from `app/%5Fdesign` (Next private-folder escape) and returns 404 in production.

- 2026-11-27: Better Auth runs inside Fastify at /api/auth/*; baseURL is the web origin so email links and OAuth callbacks go through the Next proxy. Sessions are stored in Postgres; rate-limit counters live in Redis with atomic INCR+EXPIRE (Lua). Password minimum is 10 characters.
- 2026-11-27: Sign-up with an existing email shows the same "check your inbox" screen (no account enumeration). Signed-up email addresses never go in URLs (held in component state).
- 2026-11-27: Tokens use Tailwind `@theme inline` so a nested `data-theme="dark"` section (the auth side panel) works on a light page.

- 2026-11-27: `@veritas/db` re-exports drizzle query helpers (eq, and, desc, ...) so every package shares one drizzle-orm instance; the server has no direct drizzle-orm dependency.
- 2026-11-27: API errors: validation gives 400 `{ error, fields }`; non-members get 404 (not 403) so workspace IDs cannot be probed. Server-side web fetches redirect to /sign-in on 401.
- 2026-11-27: E2E stability: global setup warms every route (Next dev compiles on first request; cold compiles took >15 s here), expect timeout 15 s, test timeout 60 s for full flows. No assertions were relaxed. Never call `router.refresh()` right after `router.replace()` (the refresh can cancel the navigation).

- 2026-11-27: Real email goes through Gmail SMTP (app password, in `.env` only). Recipients on reserved TLDs (.test/.example/.invalid/.localhost) are routed to Mailpit (`MAIL_CATCHER_*`) and never reach the relay, so e2e keeps reading Mailpit and no test mail bounces from the real sender.
- 2026-11-27: Playwright runs 1 worker locally (8 GB RAM machine crashed with 2 workers + dev servers + Docker); CI uses 2. Long multi-navigation flows use `test.slow()`; no assertions relaxed.
- 2026-11-27: `apps/web/next-env.d.ts` is untracked/gitignored: `next dev` and `next typegen` rewrite it differently, which dirtied git status.
- 2026-11-27: App placeholder windows live in one dynamic route `w/[id]/[app]`; each real editor route (e.g. `w/[id]/docs`) takes precedence when it lands. Dock icons are hand-drawn 24px SVGs in `@veritas/ui` (no icon dependency); the Agent dock mark is the orb.
- 2026-11-27: Security fix: Fastify `trustProxy` is `loopback` (was `true`) and the auth bridge overwrites `x-forwarded-for` with Fastify's resolved `request.ip`. Before, any client could forge X-Forwarded-For and reset its auth rate-limit bucket. Production behind a load balancer must widen the trusted list deliberately.
- 2026-11-27: E2E users each get a unique RFC 5737 client IP (`isolatedIp`) so rate limits apply per simulated user, not to the whole suite.

## Blocked
- F007: Google client ID/secret are in `.env`; the Google Cloud console needs redirect URI `http://localhost:3000/api/auth/callback/google` added (the user registered `http://localhost:8000/api/auth/google/callback`, which does not match).
- F048, F049: Microsoft OAuth (user will do Azure at the end).

## Log
### 2026-11-27: F008 auth error states and rate limits (passing)
- Rate-limited auth calls show `Too many attempts. Try again in N seconds.` from the server's X-Retry-After (sign-in, sign-up, reset request). Generic wrong-password copy, non-enumerating sign-up, inline 10-character rule.
- Verified: e2e f008 3/3 (10 wrong passwords then 429 with seconds shown; existing email gets Check your inbox; short password blocked client-side with aria-invalid and no request). Probed the proxy: 11th attempt from one IP is 429, another IP unaffected. Full suite 20/20.

### 2026-11-27: F006 sign-in, sign-out and password reset (passing)
- /forgot-password (same confirmation for any address) and /reset-password (token from the Better Auth redirect, referrer policy no-referrer, expired/used link screen, confirm field). Sign-out lives in the account menu (F012). Reset revokes all sessions.
- Verified: e2e f006 3/3 (sign out, protected route redirects, sign back in to Home; reset via Mailpit link, mismatch error, link single-use, old password rejected, new one works; unknown email same screen). Checked both pages in the browser, no console errors.

### 2026-11-27: F012 shell with bottom dock (passing)
- Workspace layout: header (orb + workspace name to Home, account menu with name/email, theme, Settings, Sign out via native popover), the active window as a bordered card, and the dock centred at the bottom.
- Dock: Docs, Sheets, Slides, PDF, Files | Agent, Settings as links with aria-current, a dot indicator, and tooltips on hover (300 ms delay) and keyboard focus. Unknown app slug is a 404.
- Verified: e2e f012 2/2 (centred near bottom, each app opens with its heading, single active link, tooltip on hover and focus, Home clears active); full suite 14/14 on 1 worker; checked in the browser in light and dark at 800px and 375px (no overflow, no console errors).

### 2026-11-27: F009 onboarding creates the first workspace (passing)
- Shared zod contracts (workspaces, apiError). Server: `requireSession` guard (verified email required), `memberRoleFor` access helper, GET/POST /api/v1/workspaces (transaction creates workspace + owner membership + audit row).
- Web: onboarding form with inline validation, root routes to the first workspace or onboarding, /w/[id] layout returns 404 for non-members, placeholder Home heading (full Home is F014).
- Verified: e2e f009 3/3 (empty name shows Name is required; trimmed name created; lands on /w/:id; root then routes to it; anonymous POST 401; server rejects a blank name with fields.name). Full suite 12/12 twice; types/lint/unit 7/7.

### 2026-11-27: F005 email sign-up with verification (passing)
- Server: Better Auth (Drizzle adapter, plural tables), Nodemailer to Mailpit with plain HTML+text emails, Fastify mount that keeps multiple Set-Cookie headers, request-id header, generic 5xx copy, cookie/auth headers redacted from logs.
- Web: two-panel auth layout (black panel with orb, white form), sign-up, sign-in, check-inbox/verify-email states with resend, onboarding page (requires a session), root redirect. UI primitives Button and TextField in packages/ui.
- Verified: e2e f005 3/3 in Chrome (real Mailpit email, link confirms, lands on /onboarding, session cookie httpOnly + SameSite=Lax, unverified sign-in shows Verify your email, resend sends a 2nd email, inline validation). Full e2e 9/9, types/lint/unit 7/7.

### 2026-11-27: F011 design revision (still passing)
- User feedback: drop the cream, use white/black backgrounds, orb like the ElevenLabs reference. Rebuilt Orb (4 drifting blurred blobs, edge shade, grain at >=40px, 6 mode tones; faster drift while thinking) and the neutral themes.
- Verified: F011 e2e 6/6 (added: white/black canvas check, tone check, thinking is faster than idle), types and lint 7/7, checked by eye in light and dark.

### 2026-11-27: F011 design tokens, themes and orb (passing)
- packages/ui: two-layer tokens (Tailwind palettes, then semantic `--vt-*` vars exposed as utilities), light/dark via `[data-theme]` set before paint, the Orb component (idle/thinking), theme switch backed by useSyncExternalStore.
- Verified: e2e `e2e/f011-design-system.spec.ts` 5/5 in Chrome (no console errors; zero serious axe violations in light and dark; theme persists across reload; orb at 16/32/128; reduced motion stops the sweep). Checked by eye at 1280px and 375px, no horizontal scroll, slop checklist clean.

### 2026-11-27: F003 env validation (passing) + real /health
- `loadEnv` validates every server var with zod; errors name the variable and rule, never the value (unit test checks secrets are not echoed).
- `/health` probes Postgres (`select 1`), Redis (`PING`) and the blob bucket, each with a 2 s timeout; 503 + `degraded` when any is down. Bucket is created on boot.
- Verified by hand: without GEMINI_API_KEY the server exits 1 with `GEMINI_API_KEY is missing`; normal boot gives 200 ok; stopping Redis gives 503 redis:down; restart recovers to 200.

### 2026-11-27: F004 schema and migrations (passing)
- Drizzle schema for the Better Auth tables (plural) and every SPEC section 5 table, plus `agent_questions` (F059) and `model_id` provenance columns (F060). UUIDv7 via Postgres 18 `uuidv7()`.
- Migrations: 0000 vector extension, 0001 core tables (22), 0002 trigger that makes file_versions immutable.
- Verified: migrate on an empty DB, rerun is a no-op (3 recorded), indexes on files(workspace_id), agent_events PK(run_id, seq); integration tests: UPDATE on file_versions rejected, uuidv7 format. Lint and types 7/7.

### 2026-11-27: F001 monorepo scaffolding (passing)
- New: apps/server (Fastify), apps/web (fresh Next 16), apps/desktop (electron-vite), packages shared/db/ui/agent-core, `typescript-config/library.json`.
- Verified: `pnpm install`, `pnpm check-types` 7/7, `pnpm lint` 7/7, `pnpm test` (shared 2 tests), `pnpm build` (server, web, desktop).
- Note: `/health` currently returns fixed "ok" values; F002 replaces this with real Postgres/Redis/MinIO checks. F002 is not passing until then.

### 2026-11-27: Planning
- Wrote SPEC.md, features.json, instruction.md, init.sh, .env.example; added Mailpit; gitignored `.env`.
