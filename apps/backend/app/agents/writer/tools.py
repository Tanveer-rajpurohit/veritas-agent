from uuid import UUID

from sqlalchemy.orm import Session
from strands import tool
from strands.tools.decorator import DecoratedFunctionTool

from app.schemas.sources import CreateEvidenceSpanRequest
from app.services.drafts import draft_service
from app.services.sources.retrieval import retrieval_service


class WriterSourceToolHandlers:
    """Server-scoped source operations available to the Writer Agent."""

    def __init__(self, db: Session, matter_id: UUID) -> None:
        self._db = db
        self._matter_id = matter_id

    def search_sources(
        self,
        query: str,
        source_types: list[str] | None = None,
        limit: int = 8,
    ) -> dict[str, object]:
        passages = retrieval_service.search_sources(
            db=self._db,
            query=query,
            matter_id=self._matter_id,
            source_types=source_types,
            limit=limit,
        )
        return {
            "matter_id": str(self._matter_id),
            "passages": [passage.model_dump(mode="json") for passage in passages],
        }

    def create_evidence_span(self, passage_id: str) -> dict[str, object]:
        evidence = retrieval_service.create_evidence_span(
            db=self._db,
            req=CreateEvidenceSpanRequest(
                matter_id=self._matter_id,
                passage_id=UUID(passage_id),
            ),
        )
        return evidence.model_dump(mode="json")

    def get_evidence_spans(self, span_ids: list[str]) -> dict[str, object]:
        evidence = retrieval_service.get_evidence_spans(
            db=self._db,
            matter_id=self._matter_id,
            span_ids=[UUID(span_id) for span_id in span_ids],
        )
        return {
            "matter_id": str(self._matter_id),
            "evidence_spans": [span.model_dump(mode="json") for span in evidence],
        }

    def get_document_version(self, document_version_id: str) -> dict[str, object]:
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
        }


def create_writer_source_tools(
    db: Session,
    matter_id: UUID,
) -> list[DecoratedFunctionTool]:
    """Create tools whose Matter boundary cannot be changed by model arguments."""
    handlers = WriterSourceToolHandlers(db=db, matter_id=matter_id)

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

    return [search_sources, create_evidence_span, get_evidence_spans, get_document_version]
