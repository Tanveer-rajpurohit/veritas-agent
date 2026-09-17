# Security, privacy, and control plan

Legal matter records are sensitive. The hackathon prototype should state its limits and still enforce the boundaries it claims.

## Threat model

Protect against cross-matter access, insecure object URLs, malicious file content, prompt injection inside documents, unsafe HTML/links, model overreach, stale approval, leaked secrets/logs, dependency attacks, oversized upload denial of service, and unintended export of sources.

## Required controls

- Authenticate every API and authorize the target matter/object/task/event.
- Generate opaque object keys; short-lived download/upload URLs only after authorization.
- Validate extension, MIME signature, size, page count, and archive expansion; reject executables and password-protected PDFs for MVP.
- Store provider keys server-side and use least-privilege credentials.
- Treat extracted content as untrusted quoted data. No source text may alter tool policy or approval state.
- Allowlist tools per specialist; validate every tool argument and returned identifier.
- Apply request, task, token, and file limits. Time out external adapters with explicit incomplete status.
- Redact sensitive text from logs; store content only where the product requires it.
- Sanitize editor links and render only known nodes. Disable remote requests in PDF rendering.
- Hash source/document versions and exports. Preserve append-only audit events at the application level.
- Clear approval and stale related findings on any relevant content/source change.
- Exclude uploads, extracted text, and prompts from analytics by default.

## Cedar policy example

```cedar
permit (
  principal,
  action in [Action::"ReadMatter", Action::"EditDraft"],
  resource
) when { principal in resource.editors };

forbid (
  principal is Agent,
  action in [Action::"ApproveVersion", Action::"CreateReviewedExport"],
  resource
);
```

A matching permit is still needed; forbids override permits. Use tests proving an agent principal and a viewer cannot approve. Cedar is a policy engine, not authentication, document validation, or a complete security system. [Cedar reference](https://docs.cedarpolicy.com/)

## Privacy behavior

Use synthetic/redacted demo files. For a real deployment, define region, subprocessors, model data handling/retention, encryption, access monitoring, deletion, backups, incident response, DPDP/contract analysis, legal professional privilege handling, and data-processing agreements with qualified counsel. Do not claim privilege preservation or regulatory compliance from architecture alone.

## Audit log language

The log records application events and checks. “Immutable” is not justified by an append-only table alone because administrators can change the database. Call it append-only/auditable for the prototype. Stronger tamper evidence requires signed event chains or external retention controls, key management, and verification procedures.

## Security release gate

No public deployment until authorization integration tests, secret scanning, dependency audit, basic upload abuse tests, and deletion flow pass. The recorded demo can run locally if these gates are incomplete, consistent with Build It.
