# Four-day MVP plan

## Winning slice

One English IBC matter, two uploaded records with a deliberate amount conflict, one editable working brief, one genuine citation, one invented citation, one quote mismatch, linked evidence review, stale-on-edit behavior, and draft PDF/JSON export. This is enough to demonstrate the product and UI clearly.

## Cut line

P0: matter, upload/extraction, persistent chat, main/writer/citation/fact roles, Tiptap artifact, evidence drawer, review queue, versioning/invalidation, draft PDF/JSON, auth isolation, three-minute recording.

P1 after P0 is stable: reviewed-export gate, Cedar integration, OpenSearch, audit report, optional official live lookup, better animations.

Cut first: translation, six agents, argument critic, broad corpus ingestion, full Form 1, collaboration, RAG graph, pgvector, Step Functions, multiple databases, mobile editing.

## Preconditions before kickoff

Planning, learning, tool installation practice, API/account access requests, and student verification. Do not create the project repository or implementation before the clock. Event rules allow learning/planning/practice but require new project work after opening. Every member must register; team size is 1–4. [Rules](https://www.wemakedevs.org/aws/first-commit/rules)

Confirm exact hours because the retrieved schedule still said they were being finalized. [Schedule](https://www.wemakedevs.org/aws/first-commit/schedule)

## Day 1 — vertical slice

- Create repo and commit baseline after kickoff.
- Shared contracts, local services, matter/file/document schema.
- Three-pane shell and Tiptap editor.
- Upload one fixture, extract page text, open preview.
- Generate or load a structured sample artifact.
- End gate: click one claim and see its exact evidence passage.

## Day 2 — review mechanism

- Implement citation dimensions with curated sources.
- Implement fact proposition/conflict checks.
- Findings, review queue, evidence drawer, resolution.
- Version save and stale invalidation.
- End gate: real/invented/quote/conflict fixtures all behave correctly.

## Day 3 — complete and judgeable

- Main agent routing and specialist direct selection.
- Draft/JSON export and server review-gate skeleton.
- Authorization tests; Cedar if stable.
- Responsive/polished empty/loading/error states.
- Run one lawyer/user observation if possible.
- End gate: hero flow passes from a clean environment; record first backup.

## Day 4 — reliability and submission

- Freeze features early; fix only submission-critical issues.
- Run fixtures and isolation/gate tests.
- Prepare README with setup, architecture, AWS usage, licences, AI tools used, limitations.
- Record and edit a ≤3-minute video; verify audio, text readability, and AWS use shown.
- Publish repository and short write-up; submit early, then improve before cutoff.
- Rules require public repo, ≤3-minute video, and short write-up, and judges assess only submitted material. [Rules](https://www.wemakedevs.org/aws/first-commit/rules)

## Team allocation

| Role | Primary ownership | Backup |
|---|---|---|
| Product/frontend | workspace, editor, evidence drawer, review UX | video |
| Backend/data | schema, uploads, versions, export | auth |
| Agents/retrieval | Strands, sources, checks, fixtures | evaluation |
| Integration/demo | contracts, tests, setup, submission | frontend polish |

For fewer people, combine product+integration and backend+agents. Do not divide by “one person per agent”; the integration seams determine success.

## Stop rules

If live legal lookup is unstable, use curated primary-source records and show the adapter as future work. If agent drafting is unreliable, generate only a bounded working-brief section. If Cedar blocks progress, keep mandatory application authorization and integrate one demonstrable policy afterward. If cloud deployment threatens recording, submit Build It locally.
