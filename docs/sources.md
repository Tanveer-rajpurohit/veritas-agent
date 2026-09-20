# Data sources

Veritas separates discovery from evidence. Search results help the agents find a candidate. The text must be fetched, stored with provenance, and linked to the active Matter or global legal corpus before it can support a draft or finding.

## Runtime sources

| Source | Used for | Used by | Limit |
| --- | --- | --- | --- |
| Uploaded Matter records | Contracts, notices, statements, orders, and other client evidence | Writer, Fact Reviewer | A record proves what the record says. Conflicting records remain visible. |
| [India Code by eCourtsIndia](https://indiacode.ecourtsindia.com/api/v1/openapi.json) | Statute discovery and exact provision text | Writer, Citation Reviewer, Fact Reviewer | Secondary API. Retrieved text keeps its provider URL and provenance. |
| [Indian Kanoon API](https://api.indiankanoon.org/documentation/) | Judgment search and full text | Writer, Citation Reviewer | Discovery text should be checked against an official order before filing. |
| [MCA Company Master Data](https://data.gov.in/catalog/company-master-data) | Company identity, status, office, registration, and capital fields for an exact CIN | Fact Reviewer | It cannot prove debt, default, notice delivery, or insolvency. Dataset updates may lag. |
| Curated drafting templates | Sections, required facts, and drafting questions | Writer | Templates shape a draft. They are not authority. |
| PostgreSQL and pgvector | Versions, chunks, evidence spans, drafts, claims, findings, and agent runs | Application services | All private retrieval is Matter-scoped and authorized before model execution. |
| S3 or MinIO | Original uploads and generated exports | Application services | Models never receive object-store credentials or direct object access. |

## Model providers

The runtime uses Amazon Bedrock when `BEDROCK_AGENT_ENABLED=true`. Otherwise it uses Groq through its OpenAI-compatible endpoint. A model supplies language and structured output. It is never treated as a legal source.

## Evidence record

Stored external text includes a canonical title, provider, source URL, retrieval time, content hash, source version, page or passage location, and known limitations. Matter uploads also carry the Matter identifier used for authorization.

## Source rules

- Do not cite a model's memory.
- Do not treat a search candidate as verified evidence.
- Do not hide provider failure by returning fixture text in production.
- Do not resolve disagreement between client records automatically.
- Report unavailable registries and unsupported propositions as unresolved.
- Keep identity, quotation, support, and later treatment as separate citation dimensions.

