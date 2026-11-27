# Veritas Workspace: Product Spec

Status: draft v1 (2026-11-27). Branch: `feature/workspace-platform`.
This spec replaces the hackathon scope. The binding docs listed in `.agents/BASE_PROMPT.md` (`docs/build plan/`) are not in the repo; this file is now the source of truth for the platform. The engineering invariants in the base prompt still hold: versioning, findings tied to an exact version, the app (not the model) owns state, and uploaded files are data, not instructions.

## 1. What Veritas is

Veritas is one workspace app for professionals who live in documents. It runs as a web app and as an Electron desktop app. It has its own editors for documents, spreadsheets, presentations and PDFs, plus a central AI agent that can read, create and edit files across all of them.

The agent works like Claude Code: it streams its real thinking, every tool call and result, and the reason for each step, all live. It has **modes** (General, Legal, Analyst, Presenter, Researcher). Each mode has its own prompt, tools and reviewers. Legal mode carries over the old Veritas agent: Writer, Citation Reviewer and Fact Reviewer, with findings tied to exact document versions.

One shell, many apps. You open two apps side by side (for example a contract in Docs next to the Agent).

## 2. Users and launch target

- Individual professionals and small teams: lawyers, analysts, consultants, founders.
- Accounts from day one: email + password, email verification, Google sign-in.
- Launch runs on a local stack (Docker Compose). Cloud hosting is a later decision. No AWS.

## 3. Scope (v1)

### 3.1 Shell
- **Dock** along the bottom with app icons (Docs, Sheets, Slides, PDF, Files, Agent, Settings), as in the wireframe.
- **Windows.** One app full-width, or **split view** with two apps side by side and a resizable divider. Layout is saved per workspace.
- **Prompt window.** A global command palette (`Ctrl/Cmd+K`) that searches files and commands and can send a prompt to the agent from any app. It attaches the current file and selection as context.
- **Home.** The active window on the left (wireframe left card), and on the right a context card with recent files, agent runs in progress, and suggestions.
- **Brand mark.** A circular orb with a soft inner light. One SVG mark, used for the app icon, favicon, Electron tray and the agent avatar. Its "thinking" state is a slow light sweep that respects `prefers-reduced-motion`.
- **Mobile web.** The dock becomes a bottom tab bar, there's one window at a time, split view is turned off, and the agent becomes a full-screen sheet.

### 3.2 Apps (each has its own editor technology)
| App | Editor technology | Canonical format (stored) | Import | Export |
|---|---|---|---|---|
| Docs | Tiptap 3 (ProseMirror) + our extensions (comments, tracked suggestions, citations) | ProseMirror JSON | .docx (mammoth then our mapper), .md, .html, .txt | .docx (`docx` lib), .pdf, .md |
| Sheets | Univer Sheets (Apache-2.0 core) | Univer workbook snapshot JSON | .xlsx/.csv via ExcelJS mapper (Univer's own xlsx exchange is a paid Pro feature, so we don't use it) | .xlsx, .csv, .pdf |
| Slides | Custom editor: React + SVG stage, text boxes edited with Tiptap, our slide JSON schema | Veritas Slide JSON | .pptx (our JSZip/XML parser: text, images, shapes, basic layouts) | .pptx (pptxgenjs), .pdf |
| PDF | PDF.js viewer + pdf-lib | Original PDF blob + annotation JSON layer | .pdf | Flattened .pdf (annotations, form fill, merge, split, reorder) |
| Files | Our file browser | n/a | any upload (max 100 MB) | download |

Office round-trips are best-effort. Every import shows a "fidelity notes" banner when unsupported features were dropped. Native Office fidelity is not a v1 goal (see section 9).

### 3.3 Agent
- **Agent loop runtime:** `packages/agent-core`, a TypeScript loop over the Vercel AI SDK. Streamed parts: `reasoning`, `text`, `tool-call`, `tool-result`, `step-finish`, `error`. One package runs in the server (web) and in an Electron utility process (desktop).
- **Live UI:** the user sees thinking (collapsible), each tool call with its arguments and result, a step timeline, token and cost counters, a stop button, and an approval prompt for gated tools.
- **Modes** are code-defined configs (`{id, systemPrompt, tools[], reviewers[], defaultModel?}`):
  - **General:** chat, create and edit any file, summarise, compare.
  - **Legal:** Writer, then Fact Reviewer, then Citation Reviewer (ported from the Python agents), Indian Kanoon / eCourts / MCA lookups, findings tied to exact versions, stale-on-edit.
  - **Analyst:** sheet formulas, pivots, charts, data cleaning.
  - **Presenter:** turns docs and notes into slide decks.
  - **Researcher:** web search + source-cited briefs.
