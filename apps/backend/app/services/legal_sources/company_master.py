from typing import Any
from urllib.parse import urlparse

import httpx

from app.core.config import settings


class CompanyMasterAdapter:
    """Read-only adapter for the MCA Company Master Data resource on data.gov.in."""

    ALLOWLISTED_HOSTS = {"api.data.gov.in"}

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client

    def _get_client(self) -> httpx.Client:
        if self._client is not None:
            return self._client
        parsed = urlparse(settings.DATA_GOV_IN_BASE_URL)
        if parsed.scheme != "https" or parsed.hostname not in self.ALLOWLISTED_HOSTS:
            raise ValueError("Company registry provider URL is not allowlisted")
        if not settings.DATA_GOV_IN_API_KEY.strip():
            raise ValueError("DATA_GOV_IN_API_KEY is required for company registry lookup")
        return httpx.Client(
            base_url=settings.DATA_GOV_IN_BASE_URL,
            timeout=settings.LEGAL_SOURCE_TIMEOUT_SECONDS,
            follow_redirects=False,
        )

    @staticmethod
    def _response_json(response: httpx.Response) -> dict[str, Any]:
        if len(response.content) > settings.LEGAL_SOURCE_MAX_RESPONSE_BYTES:
            raise ValueError("Company registry response exceeded the configured size limit")
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("Company registry returned an invalid response")
        return data

    def lookup_by_cin(self, cin: str) -> dict[str, Any]:
        clean_cin = "".join(cin.upper().split())
        if not clean_cin.isalnum() or not 15 <= len(clean_cin) <= 24:
            raise ValueError("CIN must be an alphanumeric identifier between 15 and 24 characters")

        endpoint = f"/resource/{settings.MCA_COMPANY_MASTER_RESOURCE_ID}"
        params = {
            "api-key": settings.DATA_GOV_IN_API_KEY,
            "format": "json",
            "offset": 0,
            "limit": 2,
            "filters[corporate_identification_number]": clean_cin,
        }
        try:
            with self._get_client() as client:
                response = client.get(endpoint, params=params)
                if response.status_code != 200:
                    raise ValueError(
                        f"Company registry provider returned HTTP {response.status_code}"
                    )
                data = self._response_json(response)
        except ValueError:
            raise
        except httpx.HTTPError as exc:
            raise ValueError("Company registry provider is temporarily unavailable") from exc

        records = data.get("records")
        if not isinstance(records, list):
            raise ValueError("Company registry returned an invalid records collection")
        exact_matches = [
            record
            for record in records
            if isinstance(record, dict)
            and str(record.get("corporate_identification_number") or "").upper() == clean_cin
        ]
        if len(exact_matches) != 1:
            raise ValueError("Company registry did not return one exact CIN match")

        return {
            "provider": "MCA Company Master Data via data.gov.in",
            "source_url": "https://www.data.gov.in/catalog/company-master-data",
            "resource_id": settings.MCA_COMPANY_MASTER_RESOURCE_ID,
            "cin": clean_cin,
            "record": exact_matches[0],
            "updated_date": data.get("updated_date") or data.get("updated"),
            "limitations": [
                "This record verifies only fields published in the company master dataset.",
                "It does not prove debt, default, notice delivery, or current insolvency status.",
                "Time-sensitive fields require review of the dataset update date.",
            ],
        }


company_master_adapter = CompanyMasterAdapter()
