from dataclasses import dataclass


@dataclass(frozen=True)
class ExtractedPage:
    page_number: int
    text: str
    text_sha256: str
    extraction_confidence: float
    width_points: float
    height_points: float


@dataclass(frozen=True)
class ExtractedDocument:
    pages: list[ExtractedPage]
    page_count: int
    extraction_method: str
    extraction_version: str
    is_scanned: bool
