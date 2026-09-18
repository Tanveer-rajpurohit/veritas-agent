# Frontend Inspection: Review Findings Feature

> **Status**: Inspection only. No code changed. Awaiting approval before implementation.

---

## 1. Component / Page Responsible for Review Findings Cards

**Single file responsible for everything:**

### [`matter-detail-view.tsx`](file:///d:/veritas-agent/apps/web/components/workspace/matter-detail-view.tsx)

This is a large (~1033 line) monolithic client component (`"use client"`). It contains the **full logic, state, and render** for three tabs:
- `documents`
- `drafts`
- `forensics` ← **this is the Review Findings tab**

The tab label is `"Review Findings"` but the internal `id` is `"forensics"`. The render block is at **lines 769–887** under `{activeTab === "forensics" && ...}`.

There is **no separate component** for finding cards — they are rendered inline inside this file with `.map()` over `filteredFindings`.

---

## 2. Data Structure / Type Used for a Finding

**Defined at lines 54–69** of [`matter-detail-view.tsx`](file:///d:/veritas-agent/apps/web/components/workspace/matter-detail-view.tsx#L54-L69):

```typescript
interface FindingItem {
  id: string;
  dimension:
    | "Quotation"
    | "Identity"
    | "Proposition Support"
    | "Subsequent Treatment"
    | "Fact Consistency";
  agent: "Citation Reviewer" | "Fact Reviewer";
  status: "Supported" | "Contradicted";
  title: string;
  citationOrSource: string;
  proposition: string;
  bench?: string;
  detail: string;
}
```

**Critical observations:**
- `status` is only a **binary enum**: `"Supported" | "Contradicted"`. There is no `"Unresolved"`, `"Needs Review"`, `"Stale"`, `"Resolved"`, or `"Waived"` status at all.
- There is **no `resolutionAction` field**, **no `waiverReason` field**, and **no `resolvedBy`** field.
- The type is **local** — declared inside the component file, not in `types/workspace/types.ts`.

---

## 3. How Finding Status is Currently Represented

- **State storage**: `const [findings] = useState<FindingItem[]>([...])` — **no setter**. The findings array is immutable in the current implementation. Nothing can mutate it.
- **Status rendering** (lines 820–833):
  ```tsx
  <span className={`... ${
    finding.status === "Supported"
      ? "bg-[#edf8f1] text-[#1e6f3d] border border-emerald-200"
      : "bg-rose-50 text-rose-700 border border-rose-200"
  }`}>
    {finding.status === "Supported" ? <CheckIcon size={10} /> : <AlertCircleIcon size={10} />}
    <span>{finding.status}</span>
  </span>
  ```
- Status is a binary visual switch: **green** (`Supported`) or **red** (`Contradicted`).
- The `"Contradicted"` badge is currently the only one that would trigger a resolution need — but there is no accept/reject/waive action wired up.

---

## 4. Whether an Existing Resolution API/Service is Implemented

**No resolution API exists in the frontend.**

- `lib/` directory only contains:
  - `lib/workspace-data.ts` — seed data utility
  - `lib/validation/` — (exists but not inspected, likely form validation)
- There is **no** `lib/api/` directory, **no** API service files, **no** fetch calls, and **no** HTTP client.
- The `POST /findings/{id}/resolutions` endpoint defined in `docs/build plan/api-contracts.md` has **no frontend counterpart**.
- All actions in the finding cards currently call `alert()` stubs or `onSendToAgent()`.

---

## 5. Whether Human Resolution Data Exists in the Frontend

**No.** There is no:
- Resolution state (`accept`, `keep_with_reason`, `waive`, `replace`)
- Waiver reason text input
- Resolved-by / actor tracking
- Resolution history display
- Any concept of a finding being "resolved" or "waived" in the UI

The only human action on a finding card today is:
1. **"Send to Agent"** → calls `onSendToAgent?.({ title: finding.title, type: "draft" })`
2. **"Inspect Span"** → calls `alert()` stub

---

## 6. Existing UI Components / Design System

**Design tokens** live in [`design-tokens.css`](file:///d:/veritas-agent/apps/web/app/design-tokens.css):

| Token | Value | Usage |
|---|---|---|
| `--vt-brand` | `#6292c1` | Primary brand blue |
| `--vt-brand-strong` | `#487aa8` | Buttons, active states |
| `--vt-brand-soft` | `#edf4fa` | Muted badge backgrounds |
| `--vt-success` | `#2e7d46` | Supported status text |
| `--vt-success-surface` | `#dcfce7` | Supported badge bg |
| `--vt-danger` | `#a5483f` | Contradicted/error text |
| `--vt-danger-surface` | `#fdeae7` | Contradicted badge bg |
| `--vt-warning` | `#9a6628` | Amber / needs-review |
| `--vt-warning-surface` | `#fef3c7` | Amber badge bg |
| `--vt-idle-ink` | `#64707d` | Gray / not-run text |
| `--vt-idle-surface` | `#eceff2` | Gray badge bg |

**Fonts**: Figtree (sans), Newsreader (serif/display), JetBrains Mono (code)

**Icon library**: Custom SVG icons in [`workspace-icons.tsx`](file:///d:/veritas-agent/apps/web/components/workspace/workspace-icons.tsx). Confirmed available icons (imported in matter-detail-view): `CheckIcon`, `AlertCircleIcon`, `BotIcon`, `EyeIcon`, `XIcon`, `PlusIcon`, `ArrowLeftIcon`, `UploadIcon`, `SearchIcon`, `FileTextIcon`, `DownloadIcon`, `ExternalLinkIcon`.

**Button patterns** in use across the file:
- Primary action: `rounded-md bg-[#487aa8] text-white hover:bg-[#3d6991]`
- Ghost/secondary: `rounded-md bg-[#edf4fa] text-[#2c5478] border border-[#cbe0f2]`
- Tertiary/icon: `h-6 border border-stone-200 text-stone-600 hover:bg-stone-50`

**Modal pattern**: Inline `draftModalOpen && (<div className="fixed inset-0 z-50 ...">)` — no external modal component. Backdrop + centered dialog div, closed on `mouseDown` outside or `XIcon` button.

---

## 7. State Management Pattern

This page uses **local React state only** (`useState`). No Zustand, no context, no React Query, no SWR.

```typescript
// Tab
const [activeTab, setActiveTab] = useState<"documents" | "drafts" | "forensics">("documents");

// Filter
const [findingCategory, setFindingCategory] = useState<"all" | "citation" | "fact">("all");

// Data (no setter for findings!)
const [findings] = useState<FindingItem[]>([...hardcoded seed data...]);
const [filteredFindings] = useMemo(() => ...filter by findingCategory..., [findings, findingCategory]);
```

State is fully self-contained within `MatterDetailView`. Nothing is lifted to a store.

---

## 8. Summary: Where Accept / Reject Should Be Implemented

### What needs to change

| Area | Current State | What to Add |
|---|---|---|
| `FindingItem` type | `status: "Supported" \| "Contradicted"` | Add `"Unresolved"`, `"Needs Review"`, `"Stale"`, `"Resolved"`, `"Waived"` |
| `FindingItem` fields | None for resolution | Add optional `resolution?: { action, reason, resolvedAt }` |
| `findings` state | `const [findings]` (no setter) | Change to `const [findings, setFindings]` |
| Finding card footer | `Send to Agent` + `Inspect Span` | Add `Accept` + `Reject / Waive` action buttons for contradicted/unresolved findings |
| Waive modal | Does not exist | Inline or small modal for mandatory waiver reason text input |
| Status badge | Binary green/red | Expand to handle all 5+ states with amber, gray, and stale variants |

### Where exactly to implement

- **Everything stays in** [`matter-detail-view.tsx`](file:///d:/veritas-agent/apps/web/components/workspace/matter-detail-view.tsx) — no new files needed unless a resolution modal grows complex.
- **`FindingItem` type** — expand in-place at lines 54–69.
- **Resolution handler** — new `handleResolveFinding(id, action, reason?)` function, calls `setFindings(prev => prev.map(...))` to update the status of the matching finding.
- **Action buttons** — added to the card footer (lines 857–882) with conditional rendering: show Accept + Waive only when `status === "Contradicted" || status === "Needs Review"`.
- **Waive modal state** — `const [waivingFindingId, setWaivingFindingId] = useState<string | null>(null)` + a small modal to capture waiver reason.
- **Status badge** — expand the ternary at lines 820–833 to a proper map/switch covering all states.

---

## 9. Ambiguities

| # | Ambiguity | Impact |
|---|---|---|
| 1 | Should `Supported` findings show any action buttons (e.g., "Mark Stale", "Override")? Or only `Contradicted` / `Needs Review`? | Determines card footer complexity |
| 2 | Should the `Inspect Span` button stay or be replaced/merged with the Accept/Reject flow? | Layout of footer buttons |
| 3 | Is the "Accept" action purely a frontend state change, or should it call the backend `POST /findings/{id}/resolutions`? | Whether a service layer needs to be created |
| 4 | Should waived findings be hidden from the list, shown with a distinct style, or remain unchanged and just labeled "Waived"? | Filter behavior and card visual treatment |
| 5 | The tab label is `"Review Findings"` but the internal id is `"forensics"`. Should this be cleaned up to `"review-findings"` for consistency? | Minor — but affects URL-addressability if tabs become routes |
