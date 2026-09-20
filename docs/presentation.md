# Submission presentation

## One-sentence pitch

Veritas turns client records into an editable legal draft, then checks its facts and citations against the evidence before the lawyer exports it.

## Three-minute demo

### 0:00 to 0:25: show the risk

Open a polished draft containing a wrong amount and an unreliable citation. Explain that legal AI can sound correct while leaving the lawyer with the same manual verification burden.

### 0:25 to 0:55: create the Matter

Sign in, open a Matter, and upload two records. Point out that files are stored in S3-compatible object storage while extracted passages and provenance are stored in PostgreSQL.

### 0:55 to 1:35: draft and verify

Choose Draft + verify and enter one request. Show the safe activity stream as Veritas drafts from Matter sources, checks factual claims, and reviews citations. Avoid describing these summaries as chain-of-thought.

### 1:35 to 2:15: inspect the evidence

Open the draft. Select the disputed amount and show both source passages. Then inspect a citation across identity, quotation, support, and later treatment. Explain why a real case can still be the wrong authority.

### 2:15 to 2:40: keep the lawyer in control

Preview a proposed correction. Reject or accept it, then show the new immutable version. Edit a checked sentence and show that the old finding becomes stale.

### 2:40 to 3:00: export and close

Export the working PDF and show the unresolved-items appendix or audit JSON. Close with: "Veritas gives the lawyer a draft and the evidence needed to judge it."

## What judges should remember

- One prompt can produce a draft and run two independent review passes.
- Each claim can be traced to a source passage and document version.
- Search, evidence, model output, and lawyer decisions remain separate.
- AWS Strands coordinates bounded agents while application code enforces permissions and state changes.
- The product reduces repetitive verification without pretending to replace legal judgment.

## Submission checklist

- Start from a clean account and use a prepared demo Matter.
- Test Groq and Bedrock configuration before recording.
- Keep a local MinIO demo path if cloud storage is unavailable.
- Use real provider responses or label provider downtime clearly.
- Do not expose API keys, access tokens, client names, or private documents in the video.
- Record a backup before final UI polish.

