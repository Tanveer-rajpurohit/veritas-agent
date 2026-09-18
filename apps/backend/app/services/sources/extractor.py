import hashlib
from pathlib import Path

from app.schemas.sources import ExtractedDocument, ExtractedPage


class ExtractorService:
    """Extracts text and page geometry using PyMuPDF."""

    VERSION: str = "1.0.0"

    @staticmethod
    def _compute_sha256(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    def extract_from_bytes(
        self,
        file_bytes: bytes,
        filename: str = "document.pdf",
    ) -> ExtractedDocument:
        """Extracts text, checksums, and dimensions directly from in-memory bytes."""
        import fitz

        ext = Path(filename).suffix.lower()
        if ext in (".txt", ".md"):
            return self._extract_plain_text(file_bytes)

        doc = fitz.open(stream=file_bytes, filetype="pdf")
        return self._process_fitz_doc(doc, method="pymupdf")

    def extract_from_file(self, file_path: str | Path) -> ExtractedDocument:
        """Extracts text, checksums, and dimensions from a local file path."""
        import fitz

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

            raw_text = page.get_text("text").strip()
            char_count = len(raw_text)
            total_chars += char_count

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
        text = content.decode("utf-8", errors="replace").strip()
        text_hash = self._compute_sha256(text)

        single_page = ExtractedPage(
            page_number=1,
            text=text,
            text_sha256=text_hash,
            extraction_confidence=1.0,
            width_points=595.0,
            height_points=842.0,
        )

        return ExtractedDocument(
            pages=[single_page],
            page_count=1,
            extraction_method="plaintext",
            extraction_version=self.VERSION,
            is_scanned=False,
        )


extractor_service = ExtractorService()
