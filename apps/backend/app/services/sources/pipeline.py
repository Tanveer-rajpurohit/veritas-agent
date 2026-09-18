import uuid
from datetime import date
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.sources import Source, SourceChunk, SourcePage, SourceVersion
from app.repositories.sources import source_repository
from app.services.sources.chunker import chunker_service
from app.services.sources.embeddings import embedding_service
from app.services.sources.extractor import extractor_service
from app.services.sources.storage import storage_service


class IngestionPipeline:
    """
    Deterministic end-to-end source ingestion pipeline conforming to Section 5
    of the Writer Agent specification.
    """

    def ingest_file(
        self,
        db: Session,
        content: bytes,
        filename: str,
        matter_id: uuid.UUID | None = None,
        canonical_title: str | None = None,
        source_type: str = "client_record",
        authority_level: str = "matter_evidence",
        court: str | None = None,
        case_number: str | None = None,
        neutral_citation: str | None = None,
        decision_date: date | None = None,
        official_url: str | None = None,
        is_synthetic: bool = False,
        existing_source_id: uuid.UUID | None = None,
    ) -> tuple[Source, SourceVersion, int]:
        """
        Executes complete ingestion pipeline:
        Deduplication -> Atomic storage -> Page extraction -> Chunking -> Dense embedding -> Database commit.
        """
        file_sha256 = storage_service.compute_sha256(content)

        existing_version = source_repository.get_version_by_sha256(db, file_sha256)
        if existing_version is not None:
            source = source_repository.get_source_by_id(db, existing_version.source_id)
            if source is None:
                raise ValueError(f"Corrupt state: source {existing_version.source_id} missing")
            chunk_count = source_repository.get_chunk_count_for_version(db, existing_version.id)
            return source, existing_version, chunk_count

        if existing_source_id is not None:
            source = source_repository.get_source_by_id(db, existing_source_id)
            if source is None:
                raise ValueError(f"Source with id {existing_source_id} not found")
            version_number = len(source.versions) + 1
        else:
            source = source_repository.create_source(
                db,
                Source(
                    matter_id=matter_id,
                    canonical_title=canonical_title or filename,
                    source_type=source_type,
                    authority_level=authority_level,
                    court=court,
                    case_number=case_number,
                    neutral_citation=neutral_citation,
                    decision_date=decision_date,
                    official_url=official_url,
                    is_synthetic=is_synthetic,
                ),
            )
            version_number = 1

        object_key, _ = storage_service.save_file(
            content=content,
            filename=filename,
            source_id=source.id,
            version_number=version_number,
            matter_id=matter_id,
        )

        extracted_doc = extractor_service.extract_from_bytes(content, filename)
        mime_type = "application/pdf" if filename.lower().endswith(".pdf") else "application/octet-stream"

        version = source_repository.create_version(
            db,
            SourceVersion(
                source_id=source.id,
                version_number=version_number,
                object_key=object_key,
                mime_type=mime_type,
                file_sha256=file_sha256,
                extraction_method=extracted_doc.extraction_method,
                extraction_version=extracted_doc.extraction_version,
                extraction_status="completed",
                page_count=extracted_doc.page_count,
            ),
        )

        page_records: list[SourcePage] = []
        page_id_map: dict[int, uuid.UUID] = {}
        for p in extracted_doc.pages:
            page_rec = SourcePage(
                source_version_id=version.id,
                page_number=p.page_number,
                text=p.text,
                text_sha256=p.text_sha256,
                extraction_confidence=p.extraction_confidence,
                width_points=p.width_points,
                height_points=p.height_points,
            )
            page_records.append(page_rec)

        for p_rec in page_records:
            db.add(p_rec)
        db.flush()
        for p_rec in page_records:
            page_id_map[p_rec.page_number] = p_rec.id

        raw_chunks = chunker_service.chunk_document(extracted_doc.pages)
        embeddings = embedding_service.embed_chunks([c.text for c in raw_chunks])

        chunk_records: list[SourceChunk] = []
        for idx, c in enumerate(raw_chunks):
            chunk_rec = SourceChunk(
                source_version_id=version.id,
                page_id=page_id_map.get(c.page_number),
                chunk_index=c.chunk_index,
                text=c.text,
                start_offset=c.start_offset,
                end_offset=c.end_offset,
                token_count=c.token_count,
                heading_path=c.heading_path,
                embedding_model=settings.EMBEDDING_MODEL,
                embedding=embeddings[idx] if idx < len(embeddings) else None,
            )
            chunk_records.append(chunk_rec)

        source_repository.save_pages_and_chunks(db, [], chunk_records)
        db.refresh(source)
        db.refresh(version)

        return source, version, len(chunk_records)


ingestion_pipeline = IngestionPipeline()
