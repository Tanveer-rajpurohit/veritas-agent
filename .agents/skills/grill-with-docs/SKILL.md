---
name: grill-with-docs
description: Stress-test a plan or system design through a focused interview, then capture the resulting decisions as project documentation. Use only when the user explicitly asks to be grilled and wants ADRs, a glossary, or decision records produced.
---

# Grill With Docs

Run the focused interview described by the `grill-me` skill. Ask one high-impact question at a time and use repository evidence to challenge unclear or conflicting answers.

As decisions become stable, maintain concise documentation in locations consistent with the repository. Prefer updating an existing decision log, architecture document, or glossary over creating a parallel system.

For an architecture decision record, capture:

- title and status;
- context and forces;
- decision;
- considered alternatives;
- consequences and follow-up triggers.

For the glossary, define domain terms in product language, note important distinctions, and link each term to its owning contract or document where useful. Do not invent agreement: mark unanswered questions and provisional decisions explicitly.

Before writing files, show the proposed documentation changes if their location or scope is ambiguous. Finish with the decisions recorded, files changed, remaining risks, and open questions.
