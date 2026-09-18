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
        matter_id: uuid.UUID | None = None,
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
    ) -> EvidenceSpanResponse:
        """
        Creates an immutable, cryptographically verifiable evidence span for a claim citation.
        """
        quoted_hash = hashlib.sha256(req.quoted_text.encode("utf-8")).hexdigest()

        span = source_repository.create_evidence_span(
            db=db,
            span=EvidenceSpan(
                source_version_id=req.source_version_id,
                page_id=req.page_id,
                chunk_id=req.chunk_id,
                start_offset=req.start_offset,
                end_offset=req.end_offset,
                quoted_text=req.quoted_text,
                quoted_text_sha256=quoted_hash,
                created_by=req.created_by,
            ),
        )

        return EvidenceSpanResponse(
            id=span.id,
            source_version_id=span.source_version_id,
            page_id=span.page_id,
            chunk_id=span.chunk_id,
            start_offset=span.start_offset,
            end_offset=span.end_offset,
            quoted_text=span.quoted_text,
            quoted_text_sha256=span.quoted_text_sha256,
            created_by=span.created_by,
        )

    def get_evidence_spans(
        self,
        db: Session,
        span_ids: list[uuid.UUID],
    ) -> list[EvidenceSpanResponse]:
        """
        Retrieves audited evidence spans verifying provenance.
        """
        spans = source_repository.get_evidence_spans(db=db, span_ids=span_ids)
        return [
            EvidenceSpanResponse(
                id=s.id,
                source_version_id=s.source_version_id,
                page_id=s.page_id,
                chunk_id=s.chunk_id,
                start_offset=s.start_offset,
                end_offset=s.end_offset,
                quoted_text=s.quoted_text,
                quoted_text_sha256=s.quoted_text_sha256,
                created_by=s.created_by,
            )
            for s in spans
        ]


retrieval_service = RetrievalService()
