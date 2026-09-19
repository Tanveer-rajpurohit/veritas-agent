from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db.base import Base
from app.models.drafts import Draft
from app.models.matters import Matter, User


def test_draft_model_creation_and_defaults() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        user = User(email="author@example.com", password_hash="hashed")
        session.add(user)
        session.commit()
        session.refresh(user)

        matter = Matter(title="SBI v. Monnet", created_by=user.id)
        session.add(matter)
        session.commit()
        session.refresh(matter)

        draft = Draft(
            matter_id=matter.id,
            title="IBC Section 7 Application Brief",
            content_json={"type": "doc", "content": [{"type": "paragraph", "text": "Draft body"}]},
        )
        session.add(draft)
        session.commit()
        session.refresh(draft)

        assert draft.id is not None
        assert draft.matter_id == matter.id
        assert draft.version_no == 1
        assert draft.kind == "brief"
        assert draft.content_json == {
            "type": "doc",
            "content": [{"type": "paragraph", "text": "Draft body"}],
        }

        stmt = select(Draft).where(Draft.matter_id == matter.id)
        retrieved = session.scalars(stmt).one()
        assert retrieved.id == draft.id
        assert retrieved.title == "IBC Section 7 Application Brief"
