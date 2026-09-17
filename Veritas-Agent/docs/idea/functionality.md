# Veritas Functional Specification and Architecture

Veritas is a professional drafting and verification workbench for Indian legal matters. This document details its functional capabilities, user interface architecture, status vocabulary, and feature priority tiers.

## 1. User Interface Architecture: The Three-Pane Shell

The interface is engineered to present evidence alongside drafting without cognitive overload.

```text
┌─────────────────┬─────────────────────────────────┬──────────────────────────────────┐
│ Matter Rail     │ Conversation & Tasks            │ Drafting Canvas                  │
│ (232 px)        │ (380 px)                        │ (Remaining Width)                │
├─────────────────┼─────────────────────────────────┼──────────────────────────────────┤
│ • Matter search │ • Main Agent thread             │ • Document Title & Autosave status│
│ • Active files  │ • Task execution stream (SSE)   │ • Trust Strip summary            │
│ • Draft briefs  │ • Working brief preview cards   │ • Tiptap ProseMirror editor      │
│ • Review queue  │ • Action prompt & file attach   │ • Inline subtle gutter markers   │
│                 │ • Specialist role selector      │                                  │
└─────────────────┴─────────────────────────────────┴──────────────────────────────────┘
                                                      Select claim -> Sliding Evidence Drawer
```

### The Tri-Directional Hero Interaction
When a lawyer selects any marked claim or citation in the editor canvas:
1. The sliding **Evidence Drawer** opens without displacing the editor.
2. The exact matching passage from the uploaded client record or official judgment is highlighted with its page number.
3. The lawyer can review the finding, compare conflicting texts side by side, apply a suggested resolution, or record a reason for retaining the drafted text.

## 2. Feature Priority Matrix

Priority tiers:
- **P0 (Core Slice):** Essential functionality required for the 170-second hackathon demo.
- **P1 (Hackathon Polish):** Strengthens the submission and scoring criteria.
- **P2 (Deferred / Post-Hackathon):** Out of scope for the current sprint.

| ID | Feature Name | Priority | Acceptance Criteria |
|---|---|---:|---|
| F01 | Matter Workspace | P0 | Create, list, open, and archive matters; matter-level tenant isolation enforced server-side. |
| F02 | Source File Intake | P0 | Upload PDF, DOCX, and image records; extract page-aware text; show extraction progress. |
| F03 | Source Correction | P1 | Edit extracted text spans; saving a corrected source version marks affected findings Stale. |
| F04 | Matter Chat | P0 | Persistent thread scoped to matter; attach records; stream structured agent tasks via SSE. |
| F05 | Role Selector | P0 | Select Main Agent, Writer, Citation Reviewer, or Fact Reviewer with explicit tool boundaries. |
| F06 | Draft Artifact | P0 | Agent drafting emits candidate artifact cards in chat that open directly in the canvas. |
| F07 | Tiptap Editing | P0 | Edit legal text (headings, paragraphs, lists, citations); debounced autosave with conflict detection. |
| F08 | Citation Identity | P0 | Resolves authentic cases against curated corpus; invented citations marked as Unresolved. |
| F09 | Exact Quote Check | P0 | Word-for-word quote matching against official text; flags fabricated or modified quotes. |
| F10 | Proposition Support | P1 | Narrow ratio assessment indicating whether the cited authority supports the claim. |
| F11 | Treatment Status | P1 | Displays subsequent history (overruled/distinguished); shows "Not checked" when citator data is absent. |
| F12 | Fact Consistency | P0 | Detects discrepancies across client records (such as conflicting default figures) with side-by-side view. |
| F13 | Evidence Drawer | P0 | Tri-directional link from draft sentence to exact source passage, page number, and resolution action. |
| F14 | Review Queue | P0 | Filter findings by state (blocking, needs review, stale, resolved); tracks progress count. |
| F15 | Edit Invalidation | P0 | Modifying reviewed text recalculates content hash, turns status to Stale, and clears approval. |
| F16 | Draft PDF Export | P0 | Exports formatted PDF with prominent DRAFT label and appendix of unverified/stale findings. |
| F17 | JSON Export | P0 | Exports structured JSON package with versioned content, source manifests, and finding logs. |
| F18 | Reviewed Export Gate | P1 | Server rejects export if blocking or stale checks remain; unlocks when all gates are satisfied. |
| F19 | Audit Timeline | P1 | Immutable event log recording user approvals, waivers, agent tool calls, and timestamps. |
| F20 | Auth & Isolation | P0 | Cross-matter access strictly forbidden at API and database boundaries. |
| F21 | Matter Search | P1 | Search across own matters, document titles, and source names respecting permissions. |
| F22 | Hindi Translation | P2 | Deferred. Bilingual translation with status invalidation. |
| F23 | Team Collaboration | P2 | Deferred. Multi-user concurrent editing, presence indicators, and role permissions. |
| F24 | Prescribed Court Forms | P2 | Deferred. Formal Form 1 automation and jurisdiction-specific validation rules. |

## 3. Dedicated Agent Roles and Tool Boundaries

Veritas runs four distinct roles using the Strands Agents SDK (AWS open source):

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                        MAIN AGENT (Orchestrator Role)                            │
│  Tracks session state, validates tenant permissions, sequences specialist tools  │
└────────────┬─────────────────────────┬─────────────────────────┬─────────────────┘
             │ (1. Draft Brief)        │ (2. Citation Audit)     │ (3. Fact Consistency)
             ▼                         ▼                         ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────────┐
│      WRITER AGENT       │ │    CITATION REVIEWER    │ │      FACT REVIEWER      │
├─────────────────────────┤ ├─────────────────────────┤ ├─────────────────────────┤
│ • Receives draft brief  │ │ • Identifies citations  │ │ • Parses propositions   │
│ • Retrieves statutes    │ │ • Curated corpus lookup │ │ • Compares client intake│
│ • Emits allowlisted     │ │ • Exact quote check     │ │ • Surfaces discrepancies│
│   block operations      │ │ • Ratio support review  │ │ • Proposes resolutions  │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

### Server-Enforced Invariant: Status Not Stored in Editor Nodes
Editor JSON nodes (`citationRef`, `factRef`) store only stable reference IDs. Verification status is always dynamically joined from the `findings` table for the active `document_version_id`. This guarantees that copying HTML, editing text, or restoring old versions cannot produce fake green badges.

## 4. Status Vocabulary

To maintain clarity across the frontend, API, database, and logs, Veritas strictly enforces standard status tokens:

- **Source Status:** `uploading`, `processing`, `ready`, `needs_review`, `unsupported`, `failed`
- **Document Version Status:** `working`, `checking`, `review_needed`, `eligible`, `exported`, `archived`
- **Finding Status:** `pending`, `supported`, `contradicted`, `unresolved`, `needs_review`, `stale`, `resolved`, `waived`
- **Citation Dimensions:** `identity`, `quotation`, `proposition_support`, `subsequent_treatment`

We explicitly prohibit misleading composite labels such as "100% verified" or aggregate "truth percentages." Progress is shown in concrete counts (for example, "8 of 12 items reviewed").

## 5. Out of Scope for the Current Sprint

The following items are intentionally excluded from the hackathon MVP to ensure depth and stability in the core workflow:
- Automated e-filing with court registries.
- Digital signature certification.
- Predictive legal outcome scoring.
- Autonomous legal advice to clients.
- Multi-user real-time operational transformation.
- Full statutory ingestion for all Indian legal domains.
- Native Hindi OCR.
