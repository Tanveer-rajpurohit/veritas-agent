import os
from pathlib import Path
from urllib.parse import urlparse, urlunparse

import pytest
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text

import app.models  # noqa: F401
from alembic import command
from app.core.config import settings
from app.db.base import Base


def test_baseline_migration_round_trip(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "migration.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    monkeypatch.setattr(settings, "DATABASE_URL", database_url)
    config = Config(Path(__file__).parents[1] / "alembic.ini")

    command.upgrade(config, "head")
    engine = create_engine(database_url)
    assert set(Base.metadata.tables) <= set(inspect(engine).get_table_names())

    command.downgrade(config, "base")
    command.upgrade(config, "head")
    command.check(config)


def test_matter_authorization_migration_rejects_unowned_existing_matter(
    tmp_path, monkeypatch
) -> None:
    import uuid
    from datetime import UTC, datetime

    database_path = tmp_path / "unowned-matter.db"
    database_url = f"sqlite:///{database_path.as_posix()}"
    monkeypatch.setattr(settings, "DATABASE_URL", database_url)
    config = Config(Path(__file__).parents[1] / "alembic.ini")

    command.upgrade(config, "a3d9d2707c30")
    engine = create_engine(database_url)
    now = datetime.now(UTC)
    with engine.begin() as conn:
        user_id = uuid.uuid4().hex
        matter_id = uuid.uuid4().hex
        conn.execute(
            text(
                "INSERT INTO users "
                "(id, email, password_hash, is_active, created_at, updated_at) "
                "VALUES (:id, :email, :password_hash, 1, :created_at, :updated_at)"
            ),
            {
                "id": user_id,
                "email": "unowned@example.com",
                "password_hash": "argon2-test",
                "created_at": now,
                "updated_at": now,
            },
        )
        conn.execute(
            text(
                "INSERT INTO matters "
                "(id, title, matter_type, stage, created_at, updated_at) "
                "VALUES (:id, :title, :matter_type, :stage, :created_at, :updated_at)"
            ),
            {
                "id": matter_id,
                "title": "Unowned private matter",
                "matter_type": "Insolvency (IBC)",
                "stage": "Drafting",
                "created_at": now,
                "updated_at": now,
            },
        )
    engine.dispose()

    with pytest.raises(RuntimeError, match="without an owner membership"):
        command.upgrade(config, "head")


def test_postgresql_migration_lifecycle(monkeypatch) -> None:
    test_database_url = os.getenv("TEST_DATABASE_URL")
    if not test_database_url:
        pytest.fail(
            "TEST_DATABASE_URL is required for the destructive PostgreSQL migration lifecycle test."
        )

    import uuid
    from datetime import UTC, datetime

    db_name = f"veritas_mig_test_{uuid.uuid4().hex}"
    parsed = urlparse(test_database_url)
    disposable_db_url = urlunparse(parsed._replace(path=f"/{db_name}"))

    maintenance_engine = create_engine(test_database_url, isolation_level="AUTOCOMMIT")
    created_database = False

    try:
        with maintenance_engine.connect() as conn:
            conn.execute(text(f"CREATE DATABASE {db_name}"))
        created_database = True

        monkeypatch.setattr(settings, "DATABASE_URL", disposable_db_url)
        config = Config(Path(__file__).parents[1] / "alembic.ini")
        config.set_main_option("sqlalchemy.url", disposable_db_url)

        # 1. Empty database -> head
        command.upgrade(config, "head")
        command.check(config)

        # 2. pgvector extension and vector(384) column
        test_engine = create_engine(disposable_db_url)
        with test_engine.connect() as conn:
            ext = conn.execute(
                text("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            ).scalar()
            assert ext == "vector"

            typ = conn.execute(
                text(
                    "SELECT format_type(atttypid, atttypmod) FROM pg_attribute "
                    "WHERE attrelid = 'source_chunks'::regclass AND attname = 'embedding'"
                )
            ).scalar()
            assert typ == "vector(384)"
        test_engine.dispose()

        # 3. Downgrade / upgrade cycle
        command.downgrade(config, "base")
        test_engine = create_engine(disposable_db_url)
        assert "matters" not in inspect(test_engine).get_table_names()
        test_engine.dispose()

        command.upgrade(config, "head")
        test_engine = create_engine(disposable_db_url)
        assert "matters" in inspect(test_engine).get_table_names()
        test_engine.dispose()
        command.check(config)

        # 4. Simulated b38381765488 prior baseline with existing user row -> current head
        command.downgrade(config, "b8e014bf7f15")
        test_engine = create_engine(disposable_db_url)
        created_time = datetime(2026, 9, 18, 12, 0, 0, tzinfo=UTC)
        user_id = uuid.uuid4()
        matter_id = uuid.uuid4()
        with test_engine.connect() as conn:
            conn.execute(
                text(
                    "INSERT INTO users (id, email, password_hash, created_at) "
                    "VALUES (:id, :email, :pw, :created)"
                ),
                {
                    "id": user_id,
                    "email": "prior_baseline_user@veritas.in",
                    "pw": "argon2_simulated_hash",
                    "created": created_time,
                },
            )
            conn.execute(
                text(
                    "INSERT INTO matters "
                    "(id, title, matter_type, stage, created_at, updated_at) "
                    "VALUES (:id, :title, :matter_type, :stage, :created, :created)"
                ),
                {
                    "id": matter_id,
                    "title": "Existing owned matter",
                    "matter_type": "Insolvency (IBC)",
                    "stage": "Drafting",
                    "created": created_time,
                },
            )
            conn.execute(
                text(
                    "INSERT INTO matter_members (matter_id, user_id, role) "
                    "VALUES (:matter_id, :user_id, 'owner')"
                ),
                {"matter_id": matter_id, "user_id": user_id},
            )
            conn.commit()

            # Simulate prior baseline stamp
            conn.execute(text("UPDATE alembic_version SET version_num = 'b38381765488'"))
            conn.commit()
            current_ver = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            assert current_ver == "b38381765488"

            # Apply safe supported transition
            conn.execute(
                text(
                    "UPDATE alembic_version SET version_num = 'b8e014bf7f15' "
                    "WHERE version_num = 'b38381765488'"
                )
            )
            conn.commit()
        test_engine.dispose()

        # Upgrade to head (executing 809c063ac489 with existing user row)
        command.upgrade(config, "head")
        test_engine = create_engine(disposable_db_url)
        with test_engine.connect() as conn:
            row = (
                conn.execute(
                    text(
                        "SELECT id, email, updated_at, full_name, phone_number, law_firm "
                        "FROM users WHERE id = :id"
                    ),
                    {"id": user_id},
                )
                .mappings()
                .one()
            )
            assert row["email"] == "prior_baseline_user@veritas.in"
            assert row["updated_at"] == created_time
            assert row["full_name"] is None
            assert row["phone_number"] is None
            assert row["law_firm"] is None

            matter_creator = conn.execute(
                text("SELECT created_by FROM matters WHERE id = :id"),
                {"id": matter_id},
            ).scalar_one()
            assert matter_creator == user_id
            member = (
                conn.execute(
                    text(
                        "SELECT role, created_by, created_at FROM matter_members "
                        "WHERE matter_id = :matter_id AND user_id = :user_id"
                    ),
                    {"matter_id": matter_id, "user_id": user_id},
                )
                .mappings()
                .one()
            )
            assert member["role"] == "owner"
            assert member["created_by"] == user_id
            assert member["created_at"] is not None

            # Verify updated_at is NOT NULL
            is_nullable = conn.execute(
                text(
                    "SELECT is_nullable FROM information_schema.columns "
                    "WHERE table_name = 'users' AND column_name = 'updated_at'"
                )
            ).scalar()
            assert is_nullable == "NO"
        test_engine.dispose()

        # 5. Verify downgrade and re-upgrade on data
        command.downgrade(config, "b8e014bf7f15")
        test_engine = create_engine(disposable_db_url)
        with test_engine.connect() as conn:
            row = (
                conn.execute(
                    text("SELECT id, email FROM users WHERE id = :id"),
                    {"id": user_id},
                )
                .mappings()
                .one()
            )
            assert row["email"] == "prior_baseline_user@veritas.in"
            assert "updated_at" not in [
                c["name"] for c in inspect(test_engine).get_columns("users")
            ]
        test_engine.dispose()

        command.upgrade(config, "head")
        test_engine = create_engine(disposable_db_url)
        with test_engine.connect() as conn:
            row = (
                conn.execute(
                    text("SELECT id, email, updated_at FROM users WHERE id = :id"),
                    {"id": user_id},
                )
                .mappings()
                .one()
            )
            assert row["email"] == "prior_baseline_user@veritas.in"
            assert row["updated_at"] == created_time
        test_engine.dispose()
        command.check(config)

    finally:
        try:
            if created_database:
                with maintenance_engine.connect() as conn:
                    conn.execute(text(f"DROP DATABASE IF EXISTS {db_name} WITH (FORCE)"))
        finally:
            maintenance_engine.dispose()
