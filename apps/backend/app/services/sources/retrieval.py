import hashlib
import uuid

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.sources import EvidenceSpan
from app.repositories.sources import source_repository
from app.schemas.sources.retrieval import (
    CreateEvidenceSpanRequest,
    EvidenceSpanResponse,
    SourcePassage,
)
from app.services.sources.embeddings import embedding_service


class RetrievalService:
    """
    Evidence retrieval service powering the Writer Agent conforming to Sections 7 & 8
    of the specification.
    """

    def search_sources(
        self,
        db: Session,
        query: str,
        matter_id: uuid.UUID,
        source_types: list[str] | None = None,
        limit: int = 8,
    ) -> list[SourcePassage]:
        """
        Retrieves top semantic passages using pgvector cosine similarity.
        Enforces matter authorization boundary and filters to the latest version per source.
        """
        effective_limit = min(limit, settings.WRITER_RETRIEVAL_LIMIT)
        query_vector = embedding_service.embed_text(query)

        results = source_repository.search_vector_passages(
            db=db,
            query_vector=query_vector,
            matter_id=matter_id,
            source_types=source_types,
            limit=effective_limit,
        )

        passages: list[SourcePassage] = []
        for chunk, page, version, source, distance in results:
            page_num = page.page_number if page else 1
            passages.append(
                SourcePassage(
                    passage_id=chunk.id,
                    source_id=source.id,
                    source_version_id=version.id,
                    source_type=source.source_type,
                    authority_level=source.authority_level,
                    title=source.canonical_title,
                    page=page_num,
                    text=chunk.text,
                    start_offset=chunk.start_offset,
                    end_offset=chunk.end_offset,
                    token_count=chunk.token_count,
                    file_sha256=version.file_sha256,
                    heading_path=chunk.heading_path or [],
                    official_url=source.official_url,
                    distance=float(distance) if distance is not None else None,
                )
            )

        return passages

    def create_evidence_span(
        self,
        db: Session,
        req: CreateEvidenceSpanRequest,
        created_by: str = "writer_agent",
    ) -> EvidenceSpanResponse:
        """Materialize an authorized passage using only server-stored source text."""
        context = source_repository.get_chunk_context(
            db=db,
            chunk_id=req.passage_id,
            matter_id=req.matter_id,
        )
        if context is None:
            raise ValueError("Passage not found or not authorized for this matter")

        chunk, page, version, _source = context
        if chunk.start_offset < 0 or chunk.end_offset > len(page.text):
            raise ValueError("Stored passage offsets are outside the source page")
        if chunk.start_offset >= chunk.end_offset:
            raise ValueError("Stored passage offsets are invalid")

        quoted_text = page.text[chunk.start_offset : chunk.end_offset]
        if not quoted_text.strip():
            raise ValueError("Stored passage does not contain usable source text")

        existing_span = source_repository.get_evidence_span_for_chunk(db, chunk.id)
        if existing_span is not None:
            return self._to_response(existing_span)

        quoted_hash = hashlib.sha256(quoted_text.encode("utf-8")).hexdigest()

        span = source_repository.create_evidence_span(
            db=db,
            span=EvidenceSpan(
                source_version_id=version.id,
                page_id=page.id,
                chunk_id=chunk.id,
                start_offset=chunk.start_offset,
                end_offset=chunk.end_offset,
                quoted_text=quoted_text,
                quoted_text_sha256=quoted_hash,
                created_by=created_by,
            ),
        )
        db.commit()
        db.refresh(span)

        return self._to_response(span)

    def get_evidence_spans(
        self,
        db: Session,
        matter_id: uuid.UUID,
        span_ids: list[uuid.UUID],
    ) -> list[EvidenceSpanResponse]:
        """
        Retrieves audited evidence spans verifying provenance.
        """
        spans = source_repository.get_evidence_spans(
            db=db,
            matter_id=matter_id,
            span_ids=span_ids,
        )
        if len(spans) != len(set(span_ids)):
            raise ValueError("One or more evidence spans were not found or authorized")
        return [self._to_response(span) for span in spans]

    @staticmethod
    def _to_response(span: EvidenceSpan) -> EvidenceSpanResponse:
        return EvidenceSpanResponse.model_validate(span, from_attributes=True)


retrieval_service = RetrievalService()
