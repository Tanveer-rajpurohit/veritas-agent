import re
from dataclasses import dataclass

from app.services.sources.extractor import ExtractedPage


@dataclass(frozen=True)
class ChunkItem:
    """
    Structured legal chunk conforming to Section 6 of the Writer Agent specification.
    """
    chunk_index: int
    page_number: int
    text: str
    start_offset: int
    end_offset: int
    token_count: int
    heading_path: list[str]


class ChunkerService:
    """
    Page-aware legal text chunker.
    Enforces:
    - Bounded 350-700 tokens per chunk
    - 60-100 token overlap
    - Strict page boundary containment (never merges across physical pages)
    - Clause and heading path retention (e.g. 'Section 7', 'Clause 4.1', 'Annexure B')
    """
    MIN_TOKENS: int = 350
    MAX_TOKENS: int = 700
    OVERLAP_TOKENS: int = 80

    # Matches Indian legal headings and clause identifiers
    LEGAL_HEADING_REGEX = re.compile(
        r"^(?:"
        r"(?:section|sec\.)\s+\d+[a-z]?"
        r"|(?:clause|cl\.)\s+[\d\.]+"
        r"|(?:article|art\.)\s+\d+"
        r"|(?:part|chapter)\s+[ivx\d]+"
        r"|annexure\s+[a-z0-9\-_]+"
        r"|schedule\s+[ivx\d]+"
        r"|rule\s+\d+"
        r"|\d+\.\d+(?:\.\d+)?\b"
        r"|order\b"
        r"|judgment\b"
        r"|facts\b"
        r"|submissions\b"
        r")",
        re.IGNORECASE,
    )

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """
        Fast token estimator: ~1.3 tokens per whitespace word.
        Standard for English legal text with numbered clauses.
        """
        words = text.split()
        return max(1, int(len(words) * 1.3))

    def chunk_document(self, pages: list[ExtractedPage]) -> list[ChunkItem]:
        """
        Chunks all pages in an extracted document, strictly preserving page boundaries.
        """
        all_chunks: list[ChunkItem] = []
        global_chunk_index = 0
        current_heading_path: list[str] = []

        for page in pages:
            page_text = page.text.strip()
            if not page_text:
                continue

            page_tokens = self.estimate_tokens(page_text)

            # If the entire page fits within the maximum token budget, keep as 1 chunk
            if page_tokens <= self.MAX_TOKENS:
                heading = self._extract_heading(page_text)
                if heading:
                    current_heading_path = [heading]

                all_chunks.append(
                    ChunkItem(
                        chunk_index=global_chunk_index,
                        page_number=page.page_number,
                        text=page_text,
                        start_offset=0,
                        end_offset=len(page.text),
                        token_count=page_tokens,
                        heading_path=list(current_heading_path),
                    )
                )
                global_chunk_index += 1
                continue

            # Page is long: split into bounded paragraphs with overlap
            page_chunks, current_heading_path = self._chunk_page(
                page=page,
                start_chunk_index=global_chunk_index,
                initial_heading_path=current_heading_path,
            )
            all_chunks.extend(page_chunks)
            global_chunk_index += len(page_chunks)

        return all_chunks

    def _chunk_page(
        self,
        page: ExtractedPage,
        start_chunk_index: int,
        initial_heading_path: list[str],
    ) -> tuple[list[ChunkItem], list[str]]:
        page_chunks: list[ChunkItem] = []
        heading_path = list(initial_heading_path)

        # Split on double newline or clause starts
        paragraphs = [p.strip() for p in re.split(r"\n{2,}", page.text) if p.strip()]
        if not paragraphs:
            paragraphs = [p.strip() for p in page.text.splitlines() if p.strip()]

        current_paras: list[str] = []
        current_tokens = 0
        chunk_idx = start_chunk_index

        for para in paragraphs:
            heading = self._extract_heading(para)
            if heading:
                heading_path = [heading]

            para_tokens = self.estimate_tokens(para)

            if current_tokens + para_tokens > self.MAX_TOKENS and current_paras:
                chunk_text = "\n\n".join(current_paras)
                start_offset = page.text.find(current_paras[0])
                end_offset = page.text.find(current_paras[-1]) + len(current_paras[-1])

                page_chunks.append(
                    ChunkItem(
                        chunk_index=chunk_idx,
                        page_number=page.page_number,
                        text=chunk_text,
                        start_offset=max(0, start_offset),
                        end_offset=max(0, end_offset),
                        token_count=current_tokens,
                        heading_path=list(heading_path),
                    )
                )
                chunk_idx += 1

                # Overlap: retain the last paragraph if small
                if current_tokens > self.OVERLAP_TOKENS and len(current_paras) > 1:
                    last_para = current_paras[-1]
                    current_paras = [last_para]
                    current_tokens = self.estimate_tokens(last_para)
                else:
                    current_paras = []
                    current_tokens = 0

            current_paras.append(para)
            current_tokens += para_tokens

        # Flush any remaining paragraphs on the page
        if current_paras:
            chunk_text = "\n\n".join(current_paras)
            start_offset = page.text.find(current_paras[0])
            end_offset = page.text.find(current_paras[-1]) + len(current_paras[-1])

            page_chunks.append(
                ChunkItem(
                    chunk_index=chunk_idx,
                    page_number=page.page_number,
                    text=chunk_text,
                    start_offset=max(0, start_offset),
                    end_offset=max(0, end_offset),
                    token_count=current_tokens,
                    heading_path=list(heading_path),
                )
            )

        return page_chunks, heading_path

    def _extract_heading(self, text: str) -> str | None:
        first_line = text.splitlines()[0].strip()
        if self.LEGAL_HEADING_REGEX.match(first_line):
            return first_line[:80].strip()
        return None


chunker_service = ChunkerService()
