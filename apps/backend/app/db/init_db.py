from sqlalchemy import text

import app.models  # noqa: F401
from app.db.base import Base
from app.db.session import engine


def init_db() -> None:
    """
    Initializes PostgreSQL database:
    1. Installs the pgvector extension if not already present.
    2. Creates all registered SQLAlchemy models and tables (sources, versions, pages, chunks, evidence_spans).
    """
    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
