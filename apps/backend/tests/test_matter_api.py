from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Create in-memory SQLite engine for API tests
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
def client() -> TestClient:
    return TestClient(app)


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
