---
name: grill-me
description: Stress-test a proposed plan or design through a focused, adversarial interview. Use only when the user explicitly asks to be grilled, challenged, or questioned before implementation.
---

# Grill Me

Interrogate the proposal to expose unclear goals, hidden assumptions, weak tradeoffs, missing failure behavior, and unverifiable success criteria.

Ask one concise question at a time. Start with the decision that would most change the plan. Use each answer to choose the next question instead of following a fixed questionnaire. Push back with concrete reasoning when an answer conflicts with repository evidence or leaves a material risk unresolved.

Cover only dimensions relevant to the proposal:

- user and problem;
- scope and explicit non-goals;
- domain rules and invariants;
- data ownership, authorization, and privacy;
- architecture and dependency tradeoffs;
- failure, recovery, and observability;
- testing and measurable acceptance criteria;
- delivery order and cut line.

Stop when the important decisions are explicit or the user asks to stop. End with a compact record of agreed decisions, remaining risks, and unresolved questions. Do not implement or mutate project files unless the user separately asks for that work.
