import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.drafts.document_command import DocumentCommand
from app.models.drafts.document_version import DocumentVersion
from app.models.drafts.draft import Draft
from app.models.reviews import Finding


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
        user_id: UUID | None = None,
        idempotency_key: str | None = None,
        request_hash: str | None = None,
    ) -> DocumentVersion:
        """
        Creates a new immutable DocumentVersion under concurrency control.
        Rejects stale writes when base_version_id is no longer current.
        """
        draft = db.scalar(select(Draft).where(Draft.id == draft.id).with_for_update())
        if draft is None:
            raise ValueError("Draft not found")
        if user_id is not None and idempotency_key is not None and request_hash is not None:
            command = db.get(DocumentCommand, (user_id, draft.id, idempotency_key))
            if command is not None:
                if command.request_hash != request_hash:
                    raise ValueError("Idempotency key was used with different content")
                return db.get(DocumentVersion, command.version_id)
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
        if latest is not None:
            db.execute(
                update(Finding)
                .where(Finding.document_version_id == latest.id, Finding.stale_at.is_(None))
                .values(status="stale", stale_at=datetime.now(UTC))
            )
        if user_id is not None and idempotency_key is not None and request_hash is not None:
            db.flush()
            db.add(
                DocumentCommand(
                    user_id=user_id,
                    draft_id=draft.id,
                    key=idempotency_key,
                    request_hash=request_hash,
                    version_id=version.id,
                )
            )
        db.commit()
        db.refresh(version)
        return version


draft_repository = DraftRepository()
