"""add_auth_sessions_and_tokens

Revision ID: a3d9d2707c30
Revises: 809c063ac489
Create Date: 2026-09-20 00:02:23.775010

Migration Notes:
- Adds display_name, email_verified_at, and is_active to users.
- Creates user_sessions and action_tokens tables.
- IMPORTANT FOR EXISTING USERS: For users existing before this migration,
  email_verified_at remains NULL. Veritas intentionally does not silently claim
  prior accounts were verified. Unverified accounts attempting login will receive
  HTTP 403 EMAIL_NOT_VERIFIED and must complete verification via /api/v1/auth/email/resend
  or an authorized administrative operational migration.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a3d9d2707c30"
down_revision: str | Sequence[str] | None = "809c063ac489"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("users", sa.Column("display_name", sa.String(length=255), nullable=True))
    op.add_column(
        "users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
    )
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("password_hash", existing_type=sa.String(length=256), nullable=True)

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ip_hash", sa.String(length=64), nullable=True),
        sa.Column("user_agent_hash", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_sessions_user_id"), "user_sessions", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_user_sessions_token_hash"), "user_sessions", ["token_hash"], unique=True
    )

    op.create_table(
        "action_tokens",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("purpose", sa.String(length=32), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_action_tokens_user_id"), "action_tokens", ["user_id"], unique=False)
    op.create_index(
        op.f("ix_action_tokens_token_hash"), "action_tokens", ["token_hash"], unique=True
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_action_tokens_token_hash"), table_name="action_tokens")
    op.drop_index(op.f("ix_action_tokens_user_id"), table_name="action_tokens")
    op.drop_table("action_tokens")
    op.drop_index(op.f("ix_user_sessions_token_hash"), table_name="user_sessions")
    op.drop_index(op.f("ix_user_sessions_user_id"), table_name="user_sessions")
    op.drop_table("user_sessions")
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column("password_hash", existing_type=sa.String(length=256), nullable=False)
        batch_op.drop_column("is_active")
        batch_op.drop_column("email_verified_at")
        batch_op.drop_column("display_name")
