"""add_matter_authorization

Revision ID: cb879d30a01a
Revises: a3d9d2707c30
Create Date: 2026-09-20 01:11:50.693235

Migration Notes:
- Adds created_by (UUID FK users.id RESTRICT) to matters table.
- Adds created_at and created_by (UUID FK users.id SET NULL) to matter_members.
- Adds check constraint ck_matter_members_role ensuring role is in
  ('owner', 'editor', 'reviewer', 'viewer').
- Updates matter_members_user_id_fkey to ondelete CASCADE.
- Backfills only from an existing owner membership and fails closed when an
  existing matter has no owner. It never invents ownership.
- Updates matter_members.user_id to ON DELETE CASCADE.
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "cb879d30a01a"
down_revision: str | Sequence[str] | None = "a3d9d2707c30"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add created_by to matters as nullable first for safe backfill
    op.add_column("matters", sa.Column("created_by", sa.Uuid(), nullable=True))

    # Backfill created_by for any existing matter rows:
    op.execute(
        sa.text("""
            UPDATE matters
            SET created_by = (
                SELECT user_id FROM matter_members
                WHERE matter_members.matter_id = matters.id AND matter_members.role = 'owner'
                LIMIT 1
            )
            WHERE created_by IS NULL
        """)
    )
    unowned_count = (
        op.get_bind()
        .execute(sa.text("SELECT COUNT(*) FROM matters WHERE created_by IS NULL"))
        .scalar_one()
    )
    if unowned_count:
        raise RuntimeError(
            "Cannot migrate matters without an owner membership; reset synthetic fixtures or "
            "assign explicit owners before upgrading."
        )

    with op.batch_alter_table("matters") as batch_op:
        batch_op.alter_column("created_by", existing_type=sa.Uuid(), nullable=False)
        batch_op.create_foreign_key(
            "fk_matters_created_by_users",
            "users",
            ["created_by"],
            ["id"],
            ondelete="RESTRICT",
        )

    # 2. Update matter_members
    op.add_column(
        "matter_members",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.add_column("matter_members", sa.Column("created_by", sa.Uuid(), nullable=True))

    op.execute(
        sa.text("""
            UPDATE matter_members
            SET created_by = user_id
            WHERE created_by IS NULL
        """)
    )

    with op.batch_alter_table("matter_members") as batch_op:
        batch_op.create_foreign_key(
            "fk_matter_members_created_by_users",
            "users",
            ["created_by"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_check_constraint(
            "ck_matter_members_role",
            "role IN ('owner', 'editor', 'reviewer', 'viewer')",
        )

    if op.get_bind().dialect.name == "postgresql":
        op.drop_constraint("matter_members_user_id_fkey", "matter_members", type_="foreignkey")
        op.create_foreign_key(
            "fk_matter_members_user_id_users",
            "matter_members",
            "users",
            ["user_id"],
            ["id"],
            ondelete="CASCADE",
        )
    else:
        naming_convention = {"fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"}
        with op.batch_alter_table(
            "matter_members", naming_convention=naming_convention
        ) as batch_op:
            batch_op.drop_constraint("fk_matter_members_user_id_users", type_="foreignkey")
            batch_op.create_foreign_key(
                "fk_matter_members_user_id_users",
                "users",
                ["user_id"],
                ["id"],
                ondelete="CASCADE",
            )


def downgrade() -> None:
    """Downgrade schema."""
    if op.get_bind().dialect.name == "postgresql":
        op.drop_constraint("fk_matter_members_user_id_users", "matter_members", type_="foreignkey")
        op.create_foreign_key(
            "matter_members_user_id_fkey",
            "matter_members",
            "users",
            ["user_id"],
            ["id"],
        )
    else:
        naming_convention = {"fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s"}
        with op.batch_alter_table(
            "matter_members", naming_convention=naming_convention
        ) as batch_op:
            batch_op.drop_constraint("fk_matter_members_user_id_users", type_="foreignkey")
            batch_op.create_foreign_key(
                "fk_matter_members_user_id_users", "users", ["user_id"], ["id"]
            )

    with op.batch_alter_table("matter_members") as batch_op:
        batch_op.drop_constraint("ck_matter_members_role", type_="check")
        batch_op.drop_constraint("fk_matter_members_created_by_users", type_="foreignkey")
        batch_op.drop_column("created_by")
        batch_op.drop_column("created_at")

    with op.batch_alter_table("matters") as batch_op:
        batch_op.drop_constraint("fk_matters_created_by_users", type_="foreignkey")
        batch_op.drop_column("created_by")
