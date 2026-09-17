# Editor, annotations, and export

## Canonical representation

Store one Tiptap JSON document per immutable version. Generate HTML, plain text, Markdown preview, and PDF from that JSON. Do not persist HTML as a second editable truth. Tiptap documents that JSON and HTML can be saved; its static renderer can render JSON without an editor instance. [Persistence](https://tiptap.dev/docs/editor/core-concepts/persistence) · [Static renderer](https://tiptap.dev/docs/editor/api/utilities/static-renderer)

## Schema

Allow a small, versioned set: doc, paragraph, heading, text, hardBreak, bulletList, orderedList, listItem, blockquote, table, tableRow, tableCell, citationRef, factRef, placeholder, and pageBreak. Marks: bold, italic, underline, link, annotation.

Use inline reference nodes/marks containing stable IDs only:

```json
{
  "type": "citationRef",
  "attrs": {
    "citationRefId": "uuid",
    "display": "Pooja Ramesh Singh v. J&K Bank Ltd., 2026 INSC 668"
  }
}
```

Verification status is loaded from findings for the active version; it is not trusted from mutable editor attributes. This prevents stale green badges from surviving edits or copied HTML.

## Stable blocks and claims

Assign each block a UUID at creation. Claims use block ID plus range and a content hash. ProseMirror positions move during edits, so annotations must be remapped when possible and re-extracted after save. Never rely on raw position alone across versions.

## Agent edits

Agents return an allowlisted operation set: insertBlock, replaceText, addCitationRef, addFactRef, setHeading, insertTable. Server applies operations against a base version and rejects unknown nodes, invalid references, unsafe links, and excessive document size. This is easier to audit than arbitrary generated JSON.

## JSON export

Export package schema:

```json
{
  "format": "veritas-document",
  "format_version": 1,
  "document": {"id":"uuid","version":3,"sha256":"...","content":{}},
  "sources": [{"id":"uuid","name":"...","version":1,"sha256":"..."}],
  "findings": [{"dimension":"quotation","status":"supported","evidence":[]}],
  "review": {"state":"review_needed","approved_by":null},
  "generated_at": "ISO-8601"
}
```

The export includes source manifests and quoted evidence needed to interpret findings, not confidential original files by default.

## PDF profiles

### Draft PDF

Rendered any time by an authorized editor. Header/footer: “WORKING DRAFT — REQUIRES PROFESSIONAL REVIEW,” document version, timestamp. Appendix lists unresolved/stale findings and source limitations.

### Reviewed PDF

Available only after the gate. Header/footer identifies “Reviewed in Veritas workflow,” version, reviewer, timestamp, and export checksum. It must not state “court-ready,” “certified,” or “legally valid.”

### Review report

Optional companion PDF with sources manifest, checks performed, findings/resolutions, tool/model versions, and limitations. The Supreme Court published draft AI-in-courts regulations in June 2026 emphasizing areas including transparency, auditability, oversight, and data protection. They are a design reference; this report is not represented as statutory compliance or a court-admissible certificate. [Official draft](https://cdnbbsr.s3waas.gov.in/s3ec0490f1f4972d133619a60c30f3559e/uploads/2026/06/2026060342.pdf)

## Rendering safety

Sanitize links and user HTML; render only known extensions. Block remote asset fetching during PDF generation. Use embedded fonts with appropriate licensing. Test long case names, tables crossing pages, orphan headings, page breaks, Unicode rupee symbol, missing source labels, and annotation stripping. Keep UI badges out of legal text; render footnotes/endnotes and review appendix instead.
