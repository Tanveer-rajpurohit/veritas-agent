# docs/idea — narrative pack

These six files are the **narrative / pitch layer**: what the product is, who it is for, and how the story is told in the README and the demo video.

## Precedence

`docs/build plan/` is **canonical** for every implementation decision.

| Question | Authoritative file |
|---|---|
| Stack, runtime boundaries, versions | `build plan/tech.md` |
| Schema, versioning, ownership | `build plan/database.md` |
| Endpoints, SSE envelope, error codes | `build plan/api-contracts.md` |
| Agent roles, tool contracts, schemas | `build plan/agents.md` |
| Tiptap schema, export profiles | `build plan/editor-and-export.md` |
| Fixtures, metrics, required tests | `build plan/evaluation.md` |
| Threat model, controls, Cedar | `build plan/security.md` |
| Screens, tokens, interactions | `build plan/ui-ux.md` |
| **What was wrong in earlier drafts** | `build plan/research-audit.md` |
| Coding-agent operating brief | `build plan/main.md` |

Where a file here overlaps one in `build plan/`, **`build plan/` wins**. These files carry tone and framing; they are not a second specification. If you find a real conflict, fix it here and record it — do not implement from this folder.

## Sourcing rule (binding, applies to every outward-facing artifact)

The problem section carries **five** incidents — Supreme Court (×2), Bombay High Court, Bengaluru ITAT, and the Stanford RegLab benchmark. The breadth is the argument: it spans every forum and every practice area, so the failure is a property of the tool rather than of one careless advocate. Do not trim the list for brevity.

**Every claim travels with its verification status, and that column is never stripped:**

| Status | Claims |
|---|---|
| **Primary-source verified** | *Pooja Ramesh Singh v. Jammu and Kashmir Bank Ltd.*, 2026 INSC 668 (SC summary + judgment PDF); Stanford RegLab 17–34% (published study) |
| *Reported, not verified by this team* | *Vijay Ghanshyam Gadiya* (~Rs. 425 cr); Bombay HC tax order (~Rs. 28 cr); Bengaluru ITAT (~Rs. 669 cr) |

`research-audit.md` rows 24–25 flagged the second group as not primary-source verified. They are **not** asserted to be false, and they are **not** removed — they are labelled. Rupee figures are given as approximations ("roughly Rs. 425 crore"), never as precise sums we cannot stand behind.

Do not reduce *Pooja Ramesh Singh* to "six fake cases." The official summary distinguishes nonexistent citations from nonexistent paragraphs attributed to real judgments, and that distinction is precisely the `identity` vs. `quotation` split the Citation Reviewer implements. Collapsing it throws away the sharpest point in the pitch.

**Why this is enforced rather than suggested:** Veritas exists to stop confident unverified assertions from reaching a court. Labelling our own evidence is not a hedge — it is the product demonstrating its own thesis on the first slide. A judge who sees five incidents with an honest verification column trusts the build more than one who sees five bare numbers, and far more than one who fact-checks a figure and finds it unsupported.

## Files here

| File | Purpose |
|---|---|
| `idea.md` | Problem, solution, first user, differentiation |
| `veritas-master-doc.md` | Full narrative: problem → solution → architecture → MVP → demo |
| `mvp.md` | P0 slice, cut line, sprint schedule, demo script |
| `flow.md` | End-to-end flows: ingestion, orchestration, review, invalidation, export |
| `functionality.md` | Feature matrix with priorities, status vocabulary, agent boundaries |
| `sources.md` | Data sources, authority hierarchy, limitations, evidence manifest |
