import uuid
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.models.sources import EvidenceSpan, Source, SourceChunk, SourcePage, SourceVersion


class SourceRepository:
    """
    Data access repository for Source aggregates, versions, pages, chunks, and evidence spans.
    Owns all direct database queries and mutations.
    """

    def get_version_by_sha256(self, db: Session, file_sha256: str) -> SourceVersion | None:
        """Looks up an immutable source version by its unique SHA-256 digest."""
        return (
            db.query(SourceVersion)
            .filter(SourceVersion.file_sha256 == file_sha256)
            .first()
        )

    def get_source_by_id(self, db: Session, source_id: uuid.UUID) -> Source | None:
        """Retrieves a source document record by primary key."""
        return db.query(Source).filter(Source.id == source_id).first()

    def get_chunk_count_for_version(self, db: Session, version_id: uuid.UUID) -> int:
        """Counts persisted chunks for a specific source version."""
        return (
            db.query(SourceChunk)
            .filter(SourceChunk.source_version_id == version_id)
            .count()
        )

    def create_source(self, db: Session, source: Source) -> Source:
        """Persists a new Source aggregate."""
        db.add(source)
        db.flush()
        return source

    def create_version(self, db: Session, version: SourceVersion) -> SourceVersion:
        """Persists a new immutable SourceVersion."""
        db.add(version)
        db.flush()
        return version

    def save_pages_and_chunks(
        self,
        db: Session,
        pages: list[SourcePage],
        chunks: list[SourceChunk],
    ) -> None:
        """Persists extracted pages and vector chunks within the active transaction."""
        for p in pages:
            db.add(p)
        db.flush()

        for c in chunks:
            db.add(c)
        db.commit()

    def search_vector_passages(
        self,
        db: Session,
        query_vector: list[float],
        matter_id: uuid.UUID | None,
        source_types: list[str] | None,
        limit: int,
    ) -> list[tuple[SourceChunk, SourcePage | None, SourceVersion, Source, float | None]]:
        """
        Executes vector similarity search against active document versions using pgvector.
        Enforces matter authorization boundary and filters to the latest version per source.
        """
        max_version_subq = (
            select(
                SourceVersion.source_id,
                func.max(SourceVersion.version_number).label("max_ver"),
            )
            .group_by(SourceVersion.source_id)
            .subquery()
        )

        distance_expr = SourceChunk.embedding.cosine_distance(query_vector).label("distance")

        stmt = (
            select(
                SourceChunk,
                SourcePage,
                SourceVersion,
                Source,
                distance_expr,
            )
            .join(SourceVersion, SourceChunk.source_version_id == SourceVersion.id)
            .join(Source, SourceVersion.source_id == Source.id)
            .outerjoin(SourcePage, SourceChunk.page_id == SourcePage.id)
            .join(
                max_version_subq,
                and_(
                    SourceVersion.source_id == max_version_subq.c.source_id,
                    SourceVersion.version_number == max_version_subq.c.max_ver,
                ),
            )
        )

        if matter_id is not None:
            stmt = stmt.where(
                or_(
                    Source.matter_id == matter_id,
                    Source.matter_id.is_(None),
                )
            )
        else:
            stmt = stmt.where(Source.matter_id.is_(None))

        if source_types:
            stmt = stmt.where(Source.source_type.in_(source_types))

        stmt = stmt.order_by(distance_expr.asc()).limit(limit)
        return db.execute(stmt).all()

    def create_evidence_span(self, db: Session, span: EvidenceSpan) -> EvidenceSpan:
        """Persists an audited evidence span."""
        db.add(span)
        db.commit()
        db.refresh(span)
        return span

    def get_evidence_spans(
        self,
        db: Session,
        span_ids: list[uuid.UUID],
    ) -> list[EvidenceSpan]:
        """Retrieves evidence spans by their unique identifiers."""
        return db.query(EvidenceSpan).filter(EvidenceSpan.id.in_(span_ids)).all()


source_repository = SourceRepository()
