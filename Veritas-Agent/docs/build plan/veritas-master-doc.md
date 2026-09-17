# Veritas — master specification

Version 1.0 · 16 September 2026 · proposed implementation.

## Product boundary

A professional drafting assistant for Indian lawyers, organized around matters, conversations, evidence files, editable documents, and review findings. Initial domain: English IBC Section 7 working briefs and selected draft sections. Initial user model: one owner per matter; database designed for workspace membership, but simultaneous collaborative editing is deferred.

## Binding decisions

| ID | Decision | Reason |
|---|---|---|
| D01 | Build It is the baseline; aim for Best UI | Local Strands integration avoids a late cloud dependency |
| D02 | Main agent + Writer + Citation Reviewer + Fact Reviewer | Clear responsibilities, bounded coordination |
| D03 | Python workflow owns state transitions | A model must not decide whether approval rules apply |
| D04 | PostgreSQL is the application source of truth | Matters, versions, findings, and audit events need transactions |
| D05 | Tiptap JSON is canonical document content | HTML and PDF are derived renderings |
| D06 | Checks refer to exact document and source versions | Editing can invalidate previous evidence |
| D07 | Pending content may appear in a working draft | Honest review requires showing incomplete work |
| D08 | Reviewed export has a server-side gate | A green frontend badge cannot authorize finalization |
| D09 | Begin with a small curated corpus | Public dataset samples do not justify an authoritative store |
| D10 | Translation, full filings, broad jurisdictions are deferred | Protect time for the core review loop and UI |
| D11 | Sharing an authorized read tool is allowed | Permission boundaries matter more than artificial tool exclusivity |
| D12 | No autonomous filing, emailing, signing, or legal outcome prediction | Outside the selected product scope |

## Core mental model

A chat message is an instruction or explanation. A document is a saved, versioned artifact. A source is evidence with provenance. A finding is an assessment of a specific claim in a specific version. Approval is an authenticated human action on that version. These objects are related; none can safely replace another.

The main agent interprets the user's task and invokes specialists through narrow tool interfaces. Specialists communicate by returning structured task results to the orchestrator. They do not conduct an unbounded group conversation. The application assembles context and persists outputs; agents are not the database or the authorization system.

## Non-negotiable invariants

1. A user can retrieve only authorized matter content, including search results, object downloads, and streaming events.
2. A model never creates its own source identity or approval status. Citation references must resolve to stored evidence or remain unresolved.
3. “Found in a source,” “quote matches,” “supports this proposition,” and “current legal treatment checked” are distinct results.
4. Client documents are supplied evidence, not established truth. OCR and conflicting records must remain visible.
5. Every assessment records document version, claim hash, source version, check method, time, and limitations.
6. Changing relevant text or evidence makes related findings stale; a content edit creates a new version and invalidates document approval.
7. A model or browser cannot set a document to reviewed. The backend checks user identity, permissions, current version, and blocking findings transactionally.
8. Sources retrieved from the web and attachments are untrusted data, never instructions to the agent.
9. A failed source request means unavailable or unresolved, not fabricated.
10. Audit records describe observed operations. They are not a court certificate or a claim of tamper-proof storage.

## Verification and export policy

Working drafts may contain pending, unsupported, and unresolved content with visible annotations. Saving a draft is always possible for an authorized editor. Draft export is permitted with a visible draft label and accompanying unresolved-findings report.

Reviewed export requires: a saved current version; complete citation/fact coverage scans; no pending or stale required checks; resolved identity and exact-quote failures; no unresolved material factual contradictions; explicit human review of support and legal currency limitations; no unfilled required placeholders. A reviewer may record a reasoned exception to a judgment-based warning, but cannot turn a missing source or mismatched quote into a machine-verified result. Fix it, remove it, or retain it only in draft mode.

“Reviewed” means reviewed within this workflow. It does not mean court-approved, filing-compliant, independently true, or guaranteed current law.

## Scope assumptions needing confirmation

Assume a team of up to four, laptops capable of running frontend/backend/Postgres, English demo records, and access to at least one inference provider or an adequate local model. None is established by the uploaded material. The default plan works without paid legal APIs; exact runtime provider/model is selected by a kickoff capability test, not by promised free quotas.

Confirm team size, hardware, actual daily availability, lawyer access, event hours, and whether a cloud entry is desired. These affect sequencing, not the product invariants.

## Documentation ownership

Use sources.md for external evidence; agents.md for task boundaries; database.md and api-contracts.md for persistence contracts; editor-and-export.md for document semantics; ui-ux.md for visible behavior; mvp.md for delivery. main.md is the coding-assistant entry point.
