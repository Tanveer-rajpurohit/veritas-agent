from collections.abc import Generator
from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.auth import User

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_test_db() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=test_engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "console")
    client = TestClient(app)
    creds = {"email": "lawyer@example.com", "password": "secure-password-1234"}
    response = client.post("/api/v1/auth/register", json=creds)
    assert response.status_code == 201

    db = TestingSessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == creds["email"]))
        assert user is not None
        user.email_verified_at = datetime.now(UTC)
        db.commit()
    finally:
        db.close()

    login_res = client.post("/api/v1/auth/login", json=creds)
    assert login_res.status_code == 200
    assert settings.SESSION_COOKIE_NAME in client.cookies
    return client


def test_list_documents_empty_and_populated(client: TestClient) -> None:
    matter = client.post("/api/v1/matters/", json={"title": "Matter A"}).json()
    matter_id = matter["id"]

    res_empty = client.get(f"/api/v1/matters/{matter_id}/documents")
    assert res_empty.status_code == 200
    assert res_empty.json() == []

    client.post(f"/api/v1/matters/{matter_id}/documents", json={"title": "Petition"})
    client.post(f"/api/v1/matters/{matter_id}/documents", json={"title": "Rejoinder"})

    res_populated = client.get(f"/api/v1/matters/{matter_id}/documents")
    assert res_populated.status_code == 200
    docs = res_populated.json()
    assert len(docs) == 2
    titles = [d["title"] for d in docs]
    assert "Petition" in titles
    assert "Rejoinder" in titles


def test_list_documents_matter_not_found(client: TestClient) -> None:
    fake_id = uuid4()
    response = client.get(f"/api/v1/matters/{fake_id}/documents")
    assert response.status_code == 404


def test_update_document_title_success(client: TestClient) -> None:
    matter = client.post("/api/v1/matters/", json={"title": "Matter B"}).json()
    doc = client.post(
        f"/api/v1/matters/{matter['id']}/documents", json={"title": "Old Draft Title"}
    ).json()

    update_res = client.patch(f"/api/v1/documents/{doc['id']}", json={"title": "New Final Brief"})
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["title"] == "New Final Brief"
    assert updated["id"] == doc["id"]

    fetch_res = client.get(f"/api/v1/documents/{doc['id']}")
    assert fetch_res.status_code == 200
    assert fetch_res.json()["title"] == "New Final Brief"


def test_update_document_title_validation_failure(client: TestClient) -> None:
    matter = client.post("/api/v1/matters/", json={"title": "Matter C"}).json()
    doc = client.post(
        f"/api/v1/matters/{matter['id']}/documents", json={"title": "Initial Title"}
    ).json()

    empty_res = client.patch(f"/api/v1/documents/{doc['id']}", json={"title": "   "})
    assert empty_res.status_code == 422

    extra_res = client.patch(
        f"/api/v1/documents/{doc['id']}", json={"title": "Ok", "unauthorized_field": "test"}
    )
    assert extra_res.status_code == 422


def test_delete_document_success(client: TestClient) -> None:
    matter = client.post("/api/v1/matters/", json={"title": "Matter D"}).json()
    doc = client.post(
        f"/api/v1/matters/{matter['id']}/documents", json={"title": "Temporary Brief"}
    ).json()

    del_res = client.delete(f"/api/v1/documents/{doc['id']}")
    assert del_res.status_code == 200

    get_res = client.get(f"/api/v1/documents/{doc['id']}")
    assert get_res.status_code == 404

    list_res = client.get(f"/api/v1/matters/{matter['id']}/documents")
    assert list_res.status_code == 200
    assert list_res.json() == []


def test_list_document_versions(client: TestClient) -> None:
    matter = client.post("/api/v1/matters/", json={"title": "Matter E"}).json()
    doc = client.post(
        f"/api/v1/matters/{matter['id']}/documents", json={"title": "Versioned Brief"}
    ).json()

    versions_res = client.get(f"/api/v1/documents/{doc['id']}/versions")
    assert versions_res.status_code == 200
    versions = versions_res.json()
    assert len(versions) == 1
    assert versions[0]["version_no"] == 1

    content = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Paragraph in version 2."}],
            }
        ],
    }
    client.post(
        f"/api/v1/documents/{doc['id']}/versions",
        headers={"Idempotency-Key": "save-v2-test"},
        json={
            "base_version_id": doc["current_version_id"],
            "schema_version": 1,
            "content": content,
            "change_summary": "Added paragraph",
        },
    )

    versions_res2 = client.get(f"/api/v1/documents/{doc['id']}/versions")
    assert versions_res2.status_code == 200
    versions2 = versions_res2.json()
    assert len(versions2) == 2
    assert versions2[0]["version_no"] == 2
    assert versions2[1]["version_no"] == 1
