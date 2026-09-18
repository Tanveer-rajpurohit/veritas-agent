import sys
from sqlalchemy import text

from app.db.base import Base
from app.models import EvidenceSpan, Source, SourceChunk, SourcePage, SourceVersion  # noqa: F401
from app.db.session import engine


def init_db() -> None:
    """
    Initializes PostgreSQL database:
    1. Installs the pgvector extension if not already present.
    2. Creates all registered SQLAlchemy models and tables (sources, versions, pages, chunks, evidence_spans).
    """
    print("[Veritas DB] Connecting to PostgreSQL...")
    with engine.connect() as conn:
        print("[Veritas DB] Ensuring pgvector extension exists...")
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        conn.commit()
        print("[Veritas DB] pgvector extension verified.")

    print("[Veritas DB] Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("[Veritas DB] All tables created successfully:")
    for table_name in Base.metadata.tables.keys():
        print(f"  - {table_name}")


if __name__ == "__main__":
    try:
        init_db()
        print("[Veritas DB] Database initialization completed successfully.")
    except Exception as exc:
        print(f"[Veritas DB ERROR] Failed to initialize database: {exc}", file=sys.stderr)
        sys.exit(1)
