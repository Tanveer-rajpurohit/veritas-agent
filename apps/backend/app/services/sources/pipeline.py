import mimetypes
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
        """Extract, chunk, embed, store, and commit one immutable source version."""
        if not content:
            raise ValueError("Source content cannot be empty")
        if source_type == "client_record" and matter_id is None:
            raise ValueError("Client records must belong to a matter")

        file_sha256 = storage_service.compute_sha256(content)
        object_key: str | None = None

        if existing_source_id is not None:
            source = source_repository.get_source_by_id(db, existing_source_id)
            if source is None:
                raise ValueError(f"Source with id {existing_source_id} not found")
            if source.matter_id != matter_id:
                raise ValueError("Source does not belong to the requested matter")

            existing_version = source_repository.get_version_by_sha256(
                db,
                source_id=source.id,
                file_sha256=file_sha256,
            )
            if existing_version is not None:
                chunk_count = source_repository.get_chunk_count_for_version(db, existing_version.id)
                return source, existing_version, chunk_count
            version_number = source_repository.get_next_version_number(db, source.id)
        else:
            source = Source(
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
            )
            version_number = 1

        extracted_doc = extractor_service.extract_from_bytes(content, filename)
        raw_chunks = chunker_service.chunk_document(extracted_doc.pages)
        if not raw_chunks:
            message = "OCR is required" if extracted_doc.is_scanned else "No text was extracted"
            raise ValueError(f"Source ingestion stopped: {message}")
        embeddings = embedding_service.embed_chunks([c.text for c in raw_chunks])

        try:
            if existing_source_id is None:
                source = source_repository.create_source(db, source)

            object_key, _ = storage_service.save_file(
                content=content,
                filename=filename,
                source_id=source.id,
                version_number=version_number,
                matter_id=source.matter_id,
            )

            version = source_repository.create_version(
                db,
                SourceVersion(
                    source_id=source.id,
                    version_number=version_number,
                    object_key=object_key,
                    mime_type=mimetypes.guess_type(filename)[0] or "application/octet-stream",
                    file_sha256=file_sha256,
                    extraction_method=extracted_doc.extraction_method,
                    extraction_version=extracted_doc.extraction_version,
                    extraction_status="completed",
                    page_count=extracted_doc.page_count,
                ),
            )

            page_records = [
                SourcePage(
                    source_version_id=version.id,
                    page_number=page.page_number,
                    text=page.text,
                    text_sha256=page.text_sha256,
                    extraction_confidence=page.extraction_confidence,
                    width_points=page.width_points,
                    height_points=page.height_points,
                )
                for page in extracted_doc.pages
            ]
            source_repository.save_pages_and_chunks(db, page_records, [])
            page_id_map = {page.page_number: page.id for page in page_records}

            chunk_records = [
                SourceChunk(
                    source_version_id=version.id,
                    page_id=page_id_map[chunk.page_number],
                    chunk_index=chunk.chunk_index,
                    text=chunk.text,
                    start_offset=chunk.start_offset,
                    end_offset=chunk.end_offset,
                    token_count=chunk.token_count,
                    heading_path=chunk.heading_path,
                    embedding_model=settings.EMBEDDING_MODEL,
                    embedding=embeddings[index],
                )
                for index, chunk in enumerate(raw_chunks)
            ]
            source_repository.save_pages_and_chunks(db, [], chunk_records)
            db.commit()
            db.refresh(source)
            db.refresh(version)
            return source, version, len(chunk_records)
        except Exception:
            db.rollback()
            if object_key is not None:
                storage_service.delete_file(object_key)
            raise


ingestion_pipeline = IngestionPipeline()