- **Tools** are typed (zod), workspace-scoped, and classified as `read`, `write`, or `gated` (needs user approval: delete, overwrite outside the output folder, send through a connector, run a shell command).
- **Edits are structured operations**, not free text: `docs.applyOps`, `sheets.setRange`, `slides.upsertSlide`, `pdf.annotate`. Each successful batch creates a new immutable file version. The agent sees the diff of what it changed.
- **Models:** Gemini first. The model picker in the prompt input lists models from the Gemini `models.list` API, filtered to `generateContent` support. The default is the best available model, chosen by a ranked preference list in config (newest Pro, then newest Flash). Model IDs are never hardcoded in feature code. The provider interface allows OpenAI and Anthropic API keys later.
- **Memory and retrieval:** each file is chunked and embedded (Gemini embeddings, pgvector). The agent's `search_workspace` tool does hybrid search (BM25 `tsvector` + vector).

### 3.4 Storage
- **Desktop:** the user picks one or more **workspace folders** on disk in Settings. Files stay there as real `.docx/.xlsx/.pptx/.pdf`, with a hidden `.veritas/` sidecar holding canonical JSON, versions and annotations. The server stores metadata only (path hash, name, kind, version IDs). File bytes never leave the machine unless the user uploads them.
- **Web:** files live in the S3-compatible blob store (RustFS locally) behind a `BlobStore` interface. Replacing it later is a config change.
- **Agent sandbox:** the agent reads from workspace folders and attachments. **Attachments are read-only.** It writes only to `<workspace>/Veritas Output/` (desktop) or the `output/` prefix (web), unless the user approves a gated write.

### 3.5 Connectors (v1 picks are free tiers with OAuth)
| Priority | Connector | Use |
|---|---|---|
| P1 | Google Drive / Docs / Sheets / Slides | browse, import, export, agent read |
| P1 | Microsoft OneDrive / SharePoint (Graph) | browse, import, export, agent read |
| P1 | Gmail, Google Calendar | agent reads mail and calendar; sending is gated |
| P2 | Outlook mail/calendar (Graph), Dropbox, Notion, GitHub, Slack | same pattern |
| P2 | **MCP client** | user adds any MCP server URL; its tools appear to the agent, gated by default |

Connector OAuth tokens are encrypted at rest. Each connector asks for the narrowest scopes it needs (read-only by default; write scopes asked for only when the user turns a write feature on).

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Monorepo | pnpm workspaces + Turborepo (existing) | already set up |
| Web | Next.js (App Router), React, TypeScript strict, Tailwind, TanStack Query, Zustand | user default stack |
| Desktop | Electron + electron-vite, loading the same React UI; `utilityProcess` for agent-core and file I/O; electron-builder for installers | same UI on web and desktop; Node in-process for local file access |
| API | Fastify + zod type provider, pino logs | mature SSE/WebSocket support, schema-validated routes |
| Auth | Better Auth (email/password, verification, Google OAuth, sessions) with Drizzle adapter | self-hosted, no vendor lock-in |
| DB | PostgreSQL 18 + pgvector (existing compose), Drizzle ORM + drizzle-kit migrations | typed SQL, migrations in repo |
| Cache / jobs / fan-out | Redis (existing compose): BullMQ jobs (import, export, embedding), pub/sub to send agent events to SSE clients, rate limiting | Redis ~100K ops/s handles event fan-out without touching Postgres |
| Blobs | RustFS (S3-compatible) behind `BlobStore` | swappable later |
| Email | Nodemailer + Mailpit locally | verification and reset emails without a vendor |
| AI | Vercel AI SDK + `@ai-sdk/google`; provider registry for others | streamed reasoning and tools, multiple providers |
| PDF render | Electron `printToPDF` (desktop); Playwright Chromium in a worker (web) | same HTML gives the same PDF |
| Tests | Vitest (unit), Playwright (web e2e + Electron via `_electron`), axe-core (a11y) | |
| Lint | ESLint (existing config packages), Prettier, `tsc --noEmit` | |

Exact library versions are pinned at setup after checking current docs (context7). Nothing is pinned from memory.

### 4.1 Repo layout (target)
```text
apps/
  web/        Next.js shell + apps (rebuilt in place)
  desktop/    Electron main, preload, utility processes
  server/     Fastify API, auth, SSE, workers
  backend/    LEGACY Python reference: removed (with approval) once Legal mode is ported
packages/
  ui/              design system: tokens, primitives, orb mark, dock, window manager
  shared/          zod contracts, API types, event types
  db/              Drizzle schema + migrations
  agent-core/      agent loop, modes, tool registry, model registry
  editor-docs/     Tiptap editor + docx import/export
  editor-sheets/   Univer wrapper + xlsx mapper
  editor-slides/   slide editor + pptx import/export
  viewer-pdf/      PDF.js viewer + pdf-lib ops
  connectors/      Google, Microsoft, MCP client
  eslint-config/ tailwind-config/ typescript-config/  (existing)
```

## 5. Data model (Postgres, Drizzle)

All IDs are UUIDv7. All tenant tables carry `workspace_id`, and every query is filtered by it.

