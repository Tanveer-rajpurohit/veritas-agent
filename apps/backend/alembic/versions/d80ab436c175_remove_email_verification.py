"""Remove the unused email verification state.

Revision ID: d80ab436c175
Revises: f4c2b19a8e61
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d80ab436c175"
down_revision: str | Sequence[str] | None = "f4c2b19a8e61"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("users", "email_verified_at")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
