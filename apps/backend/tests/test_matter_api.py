from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.services.sources.embeddings import embedding_service
from app.services.sources.storage import storage_service

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
    monkeypatch.setattr(settings, "AUTH_SECRET", "test-secret-that-is-at-least-32-bytes-long")
    client = TestClient(app)
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "owner@example.com", "password": "correct-horse-battery"},
    )
    assert response.status_code == 201
    client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    return client


def test_matter_requires_authentication(client: TestClient) -> None:
    client.headers.pop("Authorization")
    assert client.get("/api/v1/matters/").status_code == 401


def test_login_and_invalid_token(client: TestClient) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@example.com", "password": "correct-horse-battery"},
    )
    assert response.status_code == 200
    assert response.json()["token_type"] == "bearer"
    client.headers["Authorization"] = "Bearer broken.token"
    assert client.get("/api/v1/matters/").status_code == 401


def test_matter_isolation(client: TestClient) -> None:
    matter_id = client.post("/api/v1/matters/", json={"title": "Private"}).json()["id"]
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "other@example.com", "password": "another-correct-password"},
    )
    client.headers["Authorization"] = f"Bearer {response.json()['access_token']}"
    assert client.get("/api/v1/matters/").json() == []
    assert client.get(f"/api/v1/matters/{matter_id}").status_code == 404
    assert (
        client.patch(f"/api/v1/matters/{matter_id}", json={"title": "Changed"}).status_code == 404
    )
    assert client.delete(f"/api/v1/matters/{matter_id}").status_code == 404


def test_upload_and_page_are_matter_scoped(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    monkeypatch.setattr(storage_service, "base_path", tmp_path)
    monkeypatch.setattr(
        embedding_service,
        "embed_chunks",
        lambda texts: [[0.1] * 384 for _ in texts],
    )
    matter_id = client.post("/api/v1/matters/", json={"title": "Evidence"}).json()["id"]
    response = client.post(
        f"/api/v1/matters/{matter_id}/uploads",
        files={"file": ("record.txt", b"The amount due is INR 12 lakh.", "text/plain")},
    )
    assert response.status_code == 201, response.text
    source_id = response.json()["id"]
    page = client.get(f"/api/v1/sources/{source_id}/pages/1")
    assert page.status_code == 200
    assert page.json()["text"] == "The amount due is INR 12 lakh."

    other = client.post(
        "/api/v1/auth/register",
        json={"email": "source-reader@example.com", "password": "another-correct-password"},
    )
    client.headers["Authorization"] = f"Bearer {other.json()['access_token']}"
    assert client.get(f"/api/v1/sources/{source_id}").status_code == 404
    assert client.get(f"/api/v1/sources/{source_id}/pages/1").status_code == 404
    assert client.get(f"/api/v1/matters/{matter_id}/sources").status_code == 404


def test_create_matter_success(client: TestClient) -> None:
    payload = {
        "title": "State Bank of India v. Monnet Ispat & Energy Ltd",
        "case_number": "CP (IB) No. 169/KB/2017",
        "court": "NCLT Kolkata",
        "matter_type": "Insolvency (IBC)",
        "stage": "Drafting",
    }

    response = client.post("/api/v1/matters/", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "State Bank of India v. Monnet Ispat & Energy Ltd"
    assert data["court"] == "NCLT Kolkata"
    assert "id" in data
    assert "created_at" in data
    assert "updated_at" in data


def test_create_matter_validation_failure(client: TestClient) -> None:
    response = client.post("/api/v1/matters/", json={"title": "   "})
    assert response.status_code == 422


def test_get_matter_by_id(client: TestClient) -> None:
    create_res = client.post("/api/v1/matters/", json={"title": "Test Matter"})
    matter_id = create_res.json()["id"]

    response = client.get(f"/api/v1/matters/{matter_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == matter_id
    assert data["title"] == "Test Matter"


def test_get_matter_not_found(client: TestClient) -> None:
    response = client.get(f"/api/v1/matters/{uuid4()}")
    assert response.status_code == 404
    assert response.json() == {"detail": "Matter not found"}


def test_list_matters(client: TestClient) -> None:
    client.post("/api/v1/matters/", json={"title": "Matter One"})
    client.post("/api/v1/matters/", json={"title": "Matter Two"})

    response = client.get("/api/v1/matters/")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 2
    titles = [item["title"] for item in items]
    assert "Matter One" in titles
    assert "Matter Two" in titles


def test_update_matter_success(client: TestClient) -> None:
    create_res = client.post(
        "/api/v1/matters/",
        json={
            "title": "Original Title",
            "court": "Delhi High Court",
            "stage": "Drafting",
        },
    )
    matter_id = create_res.json()["id"]

    update_res = client.patch(
        f"/api/v1/matters/{matter_id}",
        json={"title": "Updated Title", "stage": "Filed"},
    )
    assert update_res.status_code == 200
    updated_data = update_res.json()
    assert updated_data["title"] == "Updated Title"
    assert updated_data["stage"] == "Filed"
    assert updated_data["court"] == "Delhi High Court"


def test_update_matter_not_found(client: TestClient) -> None:
    response = client.patch(f"/api/v1/matters/{uuid4()}", json={"title": "New Title"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Matter not found"}


def test_update_matter_validation_failure(client: TestClient) -> None:
    create_res = client.post("/api/v1/matters/", json={"title": "Valid Matter"})
    matter_id = create_res.json()["id"]

    # Reject blank string
    response = client.patch(f"/api/v1/matters/{matter_id}", json={"title": "   "})
    assert response.status_code == 422

    # Reject extra unknown fields
    response_extra = client.patch(f"/api/v1/matters/{matter_id}", json={"malicious": "value"})
    assert response_extra.status_code == 422


def test_delete_matter_success(client: TestClient) -> None:
    create_res = client.post("/api/v1/matters/", json={"title": "To Delete"})
    matter_id = create_res.json()["id"]

    delete_res = client.delete(f"/api/v1/matters/{matter_id}")
    assert delete_res.status_code == 204

    get_res = client.get(f"/api/v1/matters/{matter_id}")
    assert get_res.status_code == 404


def test_delete_matter_not_found(client: TestClient) -> None:
    response = client.delete(f"/api/v1/matters/{uuid4()}")
    assert response.status_code == 404
    assert response.json() == {"detail": "Matter not found"}
