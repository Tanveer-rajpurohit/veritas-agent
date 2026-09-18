from unittest.mock import MagicMock

import httpx
import pytest

from app.core.config import settings
from app.services.legal_sources.ecourts_india import ECourtsIndiaAdapter
from app.services.legal_sources.indian_kanoon import IndianKanoonAdapter


def test_ecourts_case_search_returns_candidates() -> None:
    adapter = ECourtsIndiaAdapter()
    results = adapter.search_cases(query="default under section 7 IBC")
    assert results.provider == ECourtsIndiaAdapter.PROVIDER_NAME
    assert len(results.candidates) >= 1
    assert (
        "Innoventive" in results.candidates[0].title
        or "Swiss Ribbons" in results.candidates[0].title
    )


def test_ecourts_fetch_case_returns_passage() -> None:
    adapter = ECourtsIndiaAdapter()
    case = adapter.fetch_case(candidate_id="ecourts_sc_2017_innoventive")
    assert "Innoventive" in case["title"]
    assert "Section 7(5)" in case["text"]
    assert case["court"] == "Supreme Court of India"


def test_indian_kanoon_missing_token_raises_configuration_error(monkeypatch) -> None:
    monkeypatch.setattr(settings, "INDIAN_KANOON_API_TOKEN", "")
    adapter = IndianKanoonAdapter()
    with pytest.raises(ValueError, match="INDIAN_KANOON_API_TOKEN is not configured"):
        adapter.search_cases("some query")


def test_indian_kanoon_search_with_mocked_client(monkeypatch) -> None:
    monkeypatch.setattr(settings, "INDIAN_KANOON_API_TOKEN", "mock-secret-token")

    mock_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 200
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
