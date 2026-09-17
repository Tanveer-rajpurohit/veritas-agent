# Veritas Data Sources and Model Catalog

This document details the data sources, language models, and external APIs utilized across Veritas, including their specific roles, licensing, known limitations, and agent access routing.

## 1. Source Authority Hierarchy

In legal drafting, authority is task-specific. Official enacted statutory text and certified court orders take precedence over secondary search indices or model-derived datasets. A match in a search index proves only that the text exists; it does not prove the proposition asserted from it.

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         AUTHORITY PRECEDENCE ORDER                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 1. Primary Official Records (Uploaded client contracts, bank statements, notices)│
│    -> Sole ground truth for factual consistency review                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 2. Official Statutory & Judicial Portals (India Code Gazette, SCI official orders)│
│    -> Canonical baseline for legal text and case identity                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 3. Structured Discovery APIs (IndiaCode by eCourtsIndia, Indian Kanoon API)       │
│    -> Rapid candidate search and section retrieval                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│ 4. Research Benchmarks & Embedding Models (InIRAC, InLegalBERT, OpenNyAI)        │
│    -> Offline discovery, feature extraction, and candidate ranking               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Agent Routing Matrix

| Source / Tool | Consuming Agents | Primary Role | Key Limitations & Governance |
|---|---|---|---|
| **Client Uploaded Records** | Writer, Fact Reviewer | Factual evidence | Confidential; extraction/OCR may miss dirty text; records may conflict internally. |
| **Curated IBC Local Corpus** | Writer, Citation Reviewer | Verified demo baseline | Scoped to Section 7 IBC; 8 to 15 curated judgments with full official text. |
| **IndiaCode (eCourtsIndia)** | Writer, Citation Reviewer | Structured statute discovery | Community service; state-act text contains OCR noise; ratios are not binding orders. |
| **Indian Kanoon API** | Citation Reviewer | Case search fallback | Prepaid credits; requires "Powered by IKanoon" attribution; availability dependent on third-party SLA. |
| **InIRAC Benchmark** | Offline Research | Evaluation & IRAC testing | 511 judgments; extraction-derived links; contains parse anomalies; not gold-verified. |
| **InLegalBERT** | Retrieval Experiment | Legal semantic search | Pre-trained MLM/NSP representation (MIT License); requires benchmark validation. |
| **OpenNyAI Pipeline** | Extraction Experiment | Legal entity recognition | Evaluated on specific Indian court texts; entity labels must be validated against local fixtures. |
| **Document Parser / Textract** | Fact Reviewer, Main Agent | Page-aware text extraction | Native PDF parsing preferred; OCR used for scans; English records prioritized for MVP. |

## 3. Detailed Source Specifications

### A. Client Intake Documents (Matter Ground Truth)
- **Role:** Supplies the sole ground truth for factual assertions (borrower identity, loan amount, default date, notice dates).
- **Processing:** PyMuPDF and pdfplumber parse native digital text with exact character offsets and page numbers. Scanned records use Amazon Textract or local OCR.
- **Limitation:** Client files often contain contradictory statements (such as a loan agreement stating Rs. 4.85 Crore while a demand certificate states Rs. 5.20 Crore). Veritas surfaces both passages side by side rather than guessing a resolution.

### B. Curated IBC Section 7 Demo Corpus
- **Role:** High-reliability local database containing 8 to 15 landmark Supreme Court and NCLAT judgments on insolvency default standards:
  - *Innoventive Industries Ltd. v. ICICI Bank* (2018) 1 SCC 407 (foundational standard of default under IBC).
  - *Mobilox Innovations Pvt. Ltd. v. Kirusa Software Pvt. Ltd.* (2018) 1 SCC 353 (pre-existing dispute test).
  - *Pooja Ramesh Singh v. J&K Bank Ltd.*, 2026 INSC 668 (Supreme Court ruling addressing AI citation hallucinations).
  - Controlled synthetic test fixtures: one deliberately invented citation and one judgment with a modified quote to verify detection gates.
- **Storage:** Local PostgreSQL tables with indexed citation identifiers, neutral citations, and complete authentic text.

### C. IndiaCode by eCourtsIndia (`indiacode.ecourtsindia.com`)
- **Role:** Free, keyless OpenAPI 3.1 endpoint delivering structured JSON for Central Acts and reported judgments.
- **Documentation:** Accessible via `/llms.txt` and `/api/v1/openapi.json`.
- **Primary Endpoints:**
  - `GET /api/v1/meta`: Returns total corpus counts and valid enumeration keys.
  - `GET /api/v1/{act}/section/{number}`: Returns full statutory provision text and offence classifications.
  - `GET /api/v1/search?q=`: Full-text and exact citation search.
  - `GET /api/v1/judgments?act={act}&section={section}`: Reported judgments linked to specific statutory provisions.
- **Important Limitations:** The machine guide explicitly warns that portions of older state acts contain OCR errors and that inferred relationships are not official legal opinions. Quotations must be verified against the official text.

### D. Indian Kanoon API (`api.indiankanoon.org`)
- **Role:** Optional secondary fallback for judgment search and full-text retrieval.
- **Pricing & Terms:** Prepaid request model (approximately Rs. 0.50 per search, Rs. 0.20 per full document). Terms require prominent "Powered by IKanoon" attribution when rendering search results to users.

### E. InIRAC Benchmark
- **Role:** Evaluation dataset for testing automated legal extraction.
- **Specifications:** 511 Supreme Court and High Court judgments structured into Issue, Rule, Application, and Conclusion (IRAC) segments with relational citation tags (`CITES`, `OVERRULES`, `DISTINGUISHES`).
- **License:** CC BY 4.0.
- **Data Quality Audit:** Research audit identified that relationship tags were derived from automated extraction without manual gold verification, and some preview rows contain empty citation fields. It is utilized for testing and offline tuning, not as a solitary ground truth.

### F. InLegalBERT
- **Role:** Domain-adapted language model trained on 5.4 million Indian legal documents by law-ai (IIT Kharagpur).
- **License:** MIT License.
- **Architecture:** 768 hidden dimensions, 110M parameters.
- **Note:** Pre-trained on masked language modeling (MLM) and next sentence prediction (NSP). For production semantic retrieval, dense sentence embeddings should be benchmarked against standard dense retrievers (`bge-small-en-v1.5`) on local legal queries.

## 4. Local Evidence Manifest Schema

Every authoritative record stored in the local repository follows a strict provenance manifest:

```json
{
  "source_id": "uuid",
  "canonical_title": "Pooja Ramesh Singh v. Jammu and Kashmir Bank Ltd.",
  "court": "Supreme Court of India",
  "decision_date": "2026-07-02",
  "neutral_citation": "2026 INSC 668",
  "official_url": "https://api.sci.gov.in/supremecourt/2025/52338/52338_2025_5_1501_71939_Judgement_02-Jul-2026.pdf",
  "file_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "extraction_method": "native_pdf_pymupdf",
  "extraction_version": "1.2.0",
  "provenance_note": "Curated landmark judgment on AI citation sanctions",
  "reviewed_by_human": true
}
```

All derived evidence spans reference immutable source versions via `source_id` and character offsets, ensuring complete reproducibility across document revisions.
