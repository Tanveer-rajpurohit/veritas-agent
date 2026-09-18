from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

import app.models  # noqa: F401
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
