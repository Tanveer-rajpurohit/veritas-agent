# MVP scope

## Demo scenario

The first complete workflow is an Indian insolvency Matter. The lawyer uploads two records that disagree about a default amount, asks Veritas for a working draft, reviews the conflict, checks the cited authorities, accepts a proposed correction, and exports the updated version.

## Included

- Email and password authentication with protected Matter data.
- Matter creation, role checks, and tenant-isolated source access.
- PDF, TXT, and Markdown upload to S3 or local MinIO.
- Page-aware extraction, chunking, embeddings, and PostgreSQL with pgvector.
- One visible Main Agent with Draft + verify, Fact check, Citation check, and general conversation modes.
- Writer, Fact Reviewer, and Citation Reviewer specialist execution.
- Immutable drafts and versions with optimistic concurrency.
- Persisted claims, findings, evidence spans, agent runs, and replayable activity events.
- Human accept or reject for Writer proposals.
- Draft PDF and JSON export through authenticated download endpoints.

## Demo acceptance path

1. Register, sign in, and create a Matter.
2. Upload two records and confirm that both appear in the Matter.
3. Select Draft + verify and request a working brief.
4. Watch safe activity updates for drafting, fact review, and citation review.
5. Open the generated draft.
6. Inspect at least one supported fact, one conflicting fact, one valid authority, and one unresolved citation.
7. Edit the draft and show that findings for the old content are stale.
8. Accept a proposed change and confirm a new immutable version.
9. Export the working draft.

## Deferred

- Court-ready or certified export.
- Automated later-treatment citator with a commercial authority database.
- Broad web crawling.
- Hindi drafting and translation.
- Real-time multi-user editing.
- Autonomous filing or submission to a court portal.

