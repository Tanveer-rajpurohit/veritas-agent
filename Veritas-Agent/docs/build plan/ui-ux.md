# UI and UX specification

## Design goal

The product should feel like a calm professional workbench. Best UI is judged on design and usability, so the interface must make the product's difficult idea visible within seconds: every important sentence can be traced to evidence and reviewed.

## Desktop shell

```text
┌ Matters ────────┬ Conversation / tasks ───────────┬ Draft canvas ────────────────┐
│ Search          │ Main Agent                      │ Matter title       Save ✓    │
│ Recent matters  │ “I found two amounts…”          │ Trust strip                 │
│ Files           │ [Open discrepancy]              │                               │
│ Drafts          │                                 │ Editable legal document      │
│ Reviews         │ Attach + prompt                  │ highlighted claim¹           │
│                 │ Agent: Main ▾                    │                               │
│                 │                                 │                               │
└─────────────────┴─────────────────────────────────┴───────────────────────────────┘
                                                      select claim → evidence drawer
```

Use a 232 px matter rail, a 380 px conversation panel, and the remaining width for the document. Below 1100 px, collapse the matter rail. Mobile may view and comment; serious editing is desktop-first.

## Information architecture

- **Matter** is the top-level workspace: people, files, chats, drafts, findings, and exports.
- **Conversation** is one thread within a matter. A user may start separate chats for drafting, citation review, or facts without losing matter context.
- **Document** is a named artifact with versions. Agent-created artifacts appear as rich cards in chat and open in the canvas.
- **Review queue** lists findings across the current document version.
- **Files** shows extraction status, page count, language, checksum, and source labels.

## Main screens

### 1. Matter home

Shows matter name, short user-entered description, latest draft, unresolved findings, recent files, and actions: Continue draft, Review citations, Check facts. It must never show a fake “trust score.” Use counts by state because severity cannot be meaningfully averaged.

### 2. Workspace

The main three-pane screen. Chat streams status events and explanations. The canvas updates only after structured operations are validated. The editor autosaves locally immediately and to the server after a short debounce; it always exposes Saving, Saved, Offline, or Conflict.

### 3. Evidence drawer

Opens from a claim or citation and keeps the document in place. It contains:

- finding label and plain-language reason;
- exact claim from the draft;
- exact evidence passage with page and source;
- source preview centered on the passage;
- check dimensions and limitations;
- actions: Use suggestion, Keep with reason, Edit sentence, Remove, Open source.

For a citation show four independent rows: Identity, Exact quotation, Proposition support, Later treatment. Green is reserved for a completed check, amber for review or incomplete coverage, red for contradiction/mismatch, and gray for not run/unavailable. Pair color with icon and text.

### 4. Review queue

Filters: blocking, needs review, unresolved, stale, resolved. Selecting an item opens the corresponding sentence and evidence. Include progress as “8 of 12 reviewed,” not a percentage of truth.

### 5. Export dialog

Offer Draft PDF, Reviewed PDF, and JSON package. Explain eligibility before the button. Draft export embeds a DRAFT label and unresolved-findings appendix. Reviewed export runs the server gate and shows actionable failures.

## Critical interactions

### Agent response artifact

A generated draft appears as a card with title, type, version, source count, pending findings, and Open in editor. Files remain available from chat history and the matter's Drafts section.

### In-place verification

Do not decorate every line. Use a subtle left gutter marker and underline only when hovered or selected. Selecting a marker synchronizes the drawer, review item, and source passage. This tri-directional link is the hero interaction.

### Edit invalidation

When a reviewed sentence changes, its badge becomes Stale immediately and the trust strip explains “1 check needs rerun after edit.” This is valuable evidence of integrity, not an error to hide.

### Agent selector

Default Main. Options: Writer, Citation Reviewer, Fact Reviewer. Each option includes one sentence describing its job. Direct selection limits available tools but works over the same matter state.

## Design system

- Warm off-white canvas, near-black navy text, indigo primary action.
- Status tokens: emerald verified, amber review, crimson conflict, slate unavailable.
- Serif only in legal document body; sans-serif for product chrome.
- 4/8 px spacing system, 8 px control radius, 12 px cards, restrained shadows.
- Motion: 150–220 ms transitions; stream steps fade in; honor reduced motion.
- Minimum WCAG AA contrast, full keyboard navigation, visible focus, 44 px targets, screen-reader labels for status icons.
- Use familiar legal symbols sparingly. Avoid emoji shields and decorative courtroom imagery.

## Empty, loading, and error states

- Empty matter: “Add records or describe the matter” with two clear actions.
- Extraction: per-file progress with pages processed; allow cancellation/retry.
- No source found: “Unresolved — searched these sources at this time,” never “fake.”
- Source unavailable: preserve the queued check and let the user retry.
- Offline edit: keep local draft and show recovery path.
- Version conflict: never overwrite silently; show both versions and create a copy/merge choice.

## Best UI judging checklist

A first-time judge should understand the product in 15 seconds, complete the evidence review without instruction, see a real status change after resolving a conflict, and understand why export is blocked. The recording should use readable zoom and a realistic redacted fixture. The official category rewards a product that is pleasant to use, and the video is the judged artifact. [Event overview](https://www.wemakedevs.org/aws/first-commit)
