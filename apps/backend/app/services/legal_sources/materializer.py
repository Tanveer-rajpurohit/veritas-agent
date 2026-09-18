import hashlib
from typing import Literal

from sqlalchemy.orm import Session

from app.models.sources.chunk import SourceChunk
from app.models.sources.evidence import EvidenceSpan
from app.models.sources.page import SourcePage
from app.models.sources.source import Source, SourceVersion
from app.repositories.sources import source_repository


class LegalSourceMaterializer:
    """
    Materializes authoritative external statutes and case judgments into PostgreSQL.
    Reuses existing Source, SourceVersion, SourcePage, SourceChunk, and EvidenceSpan models.
    Enforces matter_id = NULL for approved global legal sources and prevents duplicate storage.
    """

    MAX_CHUNK_CHARS = 4_000

    @classmethod
    def _chunk_ranges(cls, text: str) -> list[tuple[int, int]]:
        ranges: list[tuple[int, int]] = []
        start = 0
        while start < len(text):
            end = min(start + cls.MAX_CHUNK_CHARS, len(text))
            if end < len(text):
                boundary = text.rfind("\n\n", start, end)
                if boundary <= start:
                    boundary = text.rfind(" ", start, end)
                if boundary > start:
                    end = boundary
            ranges.append((start, end))
            start = end
            while start < len(text) and text[start].isspace():
                start += 1
        return ranges

    @staticmethod
    def _select_chunk(chunks: list[SourceChunk], query: str | None) -> SourceChunk:
        if not query:
            return chunks[0]
        terms = {term.casefold() for term in query.split() if len(term) > 2}
        if not terms:
            return chunks[0]
        return max(
            chunks,
            key=lambda chunk: sum(chunk.text.casefold().count(term) for term in terms),
        )

    def materialize_legal_text(
        self,
        db: Session,
        title: str,
        text: str,
        source_type: Literal["statute", "judgment"],
        official_url: str | None = None,
        authority_level: str = "discovery_only",
        heading_path: list[str] | None = None,
        evidence_query: str | None = None,
    ) -> tuple[EvidenceSpan, Source, SourceVersion]:
        """
        Atomically persists external legal material into the database provenance chain.
        Returns the stable EvidenceSpan along with Source and SourceVersion records.
        """
        clean_text = text.strip()
        if not clean_text:
            raise ValueError("Cannot materialize empty legal text")

        content_hash = hashlib.sha256(clean_text.encode("utf-8")).hexdigest()

        existing_version = (
            db.query(SourceVersion).filter(SourceVersion.file_sha256 == content_hash).first()
        )
        if existing_version is not None:
            source = source_repository.get_source_by_id(db=db, source_id=existing_version.source_id)
            if source is not None and source.matter_id is None:
                existing_chunks = (
                    db.query(SourceChunk)
                    .filter(SourceChunk.source_version_id == existing_version.id)
                    .order_by(SourceChunk.chunk_index.asc())
                    .all()
                )
                if existing_chunks:
                    selected_chunk = self._select_chunk(existing_chunks, evidence_query)
                    existing_span = source_repository.get_evidence_span_for_chunk(
                        db, selected_chunk.id
                    )
                    if existing_span is not None:
                        return existing_span, source, existing_version

                    page = (
                        db.query(SourcePage)
                        .filter(SourcePage.source_version_id == existing_version.id)
                        .first()
                    )
                    span = source_repository.create_evidence_span(
                        db=db,
                        span=EvidenceSpan(
                            source_version_id=existing_version.id,
                            page_id=page.id if page else None,
                            chunk_id=selected_chunk.id,
                            start_offset=0,
                            end_offset=len(selected_chunk.text),
                            quoted_text=selected_chunk.text,
                            quoted_text_sha256=hashlib.sha256(
                                selected_chunk.text.encode("utf-8")
                            ).hexdigest(),
                            created_by="legal_source_materializer",
                        ),
                    )
                    db.commit()
                    db.refresh(span)
                    return span, source, existing_version

        existing_source = (
            db.query(Source)
            .filter(
                Source.matter_id.is_(None),
                Source.source_type == source_type,
                Source.canonical_title == title,
            )
            .first()
        )

        try:
            if existing_source is not None:
                source = existing_source
                last_ver = (
                    db.query(SourceVersion)
                    .filter(SourceVersion.source_id == source.id)
                    .order_by(SourceVersion.version_number.desc())
                    .first()
                )
                next_version_no = (last_ver.version_number + 1) if last_ver else 1
            else:
                source = Source(
                    matter_id=None,
                    source_type=source_type,
                    canonical_title=title,
                    authority_level=authority_level,
                    official_url=official_url,
                )
                db.add(source)
                db.flush()
                next_version_no = 1

            version = SourceVersion(
                source_id=source.id,
                version_number=next_version_no,
                file_sha256=content_hash,
                object_key=f"external://{source_type}/{content_hash}",
                mime_type="text/plain",
            )
            db.add(version)
            db.flush()

            page = SourcePage(
                source_version_id=version.id,
                page_number=1,
                text=clean_text,
                text_sha256=content_hash,
            )
            db.add(page)
            db.flush()

            chunks: list[SourceChunk] = []
            for index, (start, end) in enumerate(self._chunk_ranges(clean_text)):
                chunk_text = clean_text[start:end]
                chunk = SourceChunk(
                    source_version_id=version.id,
                    page_id=page.id,
                    chunk_index=index,
                    text=chunk_text,
                    start_offset=start,
                    end_offset=end,
                    token_count=max(1, len(chunk_text.split())),
                    heading_path=heading_path or [],
                    embedding_model="none",
                    embedding=None,
                )
                db.add(chunk)
                chunks.append(chunk)
            db.flush()

            selected_chunk = self._select_chunk(chunks, evidence_query)
            selected_hash = hashlib.sha256(selected_chunk.text.encode("utf-8")).hexdigest()

            span = EvidenceSpan(
                source_version_id=version.id,
                page_id=page.id,
                chunk_id=selected_chunk.id,
                start_offset=0,
                end_offset=len(selected_chunk.text),
                quoted_text=selected_chunk.text,
                quoted_text_sha256=selected_hash,
                created_by="legal_source_materializer",
            )
            db.add(span)
            db.commit()
            db.refresh(span)
            db.refresh(source)
            db.refresh(version)

            return span, source, version

        except Exception:
            db.rollback()
            raise


legal_materializer = LegalSourceMaterializer()
