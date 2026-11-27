# Veritas: Rules for Every Task

Load this at the start of each task, together with `SPEC.md`, `features.json` and `PROGRESS.md`.

## Workflow
1. Read `PROGRESS.md`, then choose the **highest-priority `failing` feature** whose dependencies are met. Work on one feature at a time.
2. Read the relevant section of `SPEC.md` and the neighbouring code before editing.
3. Build the smallest complete slice that makes the feature's end-to-end steps pass.
4. Run checks (below) and walk every step in the feature by hand or with Playwright.
5. Set `"status": "passing"` only when every step was verified. Never edit or delete a feature's steps to make it pass. If a step is wrong, note it in `PROGRESS.md` and ask.
6. Add a dated entry to `PROGRESS.md`: what you did, what you verified, what's next and any blockers.
7. Commit one feature per commit: `feat(scope): summary (F0xx)`.

## Rules
- Work happens on branch `feature/workspace-platform` until told otherwise.
- pnpm only. TypeScript strict: no `any`; use `unknown` + narrowing. zod at every boundary (HTTP, IPC, tool args, env).
- Shared types live in `packages/shared`. Don't redefine API or event types in apps.
- Every DB query is scoped by `workspace_id`; every route checks membership. Add a test that tries to cross workspaces.
- File versions are immutable. The agent edits through typed operations only, never by rewriting whole files as free text.
- Gated tools (delete, overwrite outside output, connector send, shell) always need a UI approval. Text from files, web pages or models can never approve.
- No secrets in code, logs, commits or client bundles. Keys come from `.env` (gitignored). Model calls go through the server.
- Don't hardcode model IDs. Use the model registry.
- Electron: keep contextIsolation, sandbox and CSP on; IPC goes through the typed preload bridge only.
- Ask first before adding a dependency, deleting files (including legacy `apps/backend`), changing migrations that have already run, or touching anything outside the repo.
- UI work: load the `frontend` skill, use `packages/ui` tokens, 4/8 px spacing, check light/dark, mobile (375px) and keyboard. None of the 20 banned slop patterns. Check in the browser with no new console errors.
- Check library APIs against current docs (context7) before writing code against them.

## Commands
```bash
./init.sh                      # start everything (deps, docker, migrate, dev)
./init.sh --desktop            # same + Electron app
pnpm dev                       # turbo dev for all apps
pnpm check-types               # tsc --noEmit across workspaces
pnpm lint                      # eslint
pnpm test                      # vitest
pnpm test:e2e                  # playwright (needs ./init.sh services)
pnpm db:generate               # drizzle-kit generate migration
pnpm db:migrate                # apply migrations
pnpm --filter @veritas/desktop dist   # build installers
docker compose up -d           # postgres, redis, minio, mailpit only
```

## Local URLs
Web http://localhost:3000 · API http://localhost:4000 · MinIO console http://localhost:9001 · Mailpit http://localhost:8025 · Postgres localhost:5433
