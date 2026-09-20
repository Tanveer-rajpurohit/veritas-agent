# Presentation notes

## Start with the problem

- Legal AI can write a polished paragraph that is still unsafe to file.
- On 2 July 2026, the Supreme Court of India set aside NCLT and NCLAT decisions that relied on non-existent authorities, mismatched citations, and invented passages attributed to real judgments.
- A lawyer cannot solve this by checking whether a citation merely looks real. The case, quotation, legal proposition, and current treatment all need separate checks.
- Client facts create a second risk. Dates, amounts, parties, and events can conflict across notices, agreements, statements, and annexures.
- Existing AI often gives the lawyer a faster first draft but leaves the entire verification burden behind.

## Introduce Veritas

Veritas is an evidence-linked legal drafting workspace for Indian lawyers. One request can create a working draft, check its factual claims, review its citations, and show the lawyer exactly what remains unresolved.

## Show the workflow

- Create a Matter and upload client records.
- Ask the Main Agent to draft and verify.
- The Writer uses only authorized Matter passages and retrieved legal sources.
- The Fact Reviewer compares dates, amounts, parties, and events with Matter evidence and public registries.
- The Citation Reviewer checks authority identity, quotation accuracy, proposition support, and later treatment.
- Open a finding beside the exact supporting or conflicting passage.
- Accept or reject a proposed correction. An accepted change creates a new immutable document version.
- Export the working draft and its audit data.

## Explain what makes it different

- Retrieval results are candidates, not proof.
- Every accepted source keeps its provider URL, content hash, document version, page, and passage.
- Agents can propose edits; application code enforces access control and creates versions.
- Editing verified text makes the previous finding stale, so an old approval cannot silently survive a change.
- Unavailable or conflicting evidence is reported as unresolved. The system does not fill gaps from model memory.
- Matter boundaries are enforced server-side. A model never chooses which tenant or Matter it may access.

## Close

Veritas does not replace legal judgment. It removes the repetitive work between a first draft and a reviewable draft, while keeping the evidence and the final decision with the lawyer.

Sources for the opening example: [Supreme Court of India judgment summary](https://www.sci.gov.in/landmark-judgment-summaries/) and [Indian Express case explainer](https://indianexpress.com/article/legal-news/ai-hallucinated-judgments-explained-supreme-court-nclt-order-fake-precedents-10771396/).
