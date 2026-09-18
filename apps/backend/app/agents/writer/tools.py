from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session
from strands import tool
from strands.tools.decorator import DecoratedFunctionTool

from app.core.config import settings
from app.schemas.agents.writer import DocumentOperation
from app.schemas.legal_sources.case import FetchCaseResponse
from app.schemas.legal_sources.statute import LookupStatuteResponse
from app.schemas.sources import CreateEvidenceSpanRequest
from app.services.drafts import draft_service
from app.services.legal_sources import (
    ecourts_adapter,
    indian_kanoon_adapter,
    legal_materializer,
    template_service,
)
from app.services.sources.retrieval import retrieval_service


class WriterSourceToolHandlers:
    """Server-scoped source, legal research, and document operations for the Writer Agent."""

    def __init__(
        self,
        db: Session,
        matter_id: UUID,
        max_tool_calls: int = 20,
    ) -> None:
        self._db = db
        self._matter_id = matter_id
        self.max_tool_calls = max_tool_calls
        self.tool_call_count = 0

    def _record_tool_call(self) -> None:
        self.tool_call_count += 1
        if self.tool_call_count > self.max_tool_calls:
            raise RuntimeError(
                f"Tool call limit exceeded: maximum {self.max_tool_calls} tool calls allowed per agent execution."
            )

    def search_sources(
        self,
        query: str,
        source_types: list[str] | None = None,
        limit: int = 8,
    ) -> dict[str, object]:
        self._record_tool_call()
        passages = retrieval_service.search_sources(
            db=self._db,
            query=query,
            matter_id=self._matter_id,
            source_types=source_types,
            limit=limit,
        )
        return {
            "passages": [passage.model_dump(mode="json") for passage in passages],
        }

    def create_evidence_span(self, passage_id: str) -> dict[str, object]:
        self._record_tool_call()
        evidence = retrieval_service.create_evidence_span(
            db=self._db,
            req=CreateEvidenceSpanRequest(
                matter_id=self._matter_id,
                passage_id=UUID(passage_id),
            ),
        )
        return evidence.model_dump(mode="json")

    def get_evidence_spans(self, span_ids: list[str]) -> dict[str, object]:
        self._record_tool_call()
        evidence = retrieval_service.get_evidence_spans(
            db=self._db,
            matter_id=self._matter_id,
            span_ids=[UUID(span_id) for span_id in span_ids],
        )
        return {
            "evidence_spans": [span.model_dump(mode="json") for span in evidence],
        }

    def get_document_version(self, document_version_id: str) -> dict[str, object]:
        self._record_tool_call()
        version = draft_service.get_document_version(
            db=self._db,
            version_id=UUID(document_version_id),
            matter_id=self._matter_id,
        )
        return {
            "version_id": str(version.id),
            "draft_id": str(version.draft_id),
            "version_no": version.version_no,
            "content_json": version.content_json,
            "content_sha256": version.content_sha256,
            "change_summary": version.change_summary,
        }

    def create_draft(
        self,
        title: str,
        kind: str = "brief",
        operations: list[dict] | None = None,
        change_summary: str | None = None,
    ) -> dict[str, object]:
        self._record_tool_call()
        parsed_ops = [DocumentOperation.model_validate(op) for op in (operations or [])]
        version = draft_service.create_draft(
            db=self._db,
            matter_id=self._matter_id,
            title=title,
            kind=kind,
            operations=parsed_ops,
            change_summary=change_summary,
            created_by_id="writer_agent",
        )
        return {
            "draft_id": str(version.draft_id),
            "version_id": str(version.id),
            "version_no": version.version_no,
            "content_sha256": version.content_sha256,
            "change_summary": version.change_summary,
        }

    def propose_document_ops(
        self,
        draft_id: str,
        base_version_id: str,
        operations: list[dict],
        change_summary: str | None = None,
    ) -> dict[str, object]:
        self._record_tool_call()
        parsed_ops = [DocumentOperation.model_validate(op) for op in operations]
        version = draft_service.propose_document_ops(
            db=self._db,
            matter_id=self._matter_id,
            draft_id=UUID(draft_id),
            base_version_id=UUID(base_version_id),
            operations=parsed_ops,
            change_summary=change_summary,
            created_by_id="writer_agent",
        )
        return {
            "draft_id": str(version.draft_id),
            "version_id": str(version.id),
            "version_no": version.version_no,
            "content_sha256": version.content_sha256,
            "change_summary": version.change_summary,
        }

    def list_draft_templates(
        self,
        query: str | None = None,
        document_type: str | None = None,
        jurisdiction: str | None = None,
        limit: int = 5,
    ) -> list[dict[str, object]]:
        self._record_tool_call()
        templates = template_service.list_templates(
            query=query,
            document_type=document_type,
            jurisdiction=jurisdiction,
            limit=limit,
        )
        return [t.model_dump(mode="json") for t in templates]

    def get_draft_template(self, template_id: str) -> dict[str, object]:
        self._record_tool_call()
        template = template_service.get_template(template_id)
        return template.model_dump(mode="json")

    def search_statutes(self, query: str, limit: int = 5) -> dict[str, object]:
        self._record_tool_call()
        results = ecourts_adapter.search_statutes(query=query, limit=limit)
        return results.model_dump(mode="json")

    def lookup_statute(
        self,
        act_key: str,
        provision: str,
        unit: str = "section",
    ) -> dict[str, object]:
        self._record_tool_call()
        raw_prov = ecourts_adapter.get_provision(act_key=act_key, provision=provision, unit=unit)
        span, source, version = legal_materializer.materialize_legal_text(
            db=self._db,
            title=f"{raw_prov['act_title']} - {unit.capitalize()} {provision}",
            text=raw_prov["text"],
            source_type="statute",
            official_url=raw_prov.get("official_source_url") or raw_prov.get("provider_url"),
            heading_path=[f"{unit.capitalize()} {provision}"],
        )

        resp = LookupStatuteResponse(
            evidence_span_id=span.id,
            source_id=source.id,
            source_version_id=version.id,
            act_key=raw_prov["act_key"],
            provision=raw_prov["provision"],
            unit=raw_prov["unit"],
            heading=raw_prov["heading"],
            provider=raw_prov.get("provider", ecourts_adapter.PROVIDER_NAME),
            provider_url=raw_prov.get("provider_url"),
            official_source_url=raw_prov.get("official_source_url"),
            retrieved_at=datetime.now(UTC).isoformat(),
            content_sha256=span.quoted_text_sha256,
            text=span.quoted_text,
            is_fixture=raw_prov.get("is_fixture", False),
            limitations=raw_prov.get("limitations", []),
        )
        return resp.model_dump(mode="json")

    def search_cases(
        self,
        query: str,
        act_key: str | None = None,
        provision: str | None = None,
        court: str | None = "SC",
        limit: int = 5,
    ) -> dict[str, object]:
        self._record_tool_call()
        if settings.LEGAL_CASE_PROVIDER == "indian_kanoon":
            results = indian_kanoon_adapter.search_cases(query=query, limit=limit)
        else:
            results = ecourts_adapter.search_cases(
                query=query,
                act_key=act_key,
                provision=provision,
                court=court,
                limit=limit,
            )
        return results.model_dump(mode="json")

    def fetch_case(self, candidate_id: str, query: str | None = None) -> dict[str, object]:
        self._record_tool_call()
        if candidate_id.startswith("ik_") or settings.LEGAL_CASE_PROVIDER == "indian_kanoon":
            case_data = indian_kanoon_adapter.fetch_case(candidate_id=candidate_id)
        else:
            case_data = ecourts_adapter.fetch_case(candidate_id=candidate_id)

        span, source, version = legal_materializer.materialize_legal_text(
            db=self._db,
            title=case_data["title"],
            text=case_data["text"],
            source_type="judgment",
            official_url=case_data.get("source_url"),
            heading_path=["Judgment"],
            evidence_query=query,
        )

        resp = FetchCaseResponse(
            evidence_span_id=span.id,
            source_id=source.id,
            source_version_id=version.id,
            candidate_id=candidate_id,
            title=case_data["title"],
            court=case_data.get("court"),
            date=case_data.get("date"),
            citation=case_data.get("citation"),
            provider=case_data.get("provider", "Legal Case Provider"),
            source_url=case_data.get("source_url"),
            retrieved_at=datetime.now(UTC).isoformat(),
            content_sha256=span.quoted_text_sha256,
            text=span.quoted_text,
            summary=case_data.get("summary"),
            is_fixture=case_data.get("is_fixture", False),
            limitations=case_data.get("limitations", []),
        )
        return resp.model_dump(mode="json")