| Table | Key columns |
|---|---|
| `user`, `session`, `account`, `verification` | Better Auth standard tables |
| `workspaces` | id, name, owner_id, created_at |
| `workspace_members` | workspace_id, user_id, role (`owner`/`editor`/`viewer`) |
| `devices` | id, user_id, platform, name, last_seen_at |
| `workspace_roots` | id, workspace_id, device_id, label, path_hash (raw path is kept only on the device) |
| `folders` | id, workspace_id, parent_id, name |
| `files` | id, workspace_id, folder_id, kind (`doc`/`sheet`/`slides`/`pdf`/`other`), name, storage (`local`/`blob`/`connector`), storage_ref, mime, size_bytes, current_version_id, created_by, deleted_at |
| `file_versions` | id, file_id, version_no, content_hash, snapshot_ref (blob key or sidecar path), author (`user`/`agent`), agent_run_id?, created_at. Immutable |
| `attachments` | id, workspace_id, thread_id, file_id, read_only=true |
| `chunks` | id, file_version_id, ordinal, text, tsv, embedding vector, locator (page/cell/slide) |
| `agent_threads` | id, workspace_id, user_id, mode, title |
| `agent_messages` | id, thread_id, role, parts jsonb (AI SDK UIMessage parts) |
| `agent_runs` | id, thread_id, mode, model_id, status (`queued`/`running`/`awaiting_approval`/`completed`/`failed`/`cancelled`), usage jsonb, error_code |
| `agent_events` | run_id, seq, type, payload jsonb. Append-only; used to replay the stream |
| `tool_approvals` | id, run_id, tool, args jsonb, status, decided_by, decided_at |
| `findings` | id, file_version_id, kind (`citation`/`fact`), claim_hash, status (`supported`/`contradicted`/`unresolved`/`needs_review`/`stale`/`resolved`), evidence jsonb, method, limitations |
| `connectors` | id, workspace_id, user_id, provider, scopes, token_ciphertext, token_iv, expires_at |
| `user_settings` | user_id, default_model, default_mode, theme, ui jsonb |
| `audit_log` | id, workspace_id, actor (`user`/`agent`), action, target, at |

## 6. Security

- **Authorization boundary is the workspace.** Every route, SSE stream, blob URL, agent tool and export checks membership and role at the edge. Tests cover access across workspaces.
- **Auth:** Better Auth sessions in httpOnly, Secure, SameSite=Lax cookies; CSRF protection; email verification is required before workspace creation; rate limits on login, signup and reset (Redis).
- **Secrets:** `GEMINI_API_KEY`, OAuth secrets and the connector key-encryption key come only from `.env` (gitignored). On web the server proxies all model calls, so keys never reach the browser. Desktop sends model calls through the server's model gateway; an optional user-supplied key is stored with Electron `safeStorage`.
- **Connector tokens:** AES-256-GCM with a key from `CONNECTOR_KEK`, never logged.
- **Agent sandbox:** paths resolved with `realpath` must sit under an allowed root; symlink escape is denied; `.veritas/` is internal; writes go only to the output folder unless approved; gated tools need an explicit click in the UI. Approvals never come from model output or file content.
- **Prompt injection:** file, web and connector content is wrapped as untrusted data in tool results. Modes can't widen their tool set at runtime.
- **Electron:** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, a typed preload bridge whose IPC inputs are validated with zod, strict CSP, no `remote` module, navigation locked to the app origin, `shell.openExternal` only for an https allowlist.
- **Uploads:** 100 MB cap, MIME sniffing (not trusting the extension), zip-bomb guard for OOXML, presigned blob URLs with a 5-minute TTL.
- **Audit:** every agent write, approval and connector send goes to `audit_log`.

## 7. Agent event contract (shared)
`run.started` · `reasoning.delta` · `text.delta` · `tool.call` · `tool.result` · `approval.requested` · `approval.decided` · `file.version.created` · `step.finished` · `run.completed` · `run.failed` · `run.cancelled`. Events are written to `agent_events` with a monotonic `seq` and published on Redis. SSE supports `Last-Event-ID` resume. The UI renders only from these events.

## 8. Non-functional targets
- Time to first streamed token under 1.5 s (p50) after send.
- Opening a file (≤5 MB) is interactive in under 1 s on desktop.
- WCAG 2.2 AA: keyboard-only use of the dock, windows, editors' main actions and the agent; visible focus; 4.5:1 contrast in both themes.
- Light and dark themes; 4/8 px spacing scale; no patterns from the banned slop list.

## 9. Excluded from v1
- AWS services of any kind (Bedrock, S3, SES).
- "Sign in with ChatGPT/Codex" to use a ChatGPT plan: not an allowed third-party integration. Revisit only if OpenAI ships an official API for it.
- Real-time multi-user co-editing (Yjs) and presence. Single editor per file, with conflict detection by version.
- Pixel-perfect Office fidelity, macros, VBA, pivot-table import, SmartArt, animations in pptx.
- Native mobile apps (mobile web only).
- Syncing local-folder file bytes between devices or to the cloud.
- Billing and payments, e-signature, court filing, legal outcome prediction, translation.
- Running user-supplied code or shell commands (beyond the gated tool, which stays off by default).
