# Progress

Branch: `feature/workspace-platform`. Read `instruction.md` first.

## Status
- Features passing: 0 / 58 (see `features.json`)
- Next up: F001 (monorepo scaffolding), then F002 to F004 (init, env, schema), then F005+ (auth)

## Known context
- Legacy Python backend in `apps/backend` (FastAPI + Strands) and the current `apps/web` are the hackathon build. Kept as a reference for porting Legal mode (F040). Remove only with approval.
- Agent problems found in the legacy build (the reason for the rebuild): hardcoded "thinking" text, reasoning turned off, blocking calls with no live streaming, an events endpoint that only returns a snapshot (client polls), a three-hop Writer-to-formatter pipeline that loses content, a 4096-token cap, and a main agent with no tools.
- The `docs/build plan/` folder referenced by `.agents/BASE_PROMPT.md` is missing from the repo. `SPEC.md` is now the source of truth.
- The Gemini key was shared in chat during planning. Rotate it before use and put the new one only in `.env`.

## Log
### 2026-11-27: Planning
- Created branch `feature/workspace-platform`.
- Wrote SPEC.md, features.json (58 features, all failing), instruction.md, PROGRESS.md, init.sh, .env.example; added Mailpit to compose; gitignored `.env`.
- Not built or verified yet: init.sh only reaches the app once F001/F002 exist (it starts the docker services today).
