# Veritas agent runtime

Veritas presents one Main Agent in the product. Writer, Citation Reviewer, and Fact Reviewer are
bounded specialist roles invoked by the application. Users do not need to select an agent.

## Runtime flow

1. The authenticated client creates a message inside a Matter thread.
2. It creates an idempotent agent run containing the current document and document-version IDs.
3. Explicit UI actions use deterministic routing. Ambiguous chat may be classified by the Main
   Agent, but application code validates the resulting action and identifiers.
4. The worker claims the run once, persists safe progress events, invokes the specialist, validates
   its typed result, and persists findings or an immutable document version.
5. The UI replays events using `Last-Event-ID` and renders the final typed result.

Progress events describe observable work, such as `citation_review started`, the source being
searched, or the number of findings created. They never contain hidden reasoning, private scratch
work, credentials, or full Matter documents.

## Main Agent

The Main Agent understands the request, asks for missing identifiers, and sequences bounded work.
It may request Writer, Citation Reviewer, or Fact Reviewer runs. It cannot approve a document,
resolve a finding, create a reviewed export, or invent source IDs.

## Writer

Tools: Matter-scoped source search, evidence-span creation, legal-template lookup, statute and case
discovery, draft creation, and validated document operations. Writer returns typed operations. The
application checks evidence ownership and the base version before creating a new version.

## Citation Reviewer

The Citation Reviewer produces separate findings for:

- `identity`: title, court, date/year, case number, and citation match a stored authority;
- `quotation`: quoted words occur in the stored source text;
- `support`: the passage supports the draft proposition;
- `treatment`: later judicial treatment was checked from a suitable source.

It searches the curated local corpus first. IndiaCode by eCourtsIndia is the keyless discovery and
statutory-text adapter. Indian Kanoon is an optional authenticated fallback for judgment discovery
and full text. An official court PDF or India Code origin is preferred for final confirmation.
Generic web search is discovery only. InIRAC is evaluation data only and is never authoritative.

A URL is stored as provenance, not proof. Provider URLs must use HTTPS and an allowlisted host.
Identity requires corroborating metadata; quotation requires stored text; support and treatment
remain `needs_review` when coverage is insufficient. A search miss is `unresolved`, never “fake.”

## Fact Reviewer

The Fact Reviewer compares draft propositions only with authorized client records in the same
Matter. It can normalize amounts, dates, and identifiers, but records remain evidence of what they
say rather than established truth. Conflicting passages remain visible together. Legal databases do
not determine whether a client's ledger or agreement is factually correct.

## Data and security guarantees

- Matter membership is checked before the run, document, event stream, source, or finding is read.
- Every finding is tied to an exact document version, claim hash, method, timestamp, limitations,
  and immutable evidence span.
- Retrieved documents are untrusted data. Instructions embedded in them are ignored.
- Models can propose typed outputs; Python owns authorization, persistence, versioning, staleness,
  resolutions, and export gates.
- Provider failure produces `unavailable` or `unresolved` with a safe message.
- The UI shows workflow activity and source results, not chain-of-thought.

## Current source coverage

| Source | Purpose | Authority |
|---|---|---|
| Matter uploads | Client-fact comparison | Matter evidence only |
| Curated official judgment corpus | Fast citation identity and quote checks | Primary when provenance is complete |
| IndiaCode by eCourtsIndia | Statute/judgment discovery | Discovery; preserve official origin |
| Indian Kanoon API | Case discovery and text fallback | Secondary; attribution required |
| Official court/tribunal PDF | Final judgment confirmation | Preferred primary source |
| InIRAC | Offline evaluation | Never authority |

The application must say what was searched, what was found, which dimensions were not checked, and
what additional source or human decision is required. It must not collapse those states into a
single truth score.
