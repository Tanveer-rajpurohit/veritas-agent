# Veritas — the product idea

## Recommendation

Build a matter-based drafting and review workspace for Indian lawyers. Its distinctive interaction is **sentence → evidence → decision**: a lawyer selects a sentence, sees the uploaded record or legal passage behind it, resolves a discrepancy, and retains a versioned record of the decision.

The user-facing promise is: **“Draft with the evidence beside you.”** Avoid “every fact verified,” “hallucination-free,” “valid law guaranteed,” or “court-ready.” Those promises exceed the proposed system's capabilities.

## The problem we can actually address

Drafting involves moving among client records, legal authorities, notes, and a document editor. AI can accelerate composition while creating additional review work: invented references, genuine cases used for the wrong proposition, conflicting numbers, and unsupported factual statements. A polished paragraph can conceal all four.

There is primary-source support for this concern. The Supreme Court's published summary of *Pooja Ramesh Singh v. Jammu and Kashmir Bank Ltd.*, 2026 INSC 668, identifies AI-generated nonexistent citations and nonexistent paragraphs attributed to cases as issues before the Court. Use that precise description rather than claiming every problematic citation was an entirely nonexistent case. [Supreme Court summary](https://www.sci.gov.in/landmark-judgment-summaries/)

A Stanford-led evaluation also found errors in commercial legal research tools. It is evidence that retrieval does not eliminate hallucination, not a measured error rate for Indian law or this product. [Research publication](https://law.stanford.edu/publications/hallucination-free-assessing-the-reliability-of-leading-ai-legal-research-tools/)

## First user and first job

Primary user: a junior associate or solo Indian practitioner assembling a first draft from an existing matter file. The lawyer remains responsible for legal interpretation and use of the result.

First job: prepare an **IBC Section 7 working brief and selected draft sections** from English records. This preserves the domain chosen in your original docs while avoiding the false claim that a weekend prototype completes every current filing requirement. Output includes a factual chronology, record discrepancies, authorities with passages, draft factual background, issues requiring instructions, and an editable draft argument section.

A full prescribed application, all annexures, affidavits, limitation analysis, filing mechanics, and current forum requirements are later work requiring legal validation. Do not silently substitute a generic petition for a prescribed form. The current law and forms must be verified with official materials. [India Code IBC record](https://www.indiacode.nic.in/indiacode/handle/123456789/2154?view_type=browse)

## The five-minute user experience

1. Open a matter and attach a loan agreement and ledger.
2. Ask the main agent to prepare a working brief. It asks for material missing instructions and shows the sources it will use.
3. Receive an editable document card, not only a long chat answer.
4. Click a disputed amount: compare both record excerpts, then choose which value to use with a reason.
5. Click a citation: inspect the actual passage and the separate identity, quotation, support, and currency statuses.
6. Save a version and export a draft PDF or JSON package. Request a reviewed export only after the version-specific checks and human review are complete.

Users may also directly select Writer, Citation Reviewer, or Fact Reviewer. The same backend restrictions apply whichever route they choose.

## Differentiation hypothesis

The opportunity is a clear and auditable review experience, not a claim to have invented legal RAG or multi-agent systems. CaseMine already advertises drafting, document analysis, and legal research integrations. Do not describe competitors as research-only or assert that no competitor validates citations. [CaseMine product FAQ](https://www.casemine.com/home/faq)

Our hypothesis: source-linked review, visible contradictions, and automatic invalidation after edits will make review easier to understand and complete. Test it with lawyers before claiming time savings or willingness to pay.

## Validate before expanding

Ask two or three practising lawyers to describe their most recent first-draft workflow. Show an existing redacted sample, ask which errors take longest to catch, and ask whether page-level evidence would help. Do not lead with agent names. Observe whether they can find a source, resolve a conflict, and understand “not checked for subsequent treatment.” Record observations and change the product accordingly.

Success for the hackathon is one truthful, reliable end-to-end workflow with a distinctive interface. Winning remains uncertain; this plan optimizes demonstrable quality rather than promising a prize.
