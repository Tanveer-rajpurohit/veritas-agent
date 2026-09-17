# Veritas — research and build specification

Version 1.0 · researched 16 September 2026 · planning deliverable, not an implemented product.

Veritas is the canonical product name. CiteGuard is retained only as the historical name in the supplied drafts. This pack supersedes those drafts. It deliberately distinguishes verified external facts, engineering recommendations, and decisions still requiring confirmation.

## Read in this order

| File | What it answers | Main reader |
|---|---|---|
| [idea.md](idea.md) | What problem are we solving, for whom, and why this scope? | Everyone |
| [veritas-master-doc.md](veritas-master-doc.md) | What are the binding product and architecture decisions? | Everyone |
| [research-audit.md](research-audit.md) | What was wrong, unsupported, or inconsistent in the old docs? | Leads |
| [mvp.md](mvp.md) | What must be built during the event, and what gets cut? | Team lead |
| [ui-ux.md](ui-ux.md) | What should the lawyer see and how should it behave? | Design/frontend |
| [flow.md](flow.md) | How do uploads, chat, drafting, review, and export connect? | Everyone |
| [functionality.md](functionality.md) | What counts as a working feature? | Product/QA |
| [agents.md](agents.md) | Which agent does what, with which permissions? | Agent/backend |
| [sources.md](sources.md) | Which data source serves which agent, under what limitations? | Research/backend |
| [tech.md](tech.md) | Which stack and runtime boundaries should be used? | Engineering |
| [database.md](database.md) | What is persisted and how are versions and ownership enforced? | Backend |
| [api-contracts.md](api-contracts.md) | What do frontend, backend, and workers exchange? | Engineering |
| [editor-and-export.md](editor-and-export.md) | How do Tiptap documents, annotations, and PDF/JSON work? | Editor/backend |
| [evaluation.md](evaluation.md) | How do we prove it works and fails honestly? | QA/agents |
| [security.md](security.md) | How do we protect matters and enforce review? | Backend |
| [demo-and-submission.md](demo-and-submission.md) | How do we show the product within three minutes? | Presenter |
| [main.md](main.md) | What should an AI coding assistant read and obey? | AI/team |

## Decision precedence

Master document defines scope and invariants. Database/API/editor docs own their detailed contracts. Source facts belong in sources.md; corrections belong in research-audit.md. If these conflict, record and resolve the conflict before implementation. Do not silently combine the old six-agent, four-agent, and three-specialist variants.

## Status and limits

Research checked public documentation and visible dataset samples. No application, authenticated API integration, bulk dataset audit, legal opinion, performance benchmark, or lawyer usability study was completed. Targets in this pack are proposed acceptance gates, not measured results. Source links are embedded at the relevant claims. Access, prices, and legal currency must be rechecked when building.

The exact kickoff and submission hours were not published on the retrieved event schedule. Confirm them on the official page. Planning is allowed before kickoff; implementation starts during the event. See [event rules](https://www.wemakedevs.org/aws/first-commit/rules).
