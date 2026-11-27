from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.matters import Matter, User


def test_matter_model_creation_and_defaults() -> None:
    # Use isolated SQLite in-memory database for testing the model
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(email="test@example.com", password_hash="hashed")
        session.add(user)
        session.commit()
        session.refresh(user)

        new_matter = Matter(
            title="State Bank of India v. Monnet Ispat & Energy Ltd",
            court="NCLT Kolkata",
            case_number="CP (IB) No. 169/KB/2017",
            created_by=user.id,
        )
        session.add(new_matter)
        session.commit()
        session.refresh(new_matter)

        # Verify auto-generated fields
        assert new_matter.id is not None
        assert new_matter.created_by == user.id
        assert new_matter.matter_type == "Insolvency (IBC)"
        assert new_matter.stage == "Drafting"
        assert new_matter.created_at is not None
        assert new_matter.updated_at is not None

        # Query back from DB
        stmt = select(Matter).where(
            Matter.title == "State Bank of India v. Monnet Ispat & Energy Ltd"
        )
        retrieved = session.scalars(stmt).one()
        assert retrieved.id == new_matter.id
        assert retrieved.court == "NCLT Kolkata"
