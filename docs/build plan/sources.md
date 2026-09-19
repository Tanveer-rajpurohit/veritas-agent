# Data and source catalog

## Runtime status: 19 September 2026

See [current-agent-runtime.md](../current-agent-runtime.md) for the exact agent-to-tool mapping.
PostgreSQL Matter evidence, the curated template registry, MCA Company Master Data through
data.gov.in, live eCourtsIndia statute lookup and discovery, and authenticated Indian Kanoon case
search/full text are connected. The IBBI registry tool currently reports `unavailable`; official
court PDF retrieval, InIRAC, OpenNyAI, InLegalBERT, and generic web search are not runtime data
sources.

## Source hierarchy

“Authoritative” is task-specific. Official enacted text and court orders are preferred for quotation and final review. Search indexes and model-derived datasets are discovery tools. A source's presence proves only that it contains text; it does not prove the proposition made from it.

| Source | Used by | MVP role | Main limitations / obligations | Decision |
|---|---|---|---|---|
| User-uploaded client records | Writer, Fact Reviewer | Facts and evidence | Supplied evidence may conflict; OCR may be wrong; confidential | Core |
| Government India Code / IBBI | Writer, Citation Reviewer | Official statutes/rules/forms | Current version and amendments still need checking | Core curated links |
| Supreme Court official site/API | Citation Reviewer | Official judgment identity/text | Coverage/search ergonomics vary | Core for selected cases |
| IndiaCode by eCourtsIndia | Writer, Citation Reviewer | Keyless structured discovery of statutes/judgments | Private service; OCR/inferred fields explicitly carry limits; quote underlying official order | Core adapter |
| Curated local case fixtures | Writer, Citation Reviewer | Reliable demo retrieval | Small scope; manual provenance required | Core |
| Indian Kanoon API | Citation Reviewer | Optional discovery/full text | Prepaid, authentication, attribution, availability and “as is” terms | Optional |
| InIRAC | Offline research/evaluation | Candidate cases and IRAC research | 511 rows; extraction errors; limited coverage; relations not gold verified | Optional, never authoritative alone |
| OpenNyAI | Extraction experiment | Candidate legal entities/rhetorical spans | Inspect actual label schema and accuracy on fixtures | P1 experiment |
| InLegalBERT | Retrieval experiment | Candidate embedding/reranker | Pretrained MLM representation, not guaranteed sentence embedding quality | P2/evaluate |
| Generic web search/Tavily | Discovery only | Find candidate official records | Search result is not authority; licensing/cost change | Fallback |

## Agent routing

### Writer

Receives client evidence spans and curated legal passages selected by retrieval. It may use the eCourtsIndia statute API for discovery, then preserve the official origin link. It cannot cite a model's internal memory as a source.

### Citation Reviewer

Case identity uses an official order when available; discovery may use eCourtsIndia or Indian Kanoon. Exact quote checks compare against stored official text/PDF extraction. Proposition support is a separate assessment. Later treatment requires a source that represents treatment/citation history; otherwise it is Not checked.

### Fact Reviewer

Uses only matter-authorized client records for factual consistency. Legal databases are irrelevant to whether the client's ledger contains an amount. It reports evidence, contradiction, absence, or ambiguity.

## Source-specific verified notes

### IndiaCode by eCourtsIndia

Its published machine guide describes permanent URLs, JSON, free keyless API access, 10,084 Acts and 4,244 reported judgments at retrieval time. It also clearly warns that large portions of state-act text are OCR, that inferred relationships are not safe foundations for filings, and that judgment ratios are not substitutes for the order. Use `/api/v1/openapi.json` rather than hardcoding assumed endpoints. [Machine guide](https://indiacode.ecourtsindia.com/llms.txt) · [OpenAPI](https://indiacode.ecourtsindia.com/api/v1/openapi.json)

### Indian Kanoon

Official API docs expose search, document, original court copy, fragments, and metadata endpoints. Pricing retrieved on 16 September 2026 was prepaid per request (₹0.50 search/original document, ₹0.20 document, ₹0.05 fragment, ₹0.02 metadata). Terms require conspicuous “powered by IKanoon” attribution for direct display and integrated RAG uses and disclaim accuracy/reliability warranties. Recheck before integration. [API documentation](https://api.indiankanoon.org/documentation/) · [Pricing](https://api.indiankanoon.org/pricing/) · [Terms](https://api.indiankanoon.org/terms/)

### InIRAC

The card describes a CC BY 4.0, 511-row dataset, English-only v0.1, limited SC/selected-HC coverage, extraction-derived relationships, and no manual gold verification. Visible samples include empty citation fields and JSON repair failures. It is useful for experiments after filtering and primary-source reconciliation. [Dataset](https://huggingface.co/datasets/joyboseroy/inIRAC)

### InLegalBERT and OpenNyAI

InLegalBERT's current card reports MIT, 5.4 million Indian legal documents, 768 hidden dimensions, and ~110M parameters. It shows hidden-state representations; benchmark retrieval on your cases before selecting it. [Model card](https://huggingface.co/law-ai/InLegalBERT)

OpenNyAI offers an Indian legal NLP pipeline. Pin versions, inspect model cards, and measure label-level precision/recall on project fixtures rather than copying a global F1 into the pitch. [Repository](https://github.com/OpenNyAI/Opennyai)

## Local evidence manifest

Every curated legal record should store: canonical title, court, date, neutral/reporter citation when present, case number, official URL, retrieved timestamp, file checksum, page-aware text, extraction method/version, licence/provenance note, and manual-review status. Derived passages refer to that immutable source version.

## Demo corpus

Create 8–15 primary-source records relevant to the chosen IBC workflow. Include one official real citation and one deliberately invented test citation; label fixtures as synthetic. Include a real paragraph with a modified quote and a real case used for an unsupported proposition. Keep the corpus in the public repository only when licensing and confidentiality permit.
