# Veritas: Idea and Product Vision

## Executive Summary

Veritas is a matter-based legal drafting and review workspace built for Indian lawyers. Its core workflow is structured around a simple principle: **sentence -> evidence -> decision**. When a lawyer selects any factual assertion or legal reference in a draft, the workspace presents the exact source document passage or statutory authority beside it. Discrepancies are flagged, resolved with recorded reasons, and tracked across immutable document versions.

The guiding promise to the lawyer is: **"Draft with the evidence beside you."**
We explicitly avoid ungrounded marketing claims such as "100% verified," "hallucination-free," or "court-certified." Veritas is designed as a professional drafting copilot that accelerates preparation while keeping the practicing lawyer in full control of legal judgment.

## The Real-World Problem in Indian Courts

When lawyers turn to general-purpose AI to draft pleadings, models generate fluent text with severe hidden defects: **invented citations**, **real cases cited for propositions they never decided**, and **paragraphs attributed to judgments that do not contain them**. This is not hypothetical. It has already produced judicial sanction, recalled orders, and set-aside judgments across Indian forums:

| When | Forum | What happened | Sourcing |
|---|---|---|---|
| **Jul 2026** | Supreme Court of India | ***Pooja Ramesh Singh v. Jammu and Kashmir Bank Ltd.***, 2026 INSC 668 — NCLT and NCLAT insolvency orders set aside after the Court found they relied on **citations that do not exist** *and* on **paragraphs attributed to real judgments that those judgments never contained**. | **Primary-source verified** — [SC landmark summary](https://www.sci.gov.in/landmark-judgment-summaries/), [judgment PDF](https://api.sci.gov.in/supremecourt/2025/52338/52338_2025_5_1501_71939_Judgement_02-Jul-2026.pdf) |
| **Sept 2026** | Supreme Court of India | *Vijay Ghanshyam Gadiya v. Union of India* — a customs penalty set aside after the underlying demand was found to rest on AI-generated precedent. Reported at roughly Rs. 425 crore. | *Reported* — incident and figure not primary-source verified by this team |
| **Oct 2025** | Bombay High Court | A tax order quashed after three cited authorities were found not to exist. Reported at roughly Rs. 28 crore. | *Reported* — not primary-source verified by this team |
| **Dec 2024** | Bengaluru ITAT | An order recalled after four fictitious citations were found in the filed submissions. Reported at roughly Rs. 669 crore. | *Reported* — not primary-source verified by this team |
| **2024** | Stanford RegLab | Benchmark of commercial legal AI tools: citation hallucination in **17% to 34%** of queries *even with retrieval augmentation*. | **Published study** |

### Read the pattern, not the totals

The rupee figures are the headline, but they are not the finding. Three things matter more:

1. **It spans every forum.** Supreme Court, High Court, ITAT, NCLT/NCLAT. This is not one careless advocate — it is a systemic failure mode of the tool.
2. **It spans every practice area.** Insolvency, customs, direct tax. Nothing about the domain protects you.
3. **The failure modes are distinct, and a single check cannot catch them.** A citation that does not exist is a different defect from a real case quoted with words it never contained, which is different again from a real, accurately-quoted case that does not support the proposition it is cited for. *Pooja Ramesh Singh* contains at least two of these at once.

That third point is the entire design argument for Veritas. It is why citations are checked on **four independent axes** — identity, quotation, support, and subsequent treatment — rather than scored with one green tick. A tool that returns "✓ verified" for *Mobilox Innovations* because the case is real, while the sentence attributed to it was never written by that Court, has not helped the lawyer. It has given them false confidence in front of a judge.

> **Sourcing discipline.** The verification column above is not decoration — it stays in the README, the pitch, and the video description, and it is applied everywhere these incidents are repeated. Two of these claims were verified against primary sources; three are widely reported but were not independently verified by this team. We do not assert the unverified ones are false, and we do not present them as though they were confirmed. A product built to stop confident unverified assertions cannot open with confident unverified assertions. Labelling our own evidence is the most credible thing this pitch can do.

None of these practitioners intended to deceive the court. They used AI to save time, the tool produced confident prose, and nobody hand-verified every citation before filing. Verification was an optional, tedious step, so it was skipped.

## The Solution: Evidence-Linked Drafting

Veritas makes verification non-optional by embedding evidence retrieval directly into the drafting lifecycle. Drafting and review are split into separate roles coordinated through an application-controlled state machine:

1. **Generation-Time Grounding:** The Writer Agent drafts from retrieved evidence spans and verified statutory text. Every factual assertion and legal reference is assigned a stable candidate evidence identifier.
2. **Deterministic Citation Review:** Every citation is inspected across four separate dimensions:
   - **Identity:** Does the judgment or statute exist in official court records or verified repositories?
   - **Quotation:** Does the quoted excerpt match the authentic judgment text word for word?
   - **Support:** Does the judicial ratio actually support the legal proposition asserted?
   - **Treatment:** Has the decision been subsequently overruled, reversed, or distinguished?
3. **Factual Consistency Review:** The Fact Reviewer extracts structured propositions (amounts, dates, default events) from the draft and matches them against the client's uploaded source records. When records conflict (such as a loan agreement stating Rs. 4.85 Crore while a bank demand certificate states Rs. 5.20 Crore), Veritas highlights both passages side by side for lawyer resolution.
4. **Stale Invalidation on Edit:** When a lawyer edits a sentence in the Tiptap canvas, the system immediately recalculates the content hash and marks related findings as Stale. Stale checks must be re-run before the document can qualify for a reviewed export.
5. **Gated Export:** Working drafts can be exported at any time with an appendix detailing unverified or stale findings. Reviewed exports require passing a strict server-evaluated policy gate where all blocking findings are resolved.

## First User and Target Scope

- **Primary User:** Solo practitioners, junior associates, and boutique law firms handling commercial and insolvency litigation. These users need drafting speed and rigorous citation accuracy but are priced out of institutional databases.
- **First Job (MVP Slice):** Preparing an Insolvency and Bankruptcy Code (IBC) Section 7 working brief from English client records. This includes chronology extraction, document discrepancy detection, authority checking, and an editable draft brief with linked evidence.

## Differentiation

Existing tools like CaseMine, Manupatra, and SCC Online focus primarily on case law search or post-hoc document review. Veritas embeds evidence retrieval directly into the drafting canvas:
- In-place tri-directional linking: select a sentence to inspect the highlighted source passage and record a decision.
- Distinct checks for case existence, quotation accuracy, and proposition support.
- Immutable audit trail documenting every review decision and source limitation.
- Built on open-source AWS tooling (Strands Agents SDK) for transparent, hackathon-friendly architecture.
