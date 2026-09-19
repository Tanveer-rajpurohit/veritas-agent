import httpx
import pytest

from app.services.legal_sources.company_master import CompanyMasterAdapter


def test_company_master_lookup_returns_one_exact_cin() -> None:
    cin = "U12345DL2020PTC123456"

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.params["filters[corporate_identification_number]"] == cin
        return httpx.Response(
            200,
            json={
                "updated_date": "2026-07-22",
                "records": [
                    {
                        "corporate_identification_number": cin,
                        "company_name": "Example Private Limited",
                        "company_status": "Active",
                    }
                ],
            },
        )

    client = httpx.Client(
        base_url="https://api.data.gov.in",
        transport=httpx.MockTransport(handler),
    )
    result = CompanyMasterAdapter(client=client).lookup_by_cin(cin.lower())

    assert result["cin"] == cin
    assert result["record"]["company_status"] == "Active"
    assert result["updated_date"] == "2026-07-22"


def test_company_master_lookup_rejects_non_exact_result() -> None:
    client = httpx.Client(
        base_url="https://api.data.gov.in",
        transport=httpx.MockTransport(lambda _request: httpx.Response(200, json={"records": []})),
    )

    with pytest.raises(ValueError, match="one exact CIN match"):
        CompanyMasterAdapter(client=client).lookup_by_cin("U12345DL2020PTC123456")


@pytest.mark.parametrize("cin", ["", "ABC", "not-a-valid-cin"])
def test_company_master_lookup_rejects_invalid_cin(cin: str) -> None:
    with pytest.raises(ValueError, match="CIN must be"):
        CompanyMasterAdapter(client=httpx.Client()).lookup_by_cin(cin)
