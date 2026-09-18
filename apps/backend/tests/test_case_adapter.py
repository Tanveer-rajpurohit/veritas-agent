from unittest.mock import MagicMock

import httpx
import pytest

from app.core.config import settings
from app.services.legal_sources.ecourts_india import ECourtsIndiaAdapter
from app.services.legal_sources.indian_kanoon import IndianKanoonAdapter


def test_ecourts_case_search_returns_candidates() -> None:
    mock_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.headers = {}
    mock_resp.content = b"{}"
    mock_resp.json.return_value = {
        "results": [
            {
                "ref": "SCIN010125642009",
                "title": "Innoventive Industries Ltd. v. ICICI Bank",
                "court": "SC",
                "url": "https://example.invalid/order.pdf",
            }
        ]
    }
    mock_client.__enter__.return_value.get.return_value = mock_resp
    adapter = ECourtsIndiaAdapter(client=mock_client)
    results = adapter.search_cases(query="default under section 7 IBC")
    assert results.provider == ECourtsIndiaAdapter.PROVIDER_NAME
    assert len(results.candidates) >= 1
    assert (
        "Innoventive" in results.candidates[0].title
        or "Swiss Ribbons" in results.candidates[0].title
    )


def test_ecourts_fetch_case_rejects_candidate_only_record() -> None:
    adapter = ECourtsIndiaAdapter()
    with pytest.raises(ValueError, match="not full judgment text"):
        adapter.fetch_case(candidate_id="SCIN010125642009")


def test_indian_kanoon_missing_token_raises_configuration_error(monkeypatch) -> None:
    monkeypatch.setattr(settings, "INDIAN_KANOON_API_TOKEN", "")
    adapter = IndianKanoonAdapter()
    with pytest.raises(ValueError, match="INDIAN_KANOON_API_TOKEN"):
        adapter.search_cases("some query")


def test_indian_kanoon_search_with_mocked_client(monkeypatch) -> None:
    monkeypatch.setattr(settings, "INDIAN_KANOON_API_TOKEN", "mock-secret-token")

    mock_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.headers = {}
    mock_resp.content = b"{}"
    mock_resp.json.return_value = {
        "docs": [
            {
                "tid": "12345",
                "title": "Sample Judicial Precedent",
                "docsource": "Supreme Court of India",
                "publishdate": "2020-01-01",
                "citation": "2020 INSC 1",
            }
        ]
    }
    mock_client.__enter__.return_value.post.return_value = mock_resp
    mock_client.__enter__.return_value.get.return_value = mock_resp

    adapter = IndianKanoonAdapter(client=mock_client)
    res = adapter.search_cases("contract default", limit=2)

    assert res.provider == "Indian Kanoon"
    assert len(res.candidates) == 1
    assert res.candidates[0].candidate_id == "ik_12345"
    assert res.candidates[0].citation == "2020 INSC 1"
