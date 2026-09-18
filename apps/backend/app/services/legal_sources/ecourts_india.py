from typing import Any
from urllib.parse import urljoin, urlparse

import httpx

from app.core.config import settings
from app.schemas.legal_sources.case import CaseCandidate, SearchCasesResponse
from app.schemas.legal_sources.statute import (
    SearchStatutesResponse,
    StatuteCandidate,
)


class ECourtsIndiaAdapter:
    """
    Adapter for IndiaCode by eCourtsIndia (private discovery service).
    """

    PROVIDER_NAME = "IndiaCode by eCourtsIndia"
    ALLOWLISTED_HOSTS = ["indiacode.ecourtsindia.com"]

    ACT_KEY_MAP: dict[str, str] = {
        "insolvency and bankruptcy": "ibc",
        "companies": "companies_act",
        "civil procedure": "cpc",
        "arbitration": "arbitration_act",
        "contract": "contract_act",
        "negotiable instruments": "ni_act",
        "constitution": "constitution",
        "limitation": "limitation_act",
        "commercial courts": "commercial_courts_act",
        "consumer protection": "consumer_protection",
    }

    def _normalize_act_key(self, raw_key: str) -> str:
        lower = raw_key.lower().strip()
        for phrase, mapped_key in self.ACT_KEY_MAP.items():
            if phrase in lower:
                return mapped_key
        return lower.replace(" ", "_").replace(".", "").replace(",", "")

    DEMO_STATUTE_SEARCH_FIXTURE: list[dict[str, Any]] = [
        {
            "act_key": "ibc",
            "provision": "7",
            "unit": "section",
            "act_title": "Insolvency and Bankruptcy Code, 2016",
            "heading": "Initiation of corporate insolvency resolution process by financial creditor",
            "provider_url": "https://indiacode.ecourtsindia.com/ibc/section/7",
        },
        {
            "act_key": "ibc",
            "provision": "8",
            "unit": "section",
            "act_title": "Insolvency and Bankruptcy Code, 2016",
            "heading": "Insolvency resolution by operational creditor",
            "provider_url": "https://indiacode.ecourtsindia.com/ibc/section/8",
        },
    ]

    DEMO_PROVISION_FIXTURES: dict[tuple[str, str, str], dict[str, Any]] = {
        ("ibc", "section", "7"): {
            "act_key": "ibc",
            "act_title": "Insolvency and Bankruptcy Code, 2016",
            "provision": "7",
            "unit": "section",
            "heading": "Initiation of corporate insolvency resolution process by financial creditor",
            "text": (
                "(1) A financial creditor either by itself or jointly with other financial creditors, "
                "or any other person on behalf of the financial creditor, as may be notified by the "
                "Central Government, may file an application for initiating corporate insolvency "
                "resolution process against a corporate debtor before the Adjudicating Authority "
                "when a default has occurred.\n\n"
                "(2) The financial creditor shall make an application under sub-section (1) in such "
                "form and manner and accompanied with such fee as may be prescribed.\n\n"
                "(3) The financial creditor shall, along with the application furnish— "
                "(a) record of the default recorded with the information utility or such other "
                "record or evidence of default as may be specified; "
                "(b) the name of the resolution professional proposed to act as an interim "
                "resolution professional; and (c) any other information as may be specified by the Board.\n\n"
                "(4) The Adjudicating Authority shall, within fourteen days of the receipt of the "
                "application under sub-section (2), ascertain the existence of a default from the "
                "records of an information utility or on the basis of other evidence furnished by "
                "the financial creditor under sub-section (3).\n\n"
                "(5) Where the Adjudicating Authority is satisfied that— "
                "(a) a default has occurred and the application under sub-section (2) is complete, "
                "and there is no disciplinary proceedings pending against the proposed resolution "
                "professional, it may, by order, admit such application."
            ),
            "provider_url": "https://indiacode.ecourtsindia.com/ibc/section/7",
            "official_source_url": "https://www.indiacode.nic.in/handle/123456789/2154",
            "limitations": [
                "The immediate provider is a private service.",
                "Retrieval does not independently establish current legal treatment or subsequent amendments.",
            ],
        },
        ("ibc", "section", "9"): {
            "act_key": "ibc",
            "act_title": "Insolvency and Bankruptcy Code, 2016",
            "provision": "9",
            "unit": "section",
            "heading": "Application for initiation of corporate insolvency resolution process by operational creditor",
            "text": (
                "(1) After the expiry of the period of ten days from the date of delivery of the notice "
                "or invoice demanding payment under sub-section (1) of section 8, if the operational creditor "
                "does not receive payment from the corporate debtor or notice of the dispute under "
                "sub-section (2) of section 8, the operational creditor may file an application before the "
                "Adjudicating Authority for initiating a corporate insolvency resolution process."
            ),
            "provider_url": "https://indiacode.ecourtsindia.com/ibc/section/9",
            "official_source_url": "https://www.indiacode.nic.in/handle/123456789/2154",
            "limitations": [
                "The immediate provider is a private service.",
                "Retrieval does not independently establish current legal treatment.",
            ],
        },
    }

    DEMO_CASE_CANDIDATE_FIXTURE: list[dict[str, Any]] = [
        {
            "candidate_id": "ecourts_sc_2017_innoventive",
            "provider": "IndiaCode by eCourtsIndia",
            "title": "Innoventive Industries Ltd. v. ICICI Bank & Anr.",
            "court": "Supreme Court of India",
            "date": "2017-08-31",
            "citation": "(2018) 1 SCC 407",
            "source_url": "https://indiacode.ecourtsindia.com/judgments/sc/2017/innoventive",
            "limitations": [
                "Candidate discovery from keyless judgment index.",
                "Full text and subsequent judicial treatment require review.",
            ],
        },
        {
            "candidate_id": "ecourts_sc_2019_swiss_ribbons",
            "provider": "IndiaCode by eCourtsIndia",
            "title": "Swiss Ribbons Pvt. Ltd. & Anr. v. Union of India & Ors.",
            "court": "Supreme Court of India",
            "date": "2019-01-25",
            "citation": "(2019) 4 SCC 17",
            "source_url": "https://indiacode.ecourtsindia.com/judgments/sc/2019/swiss-ribbons",
            "limitations": [
                "Candidate discovery from keyless judgment index.",
                "Subsequent judicial treatment requires review.",
            ],
        },
    ]

    DEMO_CASE_PASSAGE_FIXTURE: dict[str, dict[str, Any]] = {
        "ecourts_sc_2017_innoventive": {
            "candidate_id": "ecourts_sc_2017_innoventive",
            "title": "Innoventive Industries Ltd. v. ICICI Bank & Anr.",
            "court": "Supreme Court of India",
            "date": "2017-08-31",
            "citation": "(2018) 1 SCC 407",
            "provider": "IndiaCode by eCourtsIndia",
            "source_url": "https://indiacode.ecourtsindia.com/judgments/sc/2017/innoventive",
            "text": (
                "The scheme of the Code is to ensure that when a default takes place, in the sense that a "
                "debt becomes due and is not paid, the insolvency resolution process begins. Under Section 7(5), "
                "the Adjudicating Authority has only to see whether a default has occurred. It is of no "
                "consequence that the corporate debtor disputes the debt in the absence of a plausible defense."
            ),
            "summary": "Leading Supreme Court precedent establishing the test for admission under Section 7 of IBC.",
            "limitations": [
                "The immediate provider is a private service.",
                "Ratio must be verified against official Supreme Court order.",
            ],
        },
        "ecourts_sc_2019_swiss_ribbons": {
            "candidate_id": "ecourts_sc_2019_swiss_ribbons",
            "title": "Swiss Ribbons Pvt. Ltd. & Anr. v. Union of India & Ors.",
            "court": "Supreme Court of India",
            "date": "2019-01-25",
            "citation": "(2019) 4 SCC 17",
            "provider": "IndiaCode by eCourtsIndia",
            "source_url": "https://indiacode.ecourtsindia.com/judgments/sc/2019/swiss-ribbons",
            "text": (
                "The primary focus of the legislation is to ensure revival and continuation of the corporate debtor "
                "by protecting the corporate debtor from its own management and from a corporate death by liquidation. "
                "The Code is not a mere debt-recovery mechanism."
            ),
            "summary": "Constitutional validity of the Insolvency and Bankruptcy Code, 2016 upheld.",
            "limitations": [
                "The immediate provider is a private service.",
                "Ratio must be verified against official Supreme Court order.",
            ],
        },
    }

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client

    def _get_client(self) -> httpx.Client:
        if self._client is not None:
            return self._client
        return httpx.Client(
            base_url=settings.ECOURTS_INDIA_BASE_URL,
            timeout=settings.LEGAL_SOURCE_TIMEOUT_SECONDS,
            follow_redirects=False,
        )

    def _validate_url_host(self, url: str) -> None:
        parsed = urlparse(url)
        if parsed.netloc and parsed.netloc not in self.ALLOWLISTED_HOSTS:
            raise ValueError(
                f"Security violation: Host '{parsed.netloc}' is not in allowlisted legal providers"
            )

    def search_statutes(self, query: str, limit: int = 5) -> SearchStatutesResponse:
        """Search statutory candidates via eCourtsIndia."""
        clean_q = query.strip()
        if not clean_q:
            raise ValueError("Query cannot be empty")

        candidates: list[StatuteCandidate] = []
        try:
            with self._get_client() as client:
                resp = client.get(
                    "/search", params={"q": clean_q, "kind": "section", "limit": limit}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    raw_items = data.get("results", []) if isinstance(data, dict) else []
                    for item in raw_items[:limit]:
                        ref_prov = ""
                        if item.get("ref"):
                            ref_prov = str(item["ref"]).split("/")[-1]
                        prov_num = str(
                            item.get("section")
                            or item.get("provision")
                            or item.get("number")
                            or ref_prov
                            or ""
                        ).strip()
                        raw_act = str(
                            item.get("act_key")
                            or item.get("act")
                            or (str(item.get("ref")).split("/")[0] if item.get("ref") else "")
                            or "statute"
                        )
                        act_key = self._normalize_act_key(raw_act)
                        act_title = str(
                            item.get("act_title") or item.get("act") or item.get("title") or "Act"
                        )
                        candidates.append(
                            StatuteCandidate(
                                act_key=act_key,
                                provision=prov_num,
                                unit="section",
                                act_title=act_title,
                                heading=str(item.get("heading") or item.get("title") or ""),
                                provider_url=item.get("url"),
                                is_fixture=False,
                                limitations=[],
                            )
                        )
                else:
                    if not settings.LEGAL_SOURCE_FIXTURES_ENABLED:
                        raise ValueError(
                            f"Provider returned HTTP {resp.status_code} for search '{clean_q}'"
                        )
        except Exception as e:
            if not settings.LEGAL_SOURCE_FIXTURES_ENABLED:
                if isinstance(e, ValueError):
                    raise
                raise ValueError(f"Legal source unavailable from provider: {e}") from e

        if not candidates:
            if not settings.LEGAL_SOURCE_FIXTURES_ENABLED:
                return SearchStatutesResponse(
                    provider=self.PROVIDER_NAME,
                    candidates=[],
                )
            # Explicit demo fixtures when enabled
            candidates = [
                StatuteCandidate(
                    act_key=c["act_key"],
                    provision=c["provision"],
                    unit=c["unit"],
                    act_title=c["act_title"],
                    heading=c["heading"],
                    provider_url=c.get("provider_url"),
                    is_fixture=True,
                    limitations=["Synthetic fixture; not a live legal source."],
                )
                for c in self.DEMO_STATUTE_SEARCH_FIXTURE[:limit]
            ]
            return SearchStatutesResponse(
                provider="synthetic_demo_fixture",
                candidates=candidates,
            )

        return SearchStatutesResponse(
            provider=self.PROVIDER_NAME,
            candidates=candidates,
        )

    def get_provision(
        self,
        act_key: str,
        provision: str,
        unit: str = "section",
    ) -> dict[str, Any]:
        """Fetch exact provision content and metadata."""
        clean_act = self._normalize_act_key(act_key)
        clean_prov = provision.strip().lower().lstrip("section ").lstrip("sec. ")
        clean_unit = unit.strip().lower()

        if clean_unit not in ["section", "article", "rule"]:
            raise ValueError(f"Invalid statutory unit '{unit}'. Must be section, article, or rule.")

        endpoint = f"/{clean_act}/{clean_unit}/{clean_prov}"
        try:
            with self._get_client() as client:
                resp = client.get(endpoint)
                if resp.status_code == 200:
                    data = resp.json()
                    text = str(data.get("text") or data.get("content") or "")
                    if text.strip():
                        return {
                            "act_key": clean_act,
                            "act_title": str(data.get("act_title") or clean_act.upper()),
                            "provision": clean_prov,
                            "unit": clean_unit,
                            "heading": str(
                                data.get("heading") or f"{clean_unit.capitalize()} {clean_prov}"
                            ),
                            "text": text.strip(),
                            "provider": self.PROVIDER_NAME,
                            "provider_url": urljoin(settings.ECOURTS_INDIA_BASE_URL, endpoint),
                            "official_source_url": data.get("official_url"),
                            "is_fixture": False,
                            "limitations": [
                                "The immediate provider is a private service.",
                                "Retrieval does not independently establish current legal treatment.",
                            ],
                        }
                elif resp.status_code == 404:
                    if not settings.LEGAL_SOURCE_FIXTURES_ENABLED:
                        raise ValueError(
                            f"Provision {clean_unit} {clean_prov} of '{clean_act}' not found on provider"
                        )
                    fixture_key = (clean_act, clean_unit, clean_prov)
                    if fixture_key in self.DEMO_PROVISION_FIXTURES:
                        fixture = dict(self.DEMO_PROVISION_FIXTURES[fixture_key])
                        fixture["is_fixture"] = True
                        fixture["provider"] = "synthetic_demo_fixture"
                        fixture["limitations"] = ["Synthetic fixture; not a live legal source."]
                        return fixture
                    raise ValueError(
                        f"Provision {clean_unit} {clean_prov} of '{clean_act}' not found on provider"
                    )
        except ValueError:
            raise
        except Exception as e:
            if not settings.LEGAL_SOURCE_FIXTURES_ENABLED:
                raise ValueError(
                    f"Statute {clean_act} {clean_unit} {clean_prov} unavailable from provider: {e}"
                ) from e

        if settings.LEGAL_SOURCE_FIXTURES_ENABLED:
            fixture_key = (clean_act, clean_unit, clean_prov)
            if fixture_key in self.DEMO_PROVISION_FIXTURES:
                fixture = dict(self.DEMO_PROVISION_FIXTURES[fixture_key])
                fixture["is_fixture"] = True
                fixture["provider"] = "synthetic_demo_fixture"
                fixture["limitations"] = ["Synthetic fixture; not a live legal source."]
                return fixture

        raise ValueError(f"Statute {clean_act} {clean_unit} {clean_prov} unavailable from provider")

    def search_cases(
        self,
        query: str,
        act_key: str | None = None,
        provision: str | None = None,
        court: str | None = "SC",
        limit: int = 5,
    ) -> SearchCasesResponse:
        """Search case-law candidates."""
        candidates: list[CaseCandidate] = []
        try:
            with self._get_client() as client:
                params: dict[str, Any] = {"q": query, "limit": limit}
                if act_key:
                    params["act"] = act_key
                if provision:
                    params["section"] = provision

                resp = client.get("/judgments", params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    raw_cases = data.get("results", []) if isinstance(data, dict) else []
                    for c in raw_cases[:limit]:
                        candidates.append(
                            CaseCandidate(
                                candidate_id=str(c.get("id") or c.get("candidate_id") or ""),
                                provider=self.PROVIDER_NAME,
                                title=str(c.get("title") or "Case"),
                                court=c.get("court") or court,
                                date=c.get("date"),
                                citation=c.get("citation"),
                                source_url=c.get("url"),
                                is_fixture=False,
                                limitations=["Candidate discovery from keyless judgment index."],
                            )
                        )
                else:
                    if not settings.LEGAL_SOURCE_FIXTURES_ENABLED:
                        raise ValueError(
                            f"Provider returned HTTP {resp.status_code} for case search"
                        )
        except Exception as e:
            if not settings.LEGAL_SOURCE_FIXTURES_ENABLED:
                if isinstance(e, ValueError):
                    raise
                raise ValueError(f"Legal source unavailable from provider: {e}") from e

        if not candidates:
            if not settings.LEGAL_SOURCE_FIXTURES_ENABLED:
                return SearchCasesResponse(
                    provider=self.PROVIDER_NAME,
                    candidates=[],
                )
            candidates = [
                CaseCandidate(
                    candidate_id=c["candidate_id"],
                    provider="synthetic_demo_fixture",
                    title=c["title"],
                    court=c["court"],
                    date=c["date"],
                    citation=c["citation"],
                    source_url=c["source_url"],
                    is_fixture=True,
                    limitations=["Synthetic fixture; not a live legal source."],
                )
                for c in self.DEMO_CASE_CANDIDATE_FIXTURE[:limit]
            ]
            return SearchCasesResponse(
                provider="synthetic_demo_fixture",
                candidates=candidates,
            )

        return SearchCasesResponse(
            provider=self.PROVIDER_NAME,
            candidates=candidates,
        )

    def fetch_case(self, candidate_id: str) -> dict[str, Any]:
        """Fetch exact judgment passage and metadata."""
        clean_id = candidate_id.strip()
        try:
            with self._get_client() as client:
                resp = client.get(f"/judgments/{clean_id}")
                if resp.status_code == 200:
                    data = resp.json()
                    text = str(data.get("text") or data.get("judgment_text") or "")
                    if text.strip():
                        return {
                            "candidate_id": clean_id,
                            "title": str(data.get("title") or "Judgment"),
                            "court": data.get("court"),
                            "date": data.get("date"),
                            "citation": data.get("citation"),
                            "provider": self.PROVIDER_NAME,
                            "source_url": data.get("url"),
                            "text": text.strip(),
                            "summary": data.get("summary"),
                            "is_fixture": False,
                            "limitations": [
                                "The immediate provider is a private service.",
                                "Ratio must be verified against official Supreme Court order.",
                            ],
                        }
                elif resp.status_code == 404:
                    if not settings.LEGAL_SOURCE_FIXTURES_ENABLED:
                        raise ValueError(f"Case candidate '{candidate_id}' not found on provider")
                    if clean_id in self.DEMO_CASE_PASSAGE_FIXTURE:
                        fixture = dict(self.DEMO_CASE_PASSAGE_FIXTURE[clean_id])
                        fixture["is_fixture"] = True
                        fixture["provider"] = "synthetic_demo_fixture"
                        fixture["limitations"] = ["Synthetic fixture; not a live legal source."]
                        return fixture
                    raise ValueError(f"Case candidate '{candidate_id}' not found on provider")
        except ValueError:
            raise
        except Exception as e:
            if not settings.LEGAL_SOURCE_FIXTURES_ENABLED:
                raise ValueError(
                    f"Case candidate '{candidate_id}' unavailable from provider: {e}"
                ) from e

        if settings.LEGAL_SOURCE_FIXTURES_ENABLED and clean_id in self.DEMO_CASE_PASSAGE_FIXTURE:
            fixture = dict(self.DEMO_CASE_PASSAGE_FIXTURE[clean_id])
            fixture["is_fixture"] = True
            fixture["provider"] = "synthetic_demo_fixture"
            fixture["limitations"] = ["Synthetic fixture; not a live legal source."]
            return fixture

        raise ValueError(f"Case candidate '{candidate_id}' not found on provider")


ecourts_adapter = ECourtsIndiaAdapter()
