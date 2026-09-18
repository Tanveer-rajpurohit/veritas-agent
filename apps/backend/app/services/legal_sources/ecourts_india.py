import re
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import settings
from app.schemas.legal_sources.case import CaseCandidate, SearchCasesResponse
from app.schemas.legal_sources.statute import SearchStatutesResponse, StatuteCandidate


class ECourtsIndiaAdapter:
    """Read-only adapter for the live IndiaCode by eCourtsIndia API."""

    PROVIDER_NAME = "IndiaCode by eCourtsIndia"
    ALLOWLISTED_HOSTS = {"indiacode.ecourtsindia.com"}
    ACT_ALIASES = {
        "ibc": "ibc",
        "insolvency and bankruptcy code": "ibc",
        "cpc": "cpc",
        "code of civil procedure": "cpc",
        "constitution": "constitution",
        "constitution of india": "constitution",
        "ni act": "ni-act",
        "negotiable instruments act": "ni-act",
    }

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client

    @classmethod
    def _normalize_act_key(cls, raw_key: str) -> str:
        clean_key = " ".join(raw_key.casefold().strip().split())
        return cls.ACT_ALIASES.get(clean_key, clean_key.replace(" ", "-"))

    @classmethod
    def _validate_url_host(cls, url: str) -> None:
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.hostname not in cls.ALLOWLISTED_HOSTS:
            raise ValueError("Security violation: legal provider URL is not allowlisted")

    @staticmethod
    def _response_json(response: httpx.Response) -> dict[str, Any]:
        content_length = response.headers.get("content-length")
        if content_length and int(content_length) > settings.LEGAL_SOURCE_MAX_RESPONSE_BYTES:
            raise ValueError("Legal provider response exceeded the configured size limit")
        content = response.content
        if isinstance(content, bytes) and len(content) > settings.LEGAL_SOURCE_MAX_RESPONSE_BYTES:
            raise ValueError("Legal provider response exceeded the configured size limit")
        data = response.json()
        if not isinstance(data, dict):
            raise ValueError("Legal provider returned an invalid response")
        return data

    def _get_client(self) -> httpx.Client:
        if self._client is not None:
            return self._client
        self._validate_url_host(settings.ECOURTS_INDIA_BASE_URL)
        return httpx.Client(
            base_url=settings.ECOURTS_INDIA_BASE_URL,
            timeout=settings.LEGAL_SOURCE_TIMEOUT_SECONDS,
            follow_redirects=False,
        )

    def search_statutes(self, query: str, limit: int = 5) -> SearchStatutesResponse:
        """Return live statutory candidates; search hits are not evidence."""
        clean_query = query.strip()
        if not clean_query:
            raise ValueError("Query cannot be empty")
        try:
            with self._get_client() as client:
                response = client.get(
                    "/search", params={"q": clean_query, "kind": "section", "limit": limit}
                )
                if response.status_code != 200:
                    raise ValueError(
                        f"Legal provider returned HTTP {response.status_code} for statute search"
                    )
                data = self._response_json(response)
        except ValueError:
            raise
        except httpx.HTTPError as exc:
            raise ValueError("Legal source provider is temporarily unavailable") from exc

        candidates: list[StatuteCandidate] = []
        for item in data.get("results", [])[:limit]:
            if not isinstance(item, dict):
                continue
            ref_parts = str(item.get("ref") or "").strip("/").split("/")
            act_key = str(item.get("act_key") or item.get("act") or "").strip()
            provision = str(
                item.get("section") or item.get("provision") or item.get("number") or ""
            ).strip()
            if not act_key and ref_parts:
                act_key = ref_parts[0]
            if not provision and len(ref_parts) >= 3:
                provision = ref_parts[-1]
            if not act_key or not provision:
                continue
            candidates.append(
                StatuteCandidate(
                    act_key=self._normalize_act_key(act_key),
                    provision=provision,
                    unit="section",
                    act_title=str(
                        item.get("act_title") or item.get("act") or item.get("title") or "Act"
                    ),
                    heading=str(item.get("heading") or item.get("title") or ""),
                    provider_url=item.get("url"),
                    is_fixture=False,
                    limitations=["Live search result; retrieve the provision before citing."],
                )
            )
        return SearchStatutesResponse(provider=self.PROVIDER_NAME, candidates=candidates)

    def get_provision(self, act_key: str, provision: str, unit: str = "section") -> dict[str, Any]:
        """Fetch exact provision content from the live API."""
        clean_act = self._normalize_act_key(act_key)
        clean_unit = unit.strip().casefold()
        if clean_unit not in {"section", "article", "rule"}:
            raise ValueError(f"Invalid statutory unit '{unit}'. Must be section, article, or rule.")

        clean_provision = provision.strip()
        for prefix in (f"{clean_unit} ", "section ", "sec. ", "article ", "rule "):
            if clean_provision.casefold().startswith(prefix):
                clean_provision = clean_provision[len(prefix) :].strip()
                break
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9().-]{0,31}", clean_provision):
            raise ValueError("Invalid statutory provision identifier")

        endpoint = f"/{clean_act}/{clean_unit}/{clean_provision}"
        try:
            with self._get_client() as client:
                response = client.get(endpoint)
                if response.status_code == 404:
                    raise ValueError(
                        f"Provision {clean_unit} {clean_provision} of '{clean_act}' "
                        "was not found on the live provider"
                    )
                if response.status_code != 200:
                    raise ValueError(
                        f"Legal provider returned HTTP {response.status_code} for provision lookup"
                    )
                data = self._response_json(response)
        except ValueError:
            raise
        except httpx.HTTPError as exc:
            raise ValueError(
                f"Statute {clean_act} {clean_unit} {clean_provision} is temporarily unavailable"
            ) from exc

        provision_data = data.get(clean_unit) or data.get("section") or {}
        act_data = data.get("act") or {}
        if not isinstance(provision_data, dict) or not isinstance(act_data, dict):
            raise ValueError("Legal provider returned an invalid provision response")
        text = str(provision_data.get("text") or "").strip()
        if not text:
            raise ValueError("Live legal provider returned no provision text")

        return {
            "act_key": clean_act,
            "act_title": str(act_data.get("short_title") or clean_act.upper()),
            "provision": clean_provision,
            "unit": clean_unit,
            "heading": str(
                provision_data.get("heading") or f"{clean_unit.capitalize()} {clean_provision}"
            ),
            "text": text,
            "provider": self.PROVIDER_NAME,
            "provider_url": data.get("url") or urljoin(settings.ECOURTS_INDIA_BASE_URL, endpoint),
            "official_source_url": None,
            "is_fixture": False,
            "limitations": [
                "The immediate provider is a private service.",
                "Retrieval does not independently establish current legal treatment.",
            ],
        }

    def search_cases(
        self,
        query: str,
        act_key: str | None = None,
        provision: str | None = None,
        court: str | None = "SC",
        limit: int = 5,
    ) -> SearchCasesResponse:
        """Return live case candidates; results are not full-text evidence."""
        clean_query = query.strip()
        if not clean_query:
            raise ValueError("Query cannot be empty")
        if act_key or provision:
            endpoint = "/judgments"
            params: dict[str, Any] = {"limit": limit}
            if act_key:
                params["act"] = self._normalize_act_key(act_key)
            if provision:
                params["section"] = provision
            if court:
                params["court"] = court
        else:
            endpoint = "/search"
            params = {"q": clean_query, "kind": "judgment", "limit": limit}

        try:
            with self._get_client() as client:
                response = client.get(endpoint, params=params)
                if response.status_code != 200:
                    raise ValueError(
                        f"Legal provider returned HTTP {response.status_code} for case search"
                    )
                data = self._response_json(response)
        except ValueError:
            raise
        except httpx.HTTPError as exc:
            raise ValueError("Legal source provider is temporarily unavailable") from exc

        candidates: list[CaseCandidate] = []
        for item in (data.get("judgments") or data.get("results") or [])[:limit]:
            if not isinstance(item, dict):
                continue
            candidate_id = str(item.get("cnr") or item.get("ref") or "").strip()
            if not candidate_id:
                continue
            candidates.append(
                CaseCandidate(
                    candidate_id=candidate_id,
                    provider=self.PROVIDER_NAME,
                    title=str(item.get("title") or "Case"),
                    court=item.get("court_name") or item.get("court") or court,
                    date=item.get("date"),
                    citation=item.get("citation"),
                    source_url=item.get("url"),
                    is_fixture=False,
                    limitations=[
                        "Live discovery result; retrieve full text from Indian Kanoon before citing."
                    ],
                )
            )
        return SearchCasesResponse(provider=self.PROVIDER_NAME, candidates=candidates)

    def fetch_case(self, candidate_id: str) -> dict[str, Any]:
        """Prevent a discovery candidate from being treated as judgment evidence."""
        del candidate_id
        raise ValueError(
            "eCourtsIndia exposes case candidates, not full judgment text; "
            "configure Indian Kanoon before citing a case"
        )


ecourts_adapter = ECourtsIndiaAdapter()