def create_writer_source_tools(
    db: Session,
    matter_id: UUID,
    max_tool_calls: int = 20,
) -> list[DecoratedFunctionTool]:
    """Create tools whose Matter boundary cannot be changed by model arguments."""
    handlers = WriterSourceToolHandlers(
        db=db,
        matter_id=matter_id,
        max_tool_calls=max_tool_calls,
    )

    @tool(name="search_sources")
    def search_sources(
        query: str,
        source_types: list[str] | None = None,
        limit: int = 8,
    ) -> dict[str, object]:
        """Find relevant passages in the current Matter and approved global sources.

        Args:
            query: A focused factual or legal search query.
            source_types: Optional source categories to include.
            limit: Maximum number of passages to return, from 1 to 8.
        """
        if not query.strip():
            raise ValueError("Search query cannot be empty")
        if not 1 <= limit <= 8:
            raise ValueError("Search limit must be between 1 and 8")
        return handlers.search_sources(query, source_types, limit)

    @tool(name="create_evidence_span")
    def create_evidence_span(passage_id: str) -> dict[str, object]:
        """Materialize one retrieved passage as immutable evidence.

        Args:
            passage_id: Passage identifier returned by search_sources.
        """
        return handlers.create_evidence_span(passage_id)

    @tool(name="get_evidence_spans")
    def get_evidence_spans(span_ids: list[str]) -> dict[str, object]:
        """Load previously materialized evidence from the current Matter.

        Args:
            span_ids: Evidence identifiers that must all be present and authorized.
        """
        if not span_ids:
            raise ValueError("At least one evidence span id is required")
        if len(span_ids) > 20:
            raise ValueError("At most 20 evidence span ids may be loaded at once")
        return handlers.get_evidence_spans(span_ids)

    @tool(name="get_document_version")
    def get_document_version(document_version_id: str) -> dict[str, object]:
        """Load the exact immutable document version content and structure.

        Args:
            document_version_id: Document version identifier to load.
        """
        if not document_version_id.strip():
            raise ValueError("document_version_id cannot be empty")
        return handlers.get_document_version(document_version_id)

    @tool(name="create_draft")
    def create_draft(
        title: str,
        kind: str = "brief",
        operations: list[dict] | None = None,
        change_summary: str | None = None,
    ) -> dict[str, object]:
        """Create a new draft in the current Matter with initial propositions and version 1.

        Args:
            title: Title of the legal draft (e.g. 'Working Brief - Section 7 IBC').
            kind: Type of draft ('brief', 'petition', 'notice').
            operations: Optional list of DocumentOperation dicts containing text and evidence_span_ids.
            change_summary: Description of the initial document version.
        """
        if not title.strip():
            raise ValueError("title cannot be empty")
        if len(title) > 200:
            raise ValueError("title must be at most 200 characters")
        if operations is not None and len(operations) > 100:
            raise ValueError("at most 100 document operations are allowed")
        return handlers.create_draft(title, kind, operations, change_summary)

    @tool(name="propose_document_ops")
    def propose_document_ops(
        draft_id: str,
        base_version_id: str,
        operations: list[dict],
        change_summary: str | None = None,
    ) -> dict[str, object]:
        """Apply validated document operations producing a new immutable version under concurrency control.

        Args:
            draft_id: Identifier of the draft document to update.
            base_version_id: Current version identifier that this update is based upon.
            operations: List of DocumentOperation dicts (type, position, text, evidence_span_ids).
            change_summary: Description explaining the revisions made in this new version.
        """
        if not draft_id.strip() or not base_version_id.strip():
            raise ValueError("draft_id and base_version_id are required")
        if not operations:
            raise ValueError("operations list cannot be empty")
        if len(operations) > 100:
            raise ValueError("at most 100 document operations are allowed")
        return handlers.propose_document_ops(
            draft_id=draft_id,
            base_version_id=base_version_id,
            operations=operations,
            change_summary=change_summary,
        )

    @tool(name="list_draft_templates")
    def list_draft_templates(
        query: str | None = None,
        document_type: str | None = None,
        jurisdiction: str | None = None,
        limit: int = 5,
    ) -> list[dict[str, object]]:
        """List curated Indian legal drafting templates with required sections and purposes.

        Args:
            query: Optional search keyword (e.g. 'ibc', 'notice', 'affidavit').
            document_type: Filter by type (e.g. 'working_brief', 'legal_notice', 'agreement').
            jurisdiction: Filter by jurisdiction (e.g. 'india').
            limit: Maximum templates to return (default 5).
        """
        if not 1 <= limit <= 20:
            raise ValueError("limit must be between 1 and 20")
        return handlers.list_draft_templates(query, document_type, jurisdiction, limit)

    @tool(name="get_draft_template")
    def get_draft_template(template_id: str) -> dict[str, object]:
        """Retrieve full drafting template specification including sections, required facts, and rules.

        Args:
            template_id: Template identifier (e.g. 'ibc_section_7_working_brief').
        """
        if not template_id.strip():
            raise ValueError("template_id cannot be empty")
        return handlers.get_draft_template(template_id)

    @tool(name="search_statutes")
    def search_statutes(query: str, limit: int = 5) -> dict[str, object]:
        """Discover candidate statutory provisions and sections from authoritative Indian statute repositories.

        Args:
            query: Legal search terms (e.g. 'financial creditor initiation default').
            limit: Maximum candidate provisions to return (default 5).
        """
        if not query.strip():
            raise ValueError("query cannot be empty")
        if len(query) > 500:
            raise ValueError("query must be at most 500 characters")
        if not 1 <= limit <= 10:
            raise ValueError("limit must be between 1 and 10")
        return handlers.search_statutes(query, limit)

    @tool(name="lookup_statute")
    def lookup_statute(
        act_key: str,
        provision: str,
        unit: str = "section",
    ) -> dict[str, object]:
        """Obtain exact verbatim statutory provision text, official source URL, and materialized evidence ID.

        Args:
            act_key: Act identifier (e.g. 'ibc', 'companies_act').
            provision: Provision number as a string (e.g. '7', '9', '14', '60').
            unit: Statutory unit: 'section', 'article', or 'rule' (default 'section').
        """
        if not act_key.strip() or not provision.strip():
            raise ValueError("act_key and provision cannot be empty")
        return handlers.lookup_statute(act_key, provision, unit)

    @tool(name="search_cases")
    def search_cases(
        query: str,
        act_key: str | None = None,
        provision: str | None = None,
        court: str | None = "SC",
        limit: int = 5,
    ) -> dict[str, object]:
        """Search Indian case-law candidates by proposition, act, or section. Returns candidates, not verified authority.

        Args:
            query: Proposition or subject matter being researched.
            act_key: Optional act identifier filter (e.g. 'ibc').
            provision: Optional section number filter (e.g. '7').
            court: Court filter (e.g. 'SC' for Supreme Court, 'NCLAT', 'HC').
            limit: Maximum candidate decisions to return (default 5).
        """
        if not query.strip():
            raise ValueError("query cannot be empty")
        if len(query) > 500:
            raise ValueError("query must be at most 500 characters")
        if not 1 <= limit <= 10:
            raise ValueError("limit must be between 1 and 10")
        return handlers.search_cases(query, act_key, provision, court, limit)

    @tool(name="fetch_case")
    def fetch_case(candidate_id: str, query: str | None = None) -> dict[str, object]:
        """Fetch exact judicial text for a selected candidate case, materializing it into verified database evidence.

        Args:
            candidate_id: Provider candidate identifier from search_cases.
            query: Specific proposition being verified within the judgment.
        """
        if not candidate_id.strip():
            raise ValueError("candidate_id cannot be empty")
        if len(candidate_id) > 200:
            raise ValueError("candidate_id must be at most 200 characters")
        if query is not None and len(query) > 500:
            raise ValueError("query must be at most 500 characters")
        return handlers.fetch_case(candidate_id, query)

    return [
        search_sources,
        create_evidence_span,
        get_evidence_spans,
        get_document_version,
        create_draft,
        propose_document_ops,
        list_draft_templates,
        get_draft_template,
        search_statutes,
        lookup_statute,
        search_cases,
        fetch_case,
    ]
