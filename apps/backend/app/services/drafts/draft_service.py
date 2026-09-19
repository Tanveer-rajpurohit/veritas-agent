import copy
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.drafts.document_version import DocumentVersion
from app.models.drafts.draft import Draft
from app.repositories.drafts import draft_repository
from app.schemas.agents.writer import DocumentOperation
from app.services.sources.retrieval import retrieval_service


class DraftService:
    """
    Core document versioning and mutation service.
    Enforces Matter authorization, evidence ownership validation, and concurrency control.
    """

    def get_document_version(
        self,
        db: Session,
        version_id: UUID,
        matter_id: UUID,
    ) -> DocumentVersion:
        """Loads verified immutable DocumentVersion enforcing Matter boundary."""
        version = draft_repository.get_version_by_id(
            db=db,
            version_id=version_id,
            matter_id=matter_id,
        )
        if version is None:
            raise ValueError(
                f"Document version {version_id} not found or not authorized for matter {matter_id}"
            )
        return version

    def create_draft(
        self,
        db: Session,
        matter_id: UUID,
        title: str,
        kind: str = "brief",
        operations: list[DocumentOperation] | None = None,
        change_summary: str | None = None,
        created_by_id: str = "writer_agent",
    ) -> DocumentVersion:
        """
        Creates a new Draft aggregate and its initial version 1 DocumentVersion,
        optionally applying initial document operations.
        """
        all_span_ids: list[UUID] = []
        if operations:
            for op in operations:
                all_span_ids.extend(op.evidence_span_ids)

        if all_span_ids:
            retrieval_service.get_evidence_spans(
                db=db,
                matter_id=matter_id,
                span_ids=list(set(all_span_ids)),
            )

        initial_content = self._apply_operations(
            base_content={"type": "doc", "content": []},
            operations=operations or [],
        )

        draft = Draft(
            matter_id=matter_id,
            title=title,
            kind=kind,
            content_json=initial_content,
            version_no=1,
        )

        draft = draft_repository.create_draft(
            db=db,
            draft=draft,
            created_by_id=created_by_id,
        )

        latest = draft_repository.get_latest_version(db=db, draft_id=draft.id)
        if latest is None:
            raise RuntimeError("Failed to retrieve initial document version")

        if change_summary:
            latest.change_summary = change_summary
            db.commit()
            db.refresh(latest)

        return latest

    def propose_document_ops(
        self,
        db: Session,
        matter_id: UUID,
        draft_id: UUID,
        base_version_id: UUID | None,
        operations: list[DocumentOperation],
        change_summary: str | None = None,
        created_by_id: str = "writer_agent",
    ) -> DocumentVersion:
        """
        Applies validated document operations producing a new immutable DocumentVersion.
        Validates evidence span ownership against authorized Matter and rejects stale writes.
        """
        draft = draft_repository.get_draft_by_id(
            db=db,
            draft_id=draft_id,
            matter_id=matter_id,
        )
        if draft is None:
            raise ValueError(f"Draft {draft_id} not found or unauthorized for matter {matter_id}")

        all_span_ids: list[UUID] = []
        for op in operations:
            all_span_ids.extend(op.evidence_span_ids)

        if all_span_ids:
            retrieval_service.get_evidence_spans(
                db=db,
                matter_id=matter_id,
                span_ids=list(set(all_span_ids)),
            )

        latest_version = draft_repository.get_latest_version(db=db, draft_id=draft_id)
        if (
            base_version_id is not None
            and latest_version is not None
            and latest_version.id != base_version_id
        ):
            raise ValueError(
                f"Stale version write: base_version_id {base_version_id} does not match current version {latest_version.id}"
            )

        base_content = (
            copy.deepcopy(latest_version.content_json)
            if latest_version
            else {"type": "doc", "content": []}
        )

        mutated_content = self._apply_operations(
            base_content=base_content,
            operations=operations,
        )

        return draft_repository.create_new_version(
            db=db,
            draft=draft,
            content_json=mutated_content,
            base_version_id=base_version_id,
            created_by_type="agent" if created_by_id == "writer_agent" else "human",
            created_by_id=created_by_id,
            change_summary=change_summary or f"Applied {len(operations)} document operations",
        )

    @staticmethod
    def _apply_operations(
        base_content: dict,
        operations: list[DocumentOperation],
    ) -> dict:
        """Applies atomic operations onto structured Tiptap content blocks."""
        content_blocks = base_content.get("content", [])
        if not isinstance(content_blocks, list):
            content_blocks = []

        for op in operations:
            block = {
                "type": "paragraph",
                "attrs": {
                    "position": op.position,
                    "evidence_span_ids": [str(sid) for sid in op.evidence_span_ids],
                },
                "content": [
                    {
                        "type": "text",
                        "text": op.text,
                    }
                ]
                if op.text
                else [],
            }

            if op.type == "insert_paragraph" or op.type == "append_section":
                content_blocks.append(block)
            elif op.type == "replace_block":
                replaced = False
                for idx, existing in enumerate(content_blocks):
                    attrs = existing.get("attrs", {}) if isinstance(existing, dict) else {}
                    if attrs.get("position") == op.position or attrs.get("id") == op.position:
                        block["attrs"] = {
                            **attrs,
                            "position": op.position,
                            "evidence_span_ids": [str(sid) for sid in op.evidence_span_ids],
                        }
                        content_blocks[idx] = block
                        replaced = True
                        break
                if not replaced:
                    content_blocks.append(block)
            elif op.type == "delete_block":
                content_blocks = [
                    b
                    for b in content_blocks
                    if not (
                        isinstance(b, dict) and b.get("attrs", {}).get("position") == op.position
                    )
                ]

        base_content["content"] = content_blocks
        return base_content


draft_service = DraftService()
