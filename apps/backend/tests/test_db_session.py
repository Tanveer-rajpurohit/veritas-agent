import contextlib

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

import app.db.session as session_module
from app.db.session import get_db


def test_get_db_session_yields_and_closes(monkeypatch: pytest.MonkeyPatch) -> None:
    engine = create_engine("sqlite:///:memory:")
    monkeypatch.setattr(session_module, "SessionLocal", sessionmaker(bind=engine))
    generator = get_db()
    db: Session = next(generator)
    assert isinstance(db, Session)

    result = db.execute(text("SELECT 1")).scalar()
    assert result == 1
    assert db.in_transaction()

    with contextlib.suppress(StopIteration):
        next(generator)
    assert not db.in_transaction()
    engine.dispose()
