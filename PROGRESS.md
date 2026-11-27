# Progress

Branch: `feature/workspace-platform`. Read `instruction.md` first.

## Status
- Features passing: 1 / 60 (F001). Count with `grep -c '"passing"' features.json`.
- Next up: F002 (init.sh full stack + real health checks), F003, F004

## Decisions log
- 2026-11-27: Node 22 is the dev baseline (machine has 22.14, no version manager; upgrading is a system change). Engine set to `>=22`. tsup needs 22.18+, so the server bundles with esbuild.
- 2026-11-27: Legacy hackathon code moved to `legacy/web` and `legacy/backend` (outside the pnpm workspace) as reference. User chose "your choice, good end result".
- 2026-11-27: Workspace packages ship TypeScript source (`exports: ./src/index.ts`), no build step. Next uses `transpilePackages`; the server dev uses tsx and the prod build uses esbuild.
- 2026-11-27: The web app proxies `/api/*` to the server (Next rewrites) so auth cookies stay first-party.
- 2026-11-27: TypeScript 6.0.3 (typescript-eslint compatible), not TS 7.
- 2026-11-27: Added F059 (agent asks clarifying questions) and F060 (AI provenance: model + time on every AI output) at the user's request.
- 2026-11-27: User approved using the shared Gemini key; it lives only in the gitignored root `.env`.
- 2026-11-27: Google/Microsoft OAuth client IDs will be added by the user later. F007 and F047-F049 stay blocked until then.

## Blocked
- F007, F047, F048, F049: need OAuth client IDs/secrets in `.env` (user will add).

## Log
### 2026-11-27: F001 monorepo scaffolding (passing)
- New: apps/server (Fastify), apps/web (fresh Next 16), apps/desktop (electron-vite), packages shared/db/ui/agent-core, `typescript-config/library.json`.
- Verified: `pnpm install`, `pnpm check-types` 7/7, `pnpm lint` 7/7, `pnpm test` (shared 2 tests), `pnpm build` (server, web, desktop).
- Note: `/health` currently returns fixed "ok" values; F002 replaces this with real Postgres/Redis/MinIO checks. F002 is not passing until then.

### 2026-11-27: Planning
- Wrote SPEC.md, features.json, instruction.md, init.sh, .env.example; added Mailpit; gitignored `.env`.
