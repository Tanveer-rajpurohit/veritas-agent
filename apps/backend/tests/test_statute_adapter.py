from unittest.mock import MagicMock

import httpx
import pytest

from app.services.legal_sources.ecourts_india import ECourtsIndiaAdapter


def test_statute_adapter_provision_numbers_are_strings() -> None:
    adapter = ECourtsIndiaAdapter()
    provision = adapter.get_provision(act_key="ibc", provision="7", unit="section")
    assert isinstance(provision["provision"], str)
    assert provision["provision"] == "7"
    assert provision["unit"] == "section"
    assert "Insolvency and Bankruptcy" in provision["act_title"]


def test_statute_adapter_unit_validation() -> None:
    adapter = ECourtsIndiaAdapter()
    with pytest.raises(ValueError, match="Invalid statutory unit"):
        adapter.get_provision(act_key="ibc", provision="7", unit="clause")


def test_statute_search_returns_candidates_only() -> None:
    adapter = ECourtsIndiaAdapter()
    results = adapter.search_statutes(query="financial creditor initiation")
    assert results.provider == ECourtsIndiaAdapter.PROVIDER_NAME
    assert len(results.candidates) >= 1
    assert results.candidates[0].act_key == "ibc"
    assert results.candidates[0].provision == "7"


def test_statute_adapter_rejects_non_allowlisted_host() -> None:
    adapter = ECourtsIndiaAdapter()
    with pytest.raises(ValueError, match="Security violation"):
        adapter._validate_url_host("https://malicious-external-site.com/api")


def test_statute_adapter_handles_provider_404() -> None:
    mock_client = MagicMock(spec=httpx.Client)
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    mock_client.__enter__.return_value.get.return_value = mock_resp

    adapter = ECourtsIndiaAdapter(client=mock_client)
    with pytest.raises(ValueError, match="not found on provider"):
        adapter.get_provision(act_key="unknown_act_123", provision="999", unit="section")
