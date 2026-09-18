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

    def materialize_legal_text(
        self,
        db: Session,
        title: str,
        text: str,
        source_type: Literal["statute", "judgment"],
        official_url: str | None = None,
        authority_level: str = "curated_primary",
        heading_path: list[str] | None = None,
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
                first_chunk = (
                    db.query(SourceChunk)
                    .filter(SourceChunk.source_version_id == existing_version.id)
                    .first()
                )
                if first_chunk is not None:
                    existing_span = source_repository.get_evidence_span_for_chunk(
                        db, first_chunk.id
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
                            chunk_id=first_chunk.id,
                            start_offset=0,
                            end_offset=len(clean_text),
                            quoted_text=clean_text,
                            quoted_text_sha256=content_hash,
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

            chunk = SourceChunk(
                source_version_id=version.id,
                page_id=page.id,
                chunk_index=0,
                text=clean_text,
                start_offset=0,
                end_offset=len(clean_text),
                token_count=max(1, len(clean_text.split())),
                heading_path=heading_path or [],
                embedding_model="none",
                embedding=None,
            )
            db.add(chunk)
            db.flush()

            span = EvidenceSpan(
                source_version_id=version.id,
                page_id=page.id,
                chunk_id=chunk.id,
                start_offset=0,
                end_offset=len(clean_text),
                quoted_text=clean_text,
                quoted_text_sha256=content_hash,
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
