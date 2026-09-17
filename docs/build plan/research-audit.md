# Research audit of supplied documents

Checked 16 September 2026. “Not established” means this research did not substantiate the claim, not that the claim is necessarily false.

| Original claim or inconsistency | Finding | Required correction |
|---|---|---|
| Open track is a separate prize track | Open is the theme; Build It/Ship It are implementation tracks; Best UI covers either | Use official labels; one submission is considered across categories |
| Four-minute script; live demo assumptions | Rules require a recorded video up to three minutes | Use a 170-second script; no reliance on a live judging call |
| Start building immediately | Planning/practice allowed; project implementation begins when event opens | Keep this deliverable as planning; record honest implementation history |
| InIRAC supplies authoritative clean IRAC and verified precedent edges | Dataset exists, but preview has empty citations, year zero, and parse-failure records; card says relationships are not manually gold-verified | Optional research input; audit actual records; curate primary-source passages for MVP |
| IndiaCode by eCourtsIndia does not exist | It is live and publishes an API contract | Keep adapter; distinguish private service from government India Code |
| `/acts/{id}/sections/{id}` assumed endpoint | Published contract uses provision routes such as `/api/v1/{act}/section/{number}` | Read OpenAPI and resolve act identifiers; do not guess paths |
| Any web match proves valid precedent | Retrieval only finds candidate evidence | Check identity, quotation, support, jurisdiction, and subsequent treatment separately |
| No LLM in verification, but Gemini performs entailment | Internally inconsistent | Deterministic identity/quote checks plus explicitly probabilistic support assessment |
| Not found means fake | Corpus gaps, aliases, OCR, and outages can cause misses | Label unresolved/unavailable; prohibit definitive fabrication claims from a search miss |
| Fuzzy match is deterministic proof | Fuzzy ranking is a heuristic for candidates | Require corroborating identifiers and source passage before confirmation |
| Uploaded intake is absolute ground truth | Records may conflict or be inaccurate | Preserve each assertion and provenance; call this factual consistency review |
| Entity-set comparison verifies facts | Cannot detect swapped actors, negation, event role, units, or date meaning | Compare structured propositions and exact evidence spans |
| InLegalBERT Apache 2.0 and best retrieval | Current model card labels MIT and describes MLM/NSP pretraining | Correct licence; do not assume retrieval superiority without an evaluation |
| OpenNyAI universally yields MONEY/PERSON/YEAR labels | Model-specific entity schema must be inspected | Do not implement generic labels from an unverified list; retain regex/structured extraction |
| Textract handles Hindi intake | AWS documented text languages do not include Hindi | English OCR MVP; explicitly mark unsupported-language inputs |
| Translator preserves verification status | Translated propositions can change meaning | New version; reuse identifiers but invalidate semantic checks and approval |
| Mandatory SC disclosure certificate and court-admissible annexure | Official June notice publishes a draft; this review did not establish applicable commencement | Offer an optional review report; do not claim legal certification |
| Six fake cases in Pooja Ramesh Singh | Official summary distinguishes nonexistent citations and nonexistent attributed paragraphs | Use accurate bounded statement and primary source |
| Other monetary loss cases and exact amounts | Not fully primary-source-verified in this research | Omit from pitch; do not call them false |
| Competitors lack drafting integration; first-ever claim | CaseMine advertises integrated drafting and document analysis | Present workflow differentiation as hypothesis, not market exclusivity |
| Sub-millisecond lookups, fixed CPU throughput, fixed free quotas | No measurements or account-specific entitlement established | Replace with targets and kickoff checks |
| Multiple agent counts/frameworks | Docs alternately specify Strands/PydanticAI and 4–6 specialists | Main + three specialists; Strands; Pydantic only for schemas |
| All citations blocked before appearing, but pending nodes stream into editor | Contradictory lifecycle | Separate working-draft state from reviewed export eligibility |
| Add Firecracker for diagram depth | Not a direct dependency of this proposal | Credit only technology actually integrated |
| Cloud migration is one flag on day four | Hosting, IAM, storage, streaming, secrets, auth, and billing require integration | Make Ship It a deliberate separate deployment gate |

## Evidence links

- [Event overview](https://www.wemakedevs.org/aws/first-commit), [rules](https://www.wemakedevs.org/aws/first-commit/rules), [schedule](https://www.wemakedevs.org/aws/first-commit/schedule).
- [InIRAC visible records and dataset card](https://huggingface.co/datasets/joyboseroy/inIRAC).
- [eCourtsIndia API contract](https://indiacode.ecourtsindia.com/api/v1/openapi.json).
- [InLegalBERT model card](https://huggingface.co/law-ai/InLegalBERT), [OpenNyAI repository](https://github.com/OpenNyAI/Opennyai).
- [Textract restrictions](https://docs.aws.amazon.com/textract/latest/dg/limits-document.html).
- [Official SC consultation draft](https://cdnbbsr.s3waas.gov.in/s3ec0490f1f4972d133619a60c30f3559e/uploads/2026/06/2026060342.pdf), [official judgment summary](https://www.sci.gov.in/landmark-judgment-summaries/).
- [CaseMine product description](https://www.casemine.com/home/faq).

The public pages were inspected; authenticated requests and complete source ingestion were not tested. This pack does not inherit the original document's assertion that every source and integration had already been verified live.
