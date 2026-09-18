"""baseline schema

Revision ID: b38381765488
Revises:
Create Date: 2026-09-18 21:26:34.539091

"""

from collections.abc import Sequence

import pgvector.sqlalchemy
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "b38381765488"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    if op.get_bind().dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "matters",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("case_number", sa.String(length=100), nullable=True),
        sa.Column("court", sa.String(length=255), nullable=True),
        sa.Column("matter_type", sa.String(length=100), nullable=False),
        sa.Column("stage", sa.String(length=100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=256), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "drafts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("matter_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("kind", sa.String(length=100), nullable=False),
        sa.Column("content_json", sa.JSON(), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["matter_id"], ["matters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_drafts_matter_id"), "drafts", ["matter_id"], unique=False)
    op.create_table(
        "matter_members",
        sa.Column("matter_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.ForeignKeyConstraint(["matter_id"], ["matters.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("matter_id", "user_id"),
    )
    op.create_table(
        "sources",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "matter_id",
            sa.Uuid(),
            nullable=True,
            comment="Matter boundary; null is reserved for curated global sources",
        ),
        sa.Column(
            "source_type",
            sa.String(length=64),
            nullable=False,
            comment="client_record, statute, rule, form, judgment, synthetic_fixture",
        ),
        sa.Column("canonical_title", sa.String(length=512), nullable=False),
        sa.Column(
            "authority_level",
            sa.String(length=64),
            nullable=False,
            comment="matter_evidence, official_primary, curated_primary, discovery_only",
        ),
        sa.Column("court", sa.String(length=256), nullable=True),
        sa.Column("case_number", sa.String(length=256), nullable=True),
        sa.Column("neutral_citation", sa.String(length=256), nullable=True),
        sa.Column("decision_date", sa.Date(), nullable=True),
        sa.Column("official_url", sa.Text(), nullable=True),
        sa.Column(
            "confidentiality",
            sa.String(length=64),
            server_default=sa.text("'private'"),
            nullable=False,
        ),
        sa.Column("is_synthetic", sa.Boolean(), server_default=sa.text("(false)"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["matter_id"], ["matters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sources_matter_id"), "sources", ["matter_id"], unique=False)
    op.create_table(
        "threads",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("matter_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(["matter_id"], ["matters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_threads_matter_id"), "threads", ["matter_id"], unique=False)
    op.create_table(
        "document_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("draft_id", sa.Uuid(), nullable=False),
        sa.Column("version_no", sa.Integer(), nullable=False),
        sa.Column("parent_version_id", sa.Uuid(), nullable=True),
        sa.Column("content_json", sa.JSON(), nullable=False),
        sa.Column("content_sha256", sa.String(length=64), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("created_by_type", sa.String(length=32), nullable=False),
        sa.Column("created_by_id", sa.String(length=128), nullable=False),
        sa.Column("change_summary", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["draft_id"], ["drafts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["parent_version_id"], ["document_versions.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("draft_id", "version_no", name="uq_draft_version_no"),
    )
    op.create_index(
        op.f("ix_document_versions_draft_id"), "document_versions", ["draft_id"], unique=False
    )
    op.create_table(
        "messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("thread_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["thread_id"], ["threads.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_messages_thread_id"), "messages", ["thread_id"], unique=False)
    op.create_table(
        "source_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_id", sa.Uuid(), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("object_key", sa.Text(), nullable=False, comment="Local path or S3 storage key"),
        sa.Column("mime_type", sa.String(length=128), nullable=False),
        sa.Column("file_sha256", sa.String(length=64), nullable=False),
        sa.Column(
            "extraction_method",
            sa.String(length=64),
            nullable=True,
            comment="pymupdf, pdfplumber, textract, etc.",
        ),
        sa.Column("extraction_version", sa.String(length=32), nullable=True),
        sa.Column(
            "extraction_status",
            sa.String(length=64),
            server_default=sa.text("'pending'"),
            nullable=False,
            comment="pending, processing, completed, failed",
        ),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column(
            "reviewed_by_human", sa.Boolean(), server_default=sa.text("(false)"), nullable=False
        ),
        sa.Column("provenance_note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["source_id"], ["sources.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_id", "file_sha256", name="uq_source_version_file"),
        sa.UniqueConstraint("source_id", "version_number", name="uq_source_version_number"),
    )
    op.create_index(
        op.f("ix_source_versions_file_sha256"), "source_versions", ["file_sha256"], unique=False
    )
    op.create_index(
        op.f("ix_source_versions_source_id"), "source_versions", ["source_id"], unique=False
    )
    op.create_table(
        "agent_runs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("matter_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("thread_id", sa.Uuid(), nullable=False),
        sa.Column("message_id", sa.Uuid(), nullable=False),
        sa.Column("agent", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("requested_action", sa.String(length=64), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=True),
        sa.Column("base_version_id", sa.Uuid(), nullable=True),
        sa.Column("source_ids", sa.JSON(), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("error_code", sa.String(length=32), nullable=True),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["base_version_id"],
            ["document_versions.id"],
        ),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["drafts.id"],
        ),
        sa.ForeignKeyConstraint(["matter_id"], ["matters.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["message_id"],
            ["messages.id"],
        ),
        sa.ForeignKeyConstraint(["thread_id"], ["threads.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "matter_id", "idempotency_key", name="uq_agent_run_key"),
    )
    op.create_index(op.f("ix_agent_runs_matter_id"), "agent_runs", ["matter_id"], unique=False)
    op.create_table(
        "document_commands",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("draft_id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=128), nullable=False),
        sa.Column("request_hash", sa.String(length=64), nullable=False),
        sa.Column("version_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["draft_id"], ["drafts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.ForeignKeyConstraint(["version_id"], ["document_versions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "draft_id", "key"),
    )
    op.create_table(
        "draft_exports",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("document_version_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("format", sa.String(length=8), nullable=False),
        sa.Column("object_key", sa.String(length=255), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["document_version_id"], ["document_versions.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "document_version_id", "idempotency_key", name="uq_draft_export_key"
        ),
    )
    op.create_index(
        op.f("ix_draft_exports_document_version_id"),
        "draft_exports",
        ["document_version_id"],
        unique=False,
    )
    op.create_table(
        "findings",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("document_version_id", sa.Uuid(), nullable=False),
        sa.Column("block_index", sa.Integer(), nullable=False),
        sa.Column("claim_text", sa.Text(), nullable=False),
        sa.Column("claim_sha256", sa.String(length=64), nullable=False),
        sa.Column("dimension", sa.String(length=32), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("method", sa.String(length=32), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("limitations", sa.JSON(), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("stale_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["document_version_id"], ["document_versions.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_findings_document_version_id"), "findings", ["document_version_id"], unique=False
    )
    op.create_table(
        "source_pages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_version_id", sa.Uuid(), nullable=False),
        sa.Column("page_number", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("text_sha256", sa.String(length=64), nullable=False),
        sa.Column("extraction_confidence", sa.Float(), nullable=True),
        sa.Column("width_points", sa.Float(), nullable=True),
        sa.Column("height_points", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["source_version_id"], ["source_versions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_version_id", "page_number", name="uq_source_page_number"),
    )
    op.create_index(
        op.f("ix_source_pages_source_version_id"),
        "source_pages",
        ["source_version_id"],
        unique=False,
    )
    op.create_table(
        "agent_events",
        sa.Column("run_id", sa.Uuid(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["run_id"], ["agent_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("run_id", "sequence"),
    )
    op.create_table(
        "finding_resolutions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("finding_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False),
        sa.Column("action", sa.String(length=24), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["finding_id"], ["findings.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id", "finding_id", "idempotency_key", name="uq_finding_resolution_key"
        ),
    )
    op.create_index(
        op.f("ix_finding_resolutions_finding_id"),
        "finding_resolutions",
        ["finding_id"],
        unique=False,
    )
    op.create_table(
        "source_chunks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_version_id", sa.Uuid(), nullable=False),
        sa.Column("page_id", sa.Uuid(), nullable=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("start_offset", sa.Integer(), nullable=False),
        sa.Column("end_offset", sa.Integer(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column(
            "heading_path",
            sa.JSON().with_variant(postgresql.ARRAY(sa.String()), "postgresql"),
            nullable=True,
        ),
        sa.Column("embedding_model", sa.String(length=128), nullable=False),
        sa.Column("embedding", pgvector.sqlalchemy.vector.VECTOR(dim=384), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["page_id"], ["source_pages.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["source_version_id"], ["source_versions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("source_version_id", "chunk_index", name="uq_source_chunk_index"),
    )
    op.create_index(op.f("ix_source_chunks_page_id"), "source_chunks", ["page_id"], unique=False)
    op.create_index(
        op.f("ix_source_chunks_source_version_id"),
        "source_chunks",
        ["source_version_id"],
        unique=False,
    )
    op.create_table(
        "evidence_spans",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_version_id", sa.Uuid(), nullable=False),
        sa.Column("page_id", sa.Uuid(), nullable=False),
        sa.Column("chunk_id", sa.Uuid(), nullable=False),
        sa.Column("start_offset", sa.Integer(), nullable=False),
        sa.Column("end_offset", sa.Integer(), nullable=False),
        sa.Column("quoted_text", sa.Text(), nullable=False),
        sa.Column("quoted_text_sha256", sa.String(length=64), nullable=False),
        sa.Column(
            "created_by",
            sa.String(length=128),
            nullable=False,
            comment="writer_agent, user, evaluator, etc.",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["chunk_id"], ["source_chunks.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["page_id"], ["source_pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["source_version_id"], ["source_versions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("chunk_id", name="uq_evidence_span_chunk"),
    )
    op.create_index(
        op.f("ix_evidence_spans_chunk_id"), "evidence_spans", ["chunk_id"], unique=False
    )
    op.create_index(op.f("ix_evidence_spans_page_id"), "evidence_spans", ["page_id"], unique=False)
    op.create_index(
        op.f("ix_evidence_spans_source_version_id"),
        "evidence_spans",
        ["source_version_id"],
        unique=False,
    )
    op.create_table(
        "finding_evidence",
        sa.Column("finding_id", sa.Uuid(), nullable=False),
        sa.Column("evidence_span_id", sa.Uuid(), nullable=False),
        sa.Column("relation", sa.String(length=24), nullable=False),
        sa.ForeignKeyConstraint(["evidence_span_id"], ["evidence_spans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["finding_id"], ["findings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("finding_id", "evidence_span_id"),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("finding_evidence")
    op.drop_index(op.f("ix_evidence_spans_source_version_id"), table_name="evidence_spans")
    op.drop_index(op.f("ix_evidence_spans_page_id"), table_name="evidence_spans")
    op.drop_index(op.f("ix_evidence_spans_chunk_id"), table_name="evidence_spans")
    op.drop_table("evidence_spans")
    op.drop_index(op.f("ix_source_chunks_source_version_id"), table_name="source_chunks")
    op.drop_index(op.f("ix_source_chunks_page_id"), table_name="source_chunks")
    op.drop_table("source_chunks")
    op.drop_index(op.f("ix_finding_resolutions_finding_id"), table_name="finding_resolutions")
    op.drop_table("finding_resolutions")
    op.drop_table("agent_events")
    op.drop_index(op.f("ix_source_pages_source_version_id"), table_name="source_pages")
    op.drop_table("source_pages")
    op.drop_index(op.f("ix_findings_document_version_id"), table_name="findings")
    op.drop_table("findings")
    op.drop_index(op.f("ix_draft_exports_document_version_id"), table_name="draft_exports")
    op.drop_table("draft_exports")
    op.drop_table("document_commands")
    op.drop_index(op.f("ix_agent_runs_matter_id"), table_name="agent_runs")
    op.drop_table("agent_runs")
    op.drop_index(op.f("ix_source_versions_source_id"), table_name="source_versions")
    op.drop_index(op.f("ix_source_versions_file_sha256"), table_name="source_versions")
    op.drop_table("source_versions")
    op.drop_index(op.f("ix_messages_thread_id"), table_name="messages")
    op.drop_table("messages")
    op.drop_index(op.f("ix_document_versions_draft_id"), table_name="document_versions")
    op.drop_table("document_versions")
    op.drop_index(op.f("ix_threads_matter_id"), table_name="threads")
    op.drop_table("threads")
    op.drop_index(op.f("ix_sources_matter_id"), table_name="sources")
    op.drop_table("sources")
    op.drop_table("matter_members")
    op.drop_index(op.f("ix_drafts_matter_id"), table_name="drafts")
    op.drop_table("drafts")
    op.drop_table("users")
    op.drop_table("matters")
