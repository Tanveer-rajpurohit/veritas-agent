import contextlib

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db


def test_get_db_session_yields_and_closes() -> None:
    generator = get_db()
    db: Session = next(generator)
    assert isinstance(db, Session)

    result = db.execute(text("SELECT 1")).scalar()
    assert result == 1

    with contextlib.suppress(StopIteration):
        next(generator)
