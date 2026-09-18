import hashlib
import json
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.drafts.document_version import DocumentVersion
from app.models.drafts.draft import Draft


class DraftRepository:
    """
    Data access repository for Draft aggregates and immutable DocumentVersion records.
    Enforces Matter boundaries and optimistic/concurrency locking on version writes.
    """

    def get_draft_by_id(
        self,
        db: Session,
        draft_id: UUID,
        matter_id: UUID | None = None,
    ) -> Draft | None:
        """Retrieves a Draft aggregate scoped to Matter boundary."""
        query = db.query(Draft).filter(Draft.id == draft_id)
        if matter_id is not None:
            query = query.filter(Draft.matter_id == matter_id)
        return query.first()

    def get_version_by_id(
        self,
        db: Session,
        version_id: UUID,
        matter_id: UUID | None = None,
    ) -> DocumentVersion | None:
        """Retrieves an immutable DocumentVersion verifying Matter authorization."""
        query = db.query(DocumentVersion).join(Draft, DocumentVersion.draft_id == Draft.id)
        query = query.filter(DocumentVersion.id == version_id)
        if matter_id is not None:
            query = query.filter(Draft.matter_id == matter_id)
        return query.first()

    def get_latest_version(
        self,
        db: Session,
        draft_id: UUID,
    ) -> DocumentVersion | None:
        """Retrieves the most recent immutable DocumentVersion for a draft."""
        return (
            db.query(DocumentVersion)
            .filter(DocumentVersion.draft_id == draft_id)
            .order_by(DocumentVersion.version_no.desc())
            .first()
        )

    def create_draft(
        self,
        db: Session,
        draft: Draft,
        created_by_id: str = "writer_agent",
    ) -> Draft:
        """Persists a new Draft aggregate with its initial version 1 DocumentVersion."""
        db.add(draft)
        db.flush()

        canonical_json = json.dumps(draft.content_json or {}, sort_keys=True)
        content_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

        initial_version = DocumentVersion(
            draft_id=draft.id,
            version_no=1,
            parent_version_id=None,
            content_json=draft.content_json or {},
            content_sha256=content_hash,
            schema_version=1,
            created_by_type="agent" if created_by_id == "writer_agent" else "human",
            created_by_id=created_by_id,
            change_summary="Initial document creation",
        )
        db.add(initial_version)
        db.commit()
        db.refresh(draft)
        return draft

    def create_new_version(
        self,
        db: Session,
        draft: Draft,
        content_json: dict,
        base_version_id: UUID | None = None,
        created_by_type: str = "agent",
        created_by_id: str = "writer_agent",
        change_summary: str | None = None,
    ) -> DocumentVersion:
        """
        Creates a new immutable DocumentVersion under concurrency control.
        Rejects stale writes when base_version_id is no longer current.
        """
        latest = self.get_latest_version(db=db, draft_id=draft.id)
        if base_version_id is not None and latest is not None and latest.id != base_version_id:
            raise ValueError(
                f"Version conflict: base version {base_version_id} is stale; latest version is {latest.id}."
            )

        next_version_no = (latest.version_no + 1) if latest else 1
        canonical_json = json.dumps(content_json, sort_keys=True)
        content_hash = hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

        version = DocumentVersion(
            draft_id=draft.id,
            version_no=next_version_no,
            parent_version_id=latest.id if latest else None,
            content_json=content_json,
            content_sha256=content_hash,
            schema_version=1,
            created_by_type=created_by_type,
            created_by_id=created_by_id,
            change_summary=change_summary,
        )

        draft.version_no = next_version_no
        draft.content_json = content_json

        db.add(version)
        db.add(draft)
        db.commit()
        db.refresh(version)
        return version


draft_repository = DraftRepository()
