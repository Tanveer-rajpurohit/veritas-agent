# Functional specification

Priority definitions: P0 must work in the submitted demo, P1 strengthens the entry, P2 is post-hackathon.

| ID | Capability | Priority | Acceptance condition |
|---|---|---:|---|
| F01 | Matter workspace | P0 | Create, rename, list, reopen; authorized user sees associated chats/files/docs |
| F02 | File intake | P0 | Upload supported English file; display extraction status and page-aware text |
| F03 | Source correction | P1 | User edits extracted span; new source version invalidates affected findings |
| F04 | Matter chat | P0 | Persistent threads; attach existing/new source; stream agent events |
| F05 | Agent selection | P0 | Main, Writer, Citation Reviewer, Fact Reviewer exposed with bounded tools |
| F06 | Draft artifact | P0 | Agent response creates named, reopenable document version |
| F07 | Tiptap editing | P0 | Edit headings, paragraphs, lists, tables, citations; autosave and conflict status |
| F08 | Citation identity | P0 | Real fixture resolves; invented fixture is unresolved; evidence and query log visible |
| F09 | Exact quote check | P0 | Changed quote is flagged separately from case identity |
| F10 | Proposition support | P1 | Shows evidence passage and assessment with review-required label |
| F11 | Later-treatment state | P1 | Shows checked/not checked with timestamp/source; never implied from identity |
| F12 | Fact consistency | P0 | Conflicting amount/date across two records produces a linked finding |
| F13 | Evidence drawer | P0 | Claim selection opens exact passage/page and resolution actions |
| F14 | Review queue | P0 | Filter, navigate, resolve/retain with reason; counts update |
| F15 | Edit invalidation | P0 | Editing reviewed claim turns related check stale and clears doc approval |
| F16 | Draft export PDF | P0 | PDF renders current version and unresolved report with DRAFT label |
| F17 | JSON export | P0 | Valid manifest, content, findings, and checksums for current version |
| F18 | Reviewed export gate | P1 | Server rejects version with blocking/pending/stale checks; allows eligible version |
| F19 | Audit timeline | P1 | Append-only application events show actor/action/version/time |
| F20 | Auth and isolation | P0 | Cross-matter/file/document reads and streams are rejected server-side |
| F21 | Search | P1 | Search own matters, documents, and file names; result respects authorization |
| F22 | Translation | P2 | New version with status invalidation and bilingual review |
| F23 | Collaboration | P2 | Membership, roles, comments, and conflict-aware concurrent editing |
| F24 | Full prescribed filing | P2 | Lawyer-approved current template and formal validation suite |

## Status vocabulary

- Source: uploading, processing, ready, needs review, unsupported, failed.
- Document: working, checking, review needed, eligible, exported, archived.
- Finding: pending, supported, contradicted, unresolved, needs review, stale, resolved, waived.
- Citation dimension: identity, quotation, proposition support, subsequent treatment.

Use these values consistently across UI, API, database, analytics, and tests. “Verified” may be a UI summary only when the exact checked dimension is stated.

## Out of scope for the MVP

E-filing, electronic signature, client advice, predicting outcomes, autonomous external communications, billing, team collaboration, all Indian legal domains, Hindi OCR, and a guarantee of current/valid law. The product is a first-draft and review aid.
