import html
import re
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.legal_sources.case import CaseCandidate, SearchCasesResponse


class IndianKanoonAdapter:
    """
    Adapter for the optional Indian Kanoon commercial case law API.
    Conforms to docs/build plan/sources.md and api.indiankanoon.org contracts.
    """

    PROVIDER_NAME = "Indian Kanoon"

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client

    @staticmethod
    def _strip_html_tags(raw_html: str) -> str:
        """Strip HTML tags and unescape entities for clean plain-text evidence."""
        clean = re.sub(
            r"<(script|style).*?>.*?</\1>",
            "",
            raw_html,
            flags=re.DOTALL | re.IGNORECASE,
        )
        clean = re.sub(r"<br\s*/?>", "\n", clean, flags=re.IGNORECASE)
        clean = re.sub(r"</p>", "\n\n", clean, flags=re.IGNORECASE)
        clean = re.sub(r"<[^>]+>", " ", clean)
        clean = html.unescape(clean)
        lines = [line.strip() for line in clean.splitlines()]
        return "\n".join(line for line in lines if line)

    def _ensure_token(self) -> str:
        token = settings.INDIAN_KANOON_API_TOKEN.strip()
        if not token:
            raise ValueError(
                "INDIAN_KANOON_API_TOKEN is not configured. "
                "Set the token or configure LEGAL_CASE_PROVIDER=ecourts_india."
            )
        return token

    def _get_client(self) -> httpx.Client:
        if self._client is not None:
            return self._client
        token = self._ensure_token()
        return httpx.Client(
            base_url=settings.INDIAN_KANOON_BASE_URL,
            headers={"Authorization": f"Token {token}"},
            timeout=settings.LEGAL_SOURCE_TIMEOUT_SECONDS,
            follow_redirects=False,
        )

    def search_cases(self, query: str, limit: int = 5) -> SearchCasesResponse:
        """Search judgments via Indian Kanoon API."""
        clean_q = query.strip()
        if not clean_q:
            raise ValueError("Query cannot be empty")

        candidates: list[CaseCandidate] = []
        with self._get_client() as client:
            resp = client.post("/search/", params={"formInput": clean_q, "pagenum": 0})
            if resp.status_code != 200:
                raise ValueError(
                    f"Indian Kanoon provider returned HTTP {resp.status_code}: {resp.text[:200]}"
                )

            data = resp.json()
            docs = data.get("docs", []) if isinstance(data, dict) else []
            for d in docs[:limit]:
                doc_id = str(d.get("tid") or d.get("docid") or "")
                candidates.append(
                    CaseCandidate(
                        candidate_id=f"ik_{doc_id}",
                        provider=self.PROVIDER_NAME,
                        title=str(d.get("title") or "Judgment"),
                        court=d.get("docsource"),
                        date=d.get("publishdate"),
                        citation=d.get("citation"),
                        source_url=f"https://indiankanoon.org/doc/{doc_id}/",
                        limitations=[
                            "Candidate retrieved from Indian Kanoon API.",
                            "Requires verification against official court order.",
                        ],
                    )
                )

        return SearchCasesResponse(
            provider=self.PROVIDER_NAME,
            candidates=candidates,
        )

    def fetch_case(self, candidate_id: str) -> dict[str, Any]:
        """Fetch full judgment text from Indian Kanoon."""
        clean_id = candidate_id.strip().removeprefix("ik_")
        with self._get_client() as client:
            resp = client.post(f"/doc/{clean_id}/")
            if resp.status_code != 200:
                raise ValueError(
                    f"Indian Kanoon provider returned HTTP {resp.status_code} for doc {clean_id}"
                )

            data = resp.json()
            raw_doc = str(data.get("doc") or "")
            clean_text = self._strip_html_tags(raw_doc)
            return {
                "candidate_id": candidate_id,
                "title": str(data.get("title") or "Judgment"),
                "court": data.get("docsource"),
                "date": data.get("publishdate"),
                "citation": data.get("citation"),
                "provider": self.PROVIDER_NAME,
                "source_url": f"https://indiankanoon.org/doc/{clean_id}/",
                "text": clean_text.strip(),
                "summary": None,
                "limitations": [
                    "Powered by IKanoon under API terms.",
                    "Judgment text must be verified against certified court copy.",
                ],
            }


indian_kanoon_adapter = IndianKanoonAdapter()
