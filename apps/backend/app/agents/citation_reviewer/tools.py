from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session
from strands import tool
from strands.tools.decorator import DecoratedFunctionTool

from app.core.config import settings
from app.models.reviews import Finding, FindingEvidence
from app.models.sources import EvidenceSpan, Source, SourceVersion
from app.schemas.legal_sources.case import FetchCaseResponse
from app.schemas.legal_sources.statute import LookupStatuteResponse
from app.services.legal_sources import ecourts_adapter, indian_kanoon_adapter, legal_materializer


class CitationReviewerToolHandlers:
    def __init__(self, db: Session, document_version_id: UUID, max_tool_calls: int = 12) -> None:
        self._db = db
        self._document_version_id = document_version_id
        self._candidate_ids: set[str] = set()
        self._max_tool_calls = max_tool_calls
        self._tool_call_count = 0

    def _record_tool_call(self) -> None:
        self._tool_call_count += 1
        if self._tool_call_count > self._max_tool_calls:
            raise RuntimeError("Citation review tool-call limit exceeded")

    def get_citation_findings(self, document_version_id: str) -> dict[str, object]:
        self._record_tool_call()
        if UUID(document_version_id) != self._document_version_id:
            raise ValueError("Requested document version is not the active review target")

        findings = self._db.scalars(
            select(Finding).where(
                Finding.document_version_id == self._document_version_id,
                Finding.dimension.in_(("identity", "quotation", "support", "treatment")),
                Finding.stale_at.is_(None),
            )
        ).all()
        items: list[dict[str, Any]] = []
        for finding in findings:
            evidence_rows = self._db.execute(
                select(FindingEvidence, EvidenceSpan, SourceVersion, Source)
                .join(EvidenceSpan, EvidenceSpan.id == FindingEvidence.evidence_span_id)
                .join(SourceVersion, SourceVersion.id == EvidenceSpan.source_version_id)
                .join(Source, Source.id == SourceVersion.source_id)
                .where(FindingEvidence.finding_id == finding.id)
            ).all()
            items.append(
                {
                    "finding_id": str(finding.id),
                    "dimension": finding.dimension,
                    "status": finding.status,
                    "claim_text": finding.claim_text,
                    "reason": finding.reason,
                    "limitations": finding.limitations,
                    "evidence": [
                        {
                            "evidence_span_id": str(span.id),
                            "relation": link.relation,
                            "text": span.quoted_text,
                            "source_title": source.canonical_title,
                            "source_url": source.official_url,
                            "authority_level": source.authority_level,
                        }
                        for link, span, _version, source in evidence_rows
                    ],
                }
            )
        return {"document_version_id": document_version_id, "findings": items}

    def lookup_statute(self, act_key: str, provision: str, unit: str) -> dict[str, object]:
        self._record_tool_call()
        raw = ecourts_adapter.get_provision(act_key=act_key, provision=provision, unit=unit)
        span, source, version = legal_materializer.materialize_legal_text(
            db=self._db,
            title=f"{raw['act_title']} - {raw['unit'].capitalize()} {raw['provision']}",
            text=raw["text"],
            source_type="statute",
            official_url=raw.get("official_source_url") or raw.get("provider_url"),
            heading_path=[f"{raw['unit'].capitalize()} {raw['provision']}"],
        )
        return LookupStatuteResponse(
            evidence_span_id=span.id,
            source_id=source.id,
            source_version_id=version.id,
            act_key=raw["act_key"],
            provision=raw["provision"],
            unit=raw["unit"],
            heading=raw["heading"],
            provider=raw["provider"],
            provider_url=raw.get("provider_url"),
            official_source_url=raw.get("official_source_url"),
            retrieved_at=datetime.now(UTC).isoformat(),
            content_sha256=span.quoted_text_sha256,
            text=span.quoted_text,
            is_fixture=False,
            limitations=raw.get("limitations", []),
        ).model_dump(mode="json")

    def search_cases(self, query: str, limit: int) -> dict[str, object]:
        self._record_tool_call()
        if settings.LEGAL_CASE_PROVIDER == "indian_kanoon":
            response = indian_kanoon_adapter.search_cases(query=query, limit=limit)
        else:
            response = ecourts_adapter.search_cases(query=query, limit=limit)
        self._candidate_ids.update(item.candidate_id for item in response.candidates)
        return response.model_dump(mode="json")

    def fetch_case(self, candidate_id: str, query: str | None) -> dict[str, object]:
        self._record_tool_call()
        if candidate_id not in self._candidate_ids:
            raise ValueError("Case must be selected from search results returned in this run")
        case = indian_kanoon_adapter.fetch_case(candidate_id=candidate_id)
        span, source, version = legal_materializer.materialize_legal_text(
            db=self._db,
            title=case["title"],
            text=case["text"],
            source_type="judgment",
            official_url=case.get("source_url"),
            evidence_query=query,
        )
        return FetchCaseResponse(
            evidence_span_id=span.id,
            source_id=source.id,
            source_version_id=version.id,
            candidate_id=candidate_id,
            title=case["title"],
            court=case.get("court"),
            date=case.get("date"),
            citation=case.get("citation"),
            provider=case["provider"],
            source_url=case.get("source_url"),
            retrieved_at=datetime.now(UTC).isoformat(),
            content_sha256=span.quoted_text_sha256,
            text=span.quoted_text,
            summary=case.get("summary"),
            is_fixture=False,
            limitations=case.get("limitations", []),
        ).model_dump(mode="json")


def create_citation_reviewer_tools(
    db: Session, document_version_id: UUID, max_tool_calls: int = 12
) -> tuple[list[DecoratedFunctionTool], CitationReviewerToolHandlers]:
    handlers = CitationReviewerToolHandlers(db, document_version_id, max_tool_calls)

    @tool(name="get_citation_findings")
    def get_citation_findings(document_version_id: str) -> dict[str, object]:
        """Load persisted citation findings and their exact stored evidence for the active version."""
        return handlers.get_citation_findings(document_version_id)

    @tool(name="lookup_statute")
    def lookup_statute(act_key: str, provision: str, unit: str = "section") -> dict[str, object]:
        """Retrieve and store exact live statutory text; retrieval does not prove legal treatment."""
        if not act_key.strip() or not provision.strip():
            raise ValueError("act_key and provision are required")
        return handlers.lookup_statute(act_key, provision, unit)

    @tool(name="search_cases")
    def search_cases(query: str, limit: int = 5) -> dict[str, object]:
        """Discover Indian case candidates; candidates are not verified authority."""
        if not query.strip() or len(query) > 500:
            raise ValueError("query must contain 1 to 500 characters")
        if not 1 <= limit <= 5:
            raise ValueError("limit must be between 1 and 5")
        return handlers.search_cases(query, limit)

    @tool(name="fetch_case")
    def fetch_case(candidate_id: str, query: str | None = None) -> dict[str, object]:
        """Fetch exact text for a case candidate discovered during this review run."""
        if not candidate_id.strip() or len(candidate_id) > 200:
            raise ValueError("candidate_id must contain 1 to 200 characters")
        if query is not None and len(query) > 500:
            raise ValueError("query must be at most 500 characters")
        return handlers.fetch_case(candidate_id, query)

    return [get_citation_findings, lookup_statute, search_cases, fetch_case], handlers
