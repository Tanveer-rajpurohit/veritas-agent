# Veritas: Legal Drafting Copilot Built Around Evidence-Linked Verification

AWS First Commit Hackathon, September 2026

## 1. The Real-World Problem in Indian Courts

When lawyers use generative AI to draft court documents, models produce realistic legal text with severe, unverified flaws: fabricated citations, real case titles attached to non-existent judicial paragraphs, and fictional statutory remedies.

This has already caused substantial disruption and judicial sanction in Indian courts, across every forum and practice area:

| When | Forum | What happened | Sourcing |
|---|---|---|---|
| **Jul 2026** | Supreme Court of India | ***Pooja Ramesh Singh v. Jammu and Kashmir Bank Ltd.***, 2026 INSC 668 — NCLT and NCLAT insolvency orders set aside after the Court found they relied on **citations that do not exist** *and* on **paragraphs attributed to real judgments that those judgments never contained**. | **Primary-source verified** — [SC landmark summary](https://www.sci.gov.in/landmark-judgment-summaries/), [judgment PDF](https://api.sci.gov.in/supremecourt/2025/52338/52338_2025_5_1501_71939_Judgement_02-Jul-2026.pdf) |
| **Sept 2026** | Supreme Court of India | *Vijay Ghanshyam Gadiya v. Union of India* — customs penalty set aside; the underlying demand rested on AI-generated precedent. Reported at roughly Rs. 425 crore. | *Reported* — not primary-source verified by this team |
| **Oct 2025** | Bombay High Court | Tax order quashed after three cited authorities were found not to exist. Reported at roughly Rs. 28 crore. | *Reported* — not primary-source verified by this team |
| **Dec 2024** | Bengaluru ITAT | Order recalled after four fictitious citations surfaced in the filed submissions. Reported at roughly Rs. 669 crore. | *Reported* — not primary-source verified by this team |
| **2024** | Stanford RegLab | Commercial legal AI tools hallucinate citations in **17% to 34%** of queries *even with retrieval augmentation*. | **Published study** |

**What the pattern shows.** The money is the headline; the structure is the finding. This spans Supreme Court, High Court, ITAT and NCLT/NCLAT, and spans insolvency, customs and direct tax — so it is a property of the tool, not of one careless advocate. More importantly, the failure modes are **distinct and non-overlapping**: a citation that does not exist is a different defect from a real case quoted with words it never contained, which is different again from a real, accurately-quoted case that does not support the proposition asserted. *Pooja Ramesh Singh* contains at least two of these simultaneously. No single "✓ verified" badge can represent that, which is precisely why Veritas checks four independent axes and reports them separately.

> **Binding sourcing discipline.** The verification column travels with these claims into the README, pitch, video description, and demo narration — it is not stripped for brevity. Two claims are primary-source verified; three are widely reported but were not independently verified by this team (`research-audit.md`, rows 24–25). They are not asserted to be false; they are labelled. Likewise, do not reduce *Pooja Ramesh Singh* to "six fake cases": the official summary distinguishes nonexistent citations from nonexistent attributed paragraphs, and that distinction is exactly the `identity` vs. `quotation` split the Citation Reviewer implements. Collapsing it throws away the sharpest point in the pitch.

The underlying issue is straightforward: verification is currently an optional, manual step that requires cross-checking every paragraph against external databases. When verification is optional and time-consuming, it gets skipped.

## 2. The Solution: Evidence-Linked Drafting

Veritas makes verification non-optional by integrating evidence retrieval directly into the drafting canvas. Drafting and verification are separated into distinct roles coordinated by an application-controlled state machine:

- **Generation-Time Grounding:** The Writer Agent never invents authorities from raw model memory. It retrieves official statute text and precedent reasoning, tagging every factual claim and legal citation with stable evidence identifiers.
- **Tri-Directional Evidence Review:** In the editor canvas, selecting any claim opens the Evidence Drawer, displaying the exact passage from the client record or authentic court judgment alongside the draft sentence.
- **Multi-Dimensional Citation Check:** Citations are not treated as a single binary check. Veritas evaluates four distinct dimensions:
  1. *Identity:* Does the judgment or statutory provision exist in authoritative records?
  2. *Quotation:* Does the quoted sentence match the official text word for word?
  3. *Support:* Does the cited decision actually support the proposition asserted?
  4. *Treatment:* Has the ruling been overruled, reversed, or distinguished?
- **Factual Consistency Review:** The Fact Reviewer extracts structured propositions (dates, financial figures, party names) from the draft and matches them against the client's uploaded intake documents. Conflicting records (such as varying default amounts between a loan agreement and a bank certificate) are surfaced for human resolution.
- **Stale Invalidation on Edit:** If a lawyer modifies a sentence in the Tiptap canvas, the system recalculates the content hash and immediately flags related findings as Stale. Stale checks must be re-run before reviewed export is permitted.
- **Gated Export:** Working drafts can be exported with an unresolved findings appendix at any time. Reviewed exports require passing a server-evaluated gate where all blocking findings are resolved.

The core rule: Veritas never relies on an LLM to grade its own output. Case existence and quote matching are evaluated deterministically against stored source records, while legal support is explicitly labeled as a probabilistic assessment for the lawyer's review.

## 3. Product Positioning and Differentiation

| Platform | Current Functionality | Where It Stops |
|---|---|---|
| **CaseMine** (AMICUS + CaseIQ) | Drafts document templates linked to proprietary database; CaseIQ flags citations on uploaded briefs | Review occurs after the brief is written; institutional credit pricing; focused on law firms |
| **Manupatra AI** | Grounded research over curated case database | Research retrieval only; lacks in-canvas drafting enforcement |
| **SCC Online AI** | Grounded case search and citator | Research tool; no inline drafting or record discrepancy detection |
| **Veritas** | Sentence-to-evidence workspace with automatic stale-on-edit invalidation and gated exports | Focuses on first-draft preparation and auditable review for solo and junior practitioners |

Veritas does not claim to have invented legal RAG. Its differentiation lies in making evidence review transparent, immediate, and structurally tied to document versioning.

## 4. Multi-Agent Architecture

Veritas runs an orchestrator coordinating three specialized roles using the Strands Agents SDK (AWS open source). Each role has strictly bounded tool access:

```text
Lawyer inputs facts & uploads client records (PDF / Image)
  │
  ▼
Main Agent (Orchestrator: session state, routing, SSE event stream)
  │
  ├── File Upload: PyMuPDF / Textract extracts page-aware text into Client Intake JSON
  │
  ▼
Writer Agent (Drafting Role)
  - Retrieves statutory text and precedent reasoning
  - Proposes allowlisted block operations into Tiptap JSON
  - Tags every claim with candidate evidence IDs
  ▼
Citation Reviewer (Verification Role)
  - Checks Identity against local curated corpus and official sources
  - Checks Quotation against stored authentic text
  - Checks Support via focused ratio assessment
  - Checks Treatment where citation history is available
  ▼
Fact Reviewer (Consistency Role)
  - Extracts structured propositions (amounts, dates, parties)
  - Compares draft assertions against client intake records
  - Highlights record conflicts for lawyer resolution
  ▼
Tiptap Editor Canvas & Tri-Directional Evidence Drawer
  - Displays draft with subtle gutter indicators
  - Selecting a claim reveals exact source passage with page number
  - Lawyer resolves discrepancies and records reasons
  ▼
Document Versioning & Gated Export
  - Edits invalidate previous checks and set status to Stale
  - Draft PDF / JSON exported with unreviewed findings appendix
  - Reviewed export unlocked only when all blocking checks pass
```

### Specialized Roles and Boundaries

1. **Main Agent (Orchestrator):** Manages session lifecycle, interprets user instructions, validates document ownership, and sequences specialist execution. It never invents evidence or marks findings resolved.
2. **Writer Agent:** Assembles draft sections using only retrieved client evidence and verified legal authorities. It emits allowlisted document operations (such as insertBlock, replaceText, addCitationRef) rather than arbitrary unvalidated HTML.
3. **Citation Reviewer:** Audits legal references against official court texts and statutory provisions. It categorizes findings across identity, quotation, support, and subsequent treatment. It never rewrites legal text silently.
4. **Fact Reviewer:** Compares draft statements against client intake documents. It identifies ungrounded assertions and conflicting records (such as discrepant financial figures) without declaring the underlying real-world fact true.

## 5. Data Sources and Limitations

All sources follow a strict hierarchy where primary official records override secondary search indices:

- **Client Uploaded Intake:** PDF loan agreements, demand notices, and bank statements parsed into page-aware text. This forms the sole ground truth for factual consistency.
- **Curated Primary-Source Corpus:** Curated Supreme Court and NCLAT judgments covering IBC Section 7 proceedings (including *Pooja Ramesh Singh v. J&K Bank Ltd.*, 2026 INSC 668).
- **IndiaCode by eCourtsIndia:** Public REST API providing Central and State Acts (`GET /api/v1/{act}/section/{number}`). Used for statutory provisions while respecting documented limits regarding OCR text and subordinate legislation.
- **Indian Kanoon API:** Optional secondary fallback for judgment search and full-text retrieval, subject to standard attribution and rate limits.
- **InIRAC Benchmark:** 511-row research dataset utilized for testing IRAC entity extraction and relationship structures. It is not treated as gold-verified authority on its own.

## 6. Technical Stack and AWS Alignment

Veritas targets the **Build It track + Best UI category** of the AWS First Commit hackathon:

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, and Tiptap (ProseMirror) for structured document editing.
- **UI Architecture:** Three-pane workbench consisting of Matter Navigation (232px), Agent Chat and Task Stream (380px), and Document Canvas with sliding Evidence Drawer.
- **Agent Orchestration:** Strands Agents SDK (AWS open source), modeling specialist agents as callable tools.
- **Backend API:** FastAPI (Python) providing REST endpoints, Pydantic validation schemas, and Server-Sent Events (SSE) streaming.
- **Database:** Single PostgreSQL database utilizing relational tables and JSONB columns for immutable document versions, claims, evidence spans, findings, and audit logs.
- **Authorization & Policy:** Application-level tenant checks backed by Amazon Cedar policy schemas to enforce the human-in-the-loop review gate.
- **Document Export:** Deterministic PDF rendering (via headless browser print) and structured JSON packages containing complete findings and source manifests.

## 7. The Winning MVP Slice (P0)

To ensure high quality within the hackathon timeline, Veritas focuses on a single end-to-end slice:
- **Matter:** Section 7 Insolvency and Bankruptcy Code (IBC) application.
- **Records:** Two uploaded client records with a deliberate financial discrepancy (Loan Sanction Letter stating Rs. 4.85 Crore vs. Bank Demand Certificate stating Rs. 5.20 Crore).
- **Draft:** Working brief generated by the Writer Agent with linked citations.
- **Fixtures Tested:**
  1. One authentic citation correctly identified and quote-matched.
  2. One invented citation cleanly marked as Unresolved and blocked from reviewed export.
  3. One authentic citation with a modified quote flagged for quotation mismatch.
  4. One factual discrepancy between the two client records surfaced in the Evidence Drawer.
- **Hero Interaction:** The lawyer resolves the financial figure, edits the draft in Tiptap, observes the status turn to Stale, re-runs the check, and exports the final draft.

## 8. Recorded Demo Plan (170 Seconds)

The demo adheres strictly to the official hackathon limit of 3 minutes (180 seconds):

- **0 to 15s:** Open the finished workspace and click a highlighted citation to show the tri-directional evidence drawer.
- **15 to 35s:** Present the problem using the Supreme Court's *Pooja Ramesh Singh* ruling.
- **35 to 55s:** Open the matter, display two uploaded client records, and ask the Main Agent for a working brief.
- **55 to 80s:** The working brief opens in Tiptap; show the Strands agent task execution stream.
- **80 to 115s:** Inspect the genuine citation, the unresolved invented citation, and the quote mismatch.
- **115 to 140s:** Open the conflicting amount, compare both client documents side by side, and resolve the figure.
- **140 to 155s:** Edit the resolved sentence in the editor; show the status turn Stale immediately and re-run verification.
- **155 to 170s:** Generate the draft PDF with unreviewed findings appendix and present the final architecture overview.
