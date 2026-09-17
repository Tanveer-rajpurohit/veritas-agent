from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routers.matters.router import _MATTERS_STORE


@pytest.fixture(autouse=True)
def clean_matters_store() -> Generator[None, None, None]:
    _MATTERS_STORE.clear()
    yield
    _MATTERS_STORE.clear()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_create_matter_success(client: TestClient) -> None:
    payload = {
        "title": "Test",
        "case_number": "CP (IB) No. 169/KB/2017",
        "court": "Kolkata High Court",
        "matter_type": "Insolvency",
        "stage": "drafting",
    }

    response = client.post("/api/v1/matters/", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["title"] == "Test"
    assert data["court"] == "Kolkata High Court"
    assert "id" in data
    assert "created_at" in data


def test_create_matter_validation_faliure(client: TestClient) -> None:

    response = client.post("/api/v1/matters/", json={"title": " "})
    assert response.status_code == 422


def test_get_matter_by_id(client: TestClient) -> None:

    create_res = client.post("api/v1/matters/", json={"title": "Test"})
    matter_id = create_res.json()["id"]

    response = client.get(f"/api/v1/matters/{matter_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == matter_id


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
