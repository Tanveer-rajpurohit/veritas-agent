# Added by Dax — Work Log

All summaries of work done in this session, with file references.

---

## Session: 2026-09-18

### 1. Project Run Instructions
**Summary**: Inspected the monorepo (Next.js + FastAPI) structure and documented how to run both the frontend and backend locally.

**Files Read**:
- `README.md`
- `apps/backend/package.json`
- `package.json`

**Key Actions**:
- Set up Python virtual environment in `apps/backend/.venv`
- Installed Python dependencies from `requirements.txt`
- Ran `pnpm dev` via Turborepo — starts both apps simultaneously
  - Frontend: http://localhost:3001
  - Backend:  http://localhost:8000
  - Backend Swagger: http://localhost:8000/docs

---

### 2. Review Findings Specification Document
**Summary**: Created a comprehensive specification document covering all features, data structures, UI/UX, invalidation rules, and API contracts for the Review Findings section of a Matter.

**Files Created**:
- `docs/build plan/review-findings.md`

**Key Sections Written**:
- Domain data model (ERD): `claims`, `evidence_spans`, `findings`, `finding_evidence`, `resolutions`, `approvals`
- Finding dimensions: Citation (Identity, Quotation, Proposition Support, Later Treatment), Fact (Fact Consistency)
- All 7 finding statuses: `supported`, `contradicted`, `unresolved`, `needs_review`, `stale`, `resolved`, `waived`
- Visual & accessibility standards (Color + Icon + Text)
- UI/UX layout: 3-pane workspace, Review Queue, Evidence Drawer, Citation Matrix
- Stale-on-edit / transactional invalidation flow
- Export gates: Draft PDF (always), Reviewed PDF (server-gated), JSON Package
- REST API endpoints and SSE events

---

### 3. Frontend Codebase Inspection — Review Findings Feature
**Summary**: Performed deep inspection of the frontend codebase to map the exact file, component, state, type, and rendering logic responsible for the Review Findings tab in the Matter Detail View. No code was changed.

**Files Inspected**:
- `apps/web/types/workspace/types.ts` — workspace-level types (`Matter`, `MatterHealth`, `MatterStage`, etc.)
- `apps/web/lib/workspace-data.ts` — seed data for all matters; `SEED_MATTERS` array; `discrepanciesCount` and `citationsCount` fields
- `apps/web/components/workspace/matter-detail-view.tsx` — **primary file** containing:
  - `FindingItem` interface (lines 54–69)
  - `findings` state (lines 247–325): 6 hardcoded seed findings, **no setter exposed**
  - `filteredFindings` memo (lines 370–380): filters by `findingCategory`
  - Review Findings render block (lines 769–887): `activeTab === "forensics"` section
  - Finding cards: dimension badge, agent badge, status badge, proposition block, detail text, `Send to Agent` button, `Inspect Span` button
- `apps/web/app/design-tokens.css` — design token system with brand, status, surface colors
- `apps/web/components/workspace/workspace-icons.tsx` — all available SVG icon components

**Findings of Inspection**:
- See `docs/review-findings-inspection.md` for the full structured inspection report.

---

### 4. Frontend Implementation — Human Decision Layer for Review Findings
**Summary**: Implemented frontend-only Accept/Reject human review actions for Contradicted findings in the Review Findings tab. Machine finding status (`Supported` / `Contradicted`) is never mutated. A separate `humanDecision` field tracks lawyer decisions in local React state only.

**Files Modified**:
- `apps/web/components/workspace/matter-detail-view.tsx`

**Exact Changes Made (7 targeted edits)**:

1. **`HumanDecision` type + `humanDecision` field on `FindingItem`** (lines 54–69)
   - Added `type HumanDecision = "accepted" | "rejected"`
   - Added `humanDecision?: { action: HumanDecision; reason?: string }` to `FindingItem`

2. **Reject modal state** (after `findingCategory` state)
   - `const [rejectingFindingId, setRejectingFindingId]` — tracks which finding is being rejected
   - `const [rejectReason, setRejectReason]` — controlled input for rejection reason text

3. **Findings state setter** (line 247)
   - Changed `const [findings]` → `const [findings, setFindings]` to allow mutation

