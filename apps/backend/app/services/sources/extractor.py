import hashlib
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class ExtractedPage:
    """
    Represents the text and visual dimensions extracted from a single physical document page.
    """
    page_number: int
    text: str
    text_sha256: str
    extraction_confidence: float
    width_points: float
    height_points: float


@dataclass(frozen=True)
class ExtractedDocument:
    """
    Aggregated extraction result for an entire source version.
    """
    pages: list[ExtractedPage]
    page_count: int
    extraction_method: str
    extraction_version: str
    is_scanned: bool


class ExtractorService:
    """
    Extracts text and page geometry using PyMuPDF (fitz).
    Free, local, offline, sub-millisecond per page.
    """
    VERSION: str = "1.0.0"

    @staticmethod
    def _compute_sha256(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def extract_from_bytes(
        self,
        file_bytes: bytes,
        filename: str = "document.pdf",
    ) -> ExtractedDocument:
        """
        Extracts pages directly from raw in-memory bytes.
        """
        import fitz  # PyMuPDF

        ext = Path(filename).suffix.lower()
        if ext in (".txt", ".md"):
            return self._extract_plain_text(file_bytes)

        # Process PDF through PyMuPDF
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return self._process_fitz_doc(doc, method="pymupdf")

    def extract_from_file(self, file_path: str | Path) -> ExtractedDocument:
        """
        Extracts pages from a file path on disk.
        """
        import fitz  # PyMuPDF

        path = Path(file_path)
        if path.suffix.lower() in (".txt", ".md"):
            return self._extract_plain_text(path.read_bytes())

        doc = fitz.open(str(path))
        return self._process_fitz_doc(doc, method="pymupdf")

    def _process_fitz_doc(self, doc, method: str) -> ExtractedDocument:
        pages: list[ExtractedPage] = []
        total_chars = 0
        total_pages = len(doc)
        has_scanned_pages = False

        for idx, page in enumerate(doc):
            page_num = idx + 1
            rect = page.rect
            width = float(rect.width)
            height = float(rect.height)

            # Extract raw verbatim text
            raw_text = page.get_text("text").strip()
            char_count = len(raw_text)
            total_chars += char_count

            # Detect whether page is scanned image (has image blocks but very little text)
            images = page.get_images()
            confidence = 1.0
            if char_count < 30 and len(images) > 0:
                confidence = 0.2
                has_scanned_pages = True

            text_hash = self._compute_sha256(raw_text)

            pages.append(
                ExtractedPage(
                    page_number=page_num,
                    text=raw_text,
                    text_sha256=text_hash,
                    extraction_confidence=confidence,
                    width_points=width,
                    height_points=height,
                )
            )

        doc.close()

        # Document-wide scan detection (average < 50 chars per page across document)
        avg_chars_per_page = (total_chars / total_pages) if total_pages > 0 else 0
        is_scanned = has_scanned_pages or (avg_chars_per_page < 50)

        return ExtractedDocument(
            pages=pages,
            page_count=total_pages,
            extraction_method=method,
            extraction_version=self.VERSION,
            is_scanned=is_scanned,
        )

    def _extract_plain_text(self, content: bytes) -> ExtractedDocument:
        """
        Fallback for plain text or markdown documents (treated as a single 1-page document).
        """
        text = content.decode("utf-8", errors="replace").strip()
        text_hash = self._compute_sha256(text)

        single_page = ExtractedPage(
            page_number=1,
            text=text,
            text_sha256=text_hash,
            extraction_confidence=1.0,
            width_points=595.0,  # Standard A4 width points
            height_points=842.0, # Standard A4 height points
        )

        return ExtractedDocument(
            pages=[single_page],
            page_count=1,
            extraction_method="plaintext",
            extraction_version=self.VERSION,
            is_scanned=False,
        )


extractor_service = ExtractorService()
