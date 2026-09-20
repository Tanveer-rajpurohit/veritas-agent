# Veritas

## The problem

Legal drafting is slow because the work does not end when the first paragraph is written. A lawyer must find the right record, check each amount and date, confirm that every authority exists, test whether it supports the proposition, and repeat those checks after every edit.

General-purpose AI can produce fluent legal text, but fluent text can hide serious defects. A case may be invented. A real judgment may be quoted incorrectly. A correct quotation may not support the sentence beside it. Client records may disagree about the same date or amount. The lawyer still has to find every problem manually.

This is already a real courtroom problem. On 2 July 2026, the Supreme Court of India set aside NCLT and NCLAT decisions after finding that they relied on non-existent authorities, mismatched citations, and passages that were not present in genuine judgments. The Court's published summary records that even authentic cases had been assigned invented paragraphs. The issue was not that AI had been used; it was that generated material reached a legal decision without reliable verification.

Sources: [Supreme Court of India judgment summary](https://www.sci.gov.in/landmark-judgment-summaries/) and [the reported case background](https://indianexpress.com/article/legal-news/ai-hallucinated-judgments-explained-supreme-court-nclt-order-fake-precedents-10771396/).

## The product

Veritas is an evidence-linked drafting workspace for Indian legal teams. The lawyer creates a Matter, uploads client records, and asks one Main Agent for a draft or review. The application routes the work to bounded specialists:

- Writer creates an editable working draft from authorized Matter evidence and retrieved legal text.
- Fact Reviewer compares dates, amounts, parties, and events with client records and approved public registries.
- Citation Reviewer checks authority identity, quotation accuracy, proposition support, and later treatment as separate questions.

Every finding remains attached to an immutable document version. A later edit makes the old check stale. The lawyer can inspect the source passage, accept or reject proposed changes, and export a draft with its unresolved issues visible.

## The workflow we automate

1. Open a Matter and upload PDF, TXT, or Markdown records.
2. Extract page-aware text, split it into searchable passages, and store the original file in S3-compatible object storage.
3. Ask Veritas to draft. The Writer retrieves Matter passages, statutory text, judgments, and a suitable document template.
4. Run fact and citation review on the saved version.
5. Show supported, contradicted, unresolved, and stale items with their evidence.
6. Let the lawyer decide whether to accept a proposed edit.
7. Export the working draft and its audit data.

## Product boundary

Veritas assists legal work. It does not certify a filing, replace counsel, or turn a search result into proof. Missing or unavailable evidence is reported as unresolved. The application owns authorization, version creation, finding state, and exports. The model cannot grant itself access or silently change a document.