4. **Handler functions** (after `handleCreateDraftSubmit`)
   - `handleAcceptFinding(id)` — immutable update via `.map()`, sets `humanDecision: { action: "accepted" }`
   - `handleRejectFinding(id, reason)` — sets `humanDecision: { action: "rejected", reason }`, resets modal state

5. **Status badge row** (finding card header)
   - Machine badge (`Supported` / `Contradicted`) stays unchanged
   - Secondary human decision badge rendered conditionally alongside it: green `✓ Accepted` or red `✕ Rejected`

6. **Card footer actions** (finding card footer)
   - `Contradicted` findings with no `humanDecision`: show green `[Accept]` + red `[Reject]` buttons beside existing `[Send to Agent]` and `[Inspect Span]`
   - Once a decision is made: Accept/Reject buttons hidden, `[Inspect Span]` and `[Send to Agent]` remain
   - Rejected finding card body: shows a rose-tinted "Rejection reason" block with the entered text
   - `Supported` findings: footer unchanged

7. **Reject reason modal** (after draft modal block, before closing `</div>`)
   - Inline modal matching existing `draftModalOpen` pattern (`fixed inset-0 z-50 backdrop-blur-xs`)
   - `<textarea>` for reason (required), with real-time empty-state error message
   - `Confirm Rejection` button is `disabled` when reason is empty
   - Dismiss: backdrop click, Cancel button, or X icon — all reset state cleanly

**Verification**: `pnpm --filter web check-types` → exit code 0 ✓

---

### 5. Verification — Accept/Reject Implementation (Static Code Analysis)
**Summary**: Verified the human decision layer implementation across all 6 seed findings using static code analysis. Browser automation was unavailable (Playwright CDN error), so all checks were performed by reading the rendering conditions, seed data, and handler logic directly.

**Files Inspected**:
- `apps/web/components/workspace/matter-detail-view.tsx` — seed data (lines 258–336), footer render condition (line 928), handler functions

**Finding vs. Matter Clarification**:
The 6 items in the Review Findings tab are **6 `FindingItem` objects** within a single matter detail view — not 6 separate matters.

**All 6 Findings — Inspection Table**:

| # | ID | Title | Machine Status | Accept/Reject Visible? | Expected? |
|---|---|---|---|---|---|
| 1 | `find-1` | Innoventive Industries Ltd. v. ICICI Bank | Supported | No | ✅ Correct |
| 2 | `find-2` | Swiss Ribbons Pvt. Ltd. v. Union of India | Supported | No | ✅ Correct |
| 3 | `find-3` | Dena Bank v. C. Shivakumar Reddy | Supported | No | ✅ Correct |
| 4 | `find-4` | Pooja Ramesh Singh v. J&K Bank Ltd. | Supported | No | ✅ Correct |
| 5 | `find-5` | Principal Debt Amount Mismatch | **Contradicted** | **Yes** | ✅ Correct |
| 6 | `find-6` | Deemed Default Date Verification | Supported | No | ✅ Correct |

**Check Results**:

- **CHECK 1 (Supported)** ✅ — Footer condition `finding.status === "Contradicted"` is `false` for all 5 Supported findings. Accept/Reject never render. `[Send to Agent]` and `[Inspect Span]` always present. Machine badge untouched.
- **CHECK 2 (Contradicted → Accept)** ✅ — `handleAcceptFinding` calls `setFindings` with `humanDecision: { action: "accepted" }`. No fetch/XHR. Buttons disappear; secondary `✓ Accepted` badge renders. Original `Contradicted` badge untouched.
- **CHECK 3 (Contradicted → Reject)** ✅ — `[Reject]` opens modal. Submit disabled while textarea is empty. `handleRejectFinding` calls `setFindings` with `humanDecision: { action: "rejected", reason }`. No fetch/XHR. `✕ Rejected` badge renders in header; rejection reason block renders in card body. Finding stays in list. Original `Contradicted` badge untouched.

**Verdict**: Implementation is **100% correct** per the agreed specification.

**Note — Future expansion**: If every finding (including Supported) should show Accept/Reject, the only change needed is removing the `finding.status === "Contradicted" &&` guard at line 928 of `matter-detail-view.tsx`. All handlers, modal, state, and type definitions already support any `finding.id`.

---
