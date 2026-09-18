from html.parser import HTMLParser
from typing import Any

import httpx

from app.core.config import settings
from app.schemas.legal_sources.case import CaseCandidate, SearchCasesResponse


class LegalHTMLToTextParser(HTMLParser):
    """
    Standard library HTML parser for Indian legal judgments and orders.
    Preserves headings, paragraphs, lists, and block quotations while stripping
    scripts, stylesheets, navigational chrome, and advertising markup.
    """

    IGNORE_TAGS = {"script", "style", "noscript", "iframe"}
    BLOCK_TAGS = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "tr", "table"}

    def __init__(self) -> None:
        super().__init__()
        self._ignore_depth = 0
        self._pieces: list[str] = []
        self._in_list_item = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_lower = tag.lower()
        if tag_lower in self.IGNORE_TAGS:
            self._ignore_depth += 1
            return

        if self._ignore_depth > 0:
            return

        if tag_lower in self.BLOCK_TAGS:
            self._pieces.append("\n\n")
        elif tag_lower == "br":
            self._pieces.append("\n")
        elif tag_lower == "li":
            self._in_list_item = True
            self._pieces.append("\n- ")

    def handle_endtag(self, tag: str) -> None:
        tag_lower = tag.lower()
        if tag_lower in self.IGNORE_TAGS:
            if self._ignore_depth > 0:
                self._ignore_depth -= 1
            return

        if self._ignore_depth > 0:
            return

        if tag_lower in self.BLOCK_TAGS:
            self._pieces.append("\n\n")
        elif tag_lower == "li":
            self._in_list_item = False

    def handle_data(self, data: str) -> None:
        if self._ignore_depth == 0 and data:
            self._pieces.append(data)

    def get_text(self) -> str:
        raw = "".join(self._pieces)
        paragraphs = raw.split("\n\n")
        cleaned_paras = []
        for p in paragraphs:
            lines = [line.strip() for line in p.split("\n") if line.strip()]
            if lines:
                cleaned_paras.append("\n".join(lines))
        return "\n\n".join(cleaned_paras).strip()


class IndianKanoonAdapter:
    """
    Adapter for the optional Indian Kanoon commercial case law API.
    Conforms to docs/build plan/sources.md and api.indiankanoon.org contracts.
    """

    PROVIDER_NAME = "Indian Kanoon"

    def __init__(self, client: httpx.Client | None = None) -> None:
        self._client = client

    @classmethod
    def _strip_html_tags(cls, raw_html: str) -> str:
        """Strip HTML tags and unescape entities for clean plain-text evidence."""
        if not raw_html:
            return ""
        parser = LegalHTMLToTextParser()
        parser.feed(raw_html)
        parser.close()
        return parser.get_text()

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
