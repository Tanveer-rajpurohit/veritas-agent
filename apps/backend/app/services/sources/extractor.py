import hashlib
from pathlib import Path

import pymupdf

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
        ext = Path(filename).suffix.lower()
        if ext in (".txt", ".md"):
            return self._extract_plain_text(file_bytes)

        doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        return self._process_fitz_doc(doc, method="pymupdf", filename=filename)

    def extract_from_file(self, file_path: str | Path) -> ExtractedDocument:
        path = Path(file_path)
        if path.suffix.lower() in (".txt", ".md"):
            return self._extract_plain_text(path.read_bytes())

        doc = pymupdf.open(str(path))
        return self._process_fitz_doc(doc, method="pymupdf", filename=path.name)

    def _try_ocr_page(self, page) -> str | None:
        try:
            tp = page.get_textpage_ocr(dpi=150)
            text = tp.extractText().strip()
            if text:
                return text
        except Exception:
            pass

        try:
            from rapidocr_onnxruntime import RapidOCR
            engine = RapidOCR()
            pix = page.get_pixmap(dpi=150)
            result, _ = engine(pix.tobytes("png"))
            if result:
                lines = [line[1] for line in result if line and len(line) > 1 and line[1]]
                if lines:
                    return "\n".join(lines).strip()
        except Exception:
            pass

        try:
            import io
            import pytesseract
            from PIL import Image
            pix = page.get_pixmap(dpi=150)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            text = pytesseract.image_to_string(img).strip()
            if text:
                return text
        except Exception:
            pass

        return None

    def _process_fitz_doc(self, doc, method: str, filename: str = "document.pdf") -> ExtractedDocument:
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
            if not raw_text or len(raw_text) < 30:
                blocks = page.get_text("blocks")
                block_texts = [b[4].strip() for b in blocks if len(b) > 4 and b[4].strip()]
                if block_texts:
                    raw_text = "\n".join(block_texts).strip()

            images = page.get_images()
            confidence = 1.0
            if len(raw_text) < 30 and len(images) > 0:
                ocr_candidate = self._try_ocr_page(page)
                if ocr_candidate:
                    raw_text = ocr_candidate
                    confidence = 0.85
                else:
                    confidence = 0.4
                    has_scanned_pages = True

            if not raw_text:
                has_scanned_pages = True
                confidence = 0.3
                meta_title = (doc.metadata.get("title") or "").strip()
                lines = [
                    f"[{filename} - Page {page_num} of {total_pages}: Scanned evidence record ({int(width)}x{int(height)} pt)]"
                ]
                if meta_title:
                    lines.append(f"Title: {meta_title}")
                raw_text = "\n".join(lines)

            char_count = len(raw_text)
            total_chars += char_count
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
