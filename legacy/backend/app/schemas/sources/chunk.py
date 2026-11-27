from dataclasses import dataclass


@dataclass(frozen=True)
class ChunkItem:
    chunk_index: int
    page_number: int
    text: str
    start_offset: int
    end_offset: int
    token_count: int
    heading_path: list[str]
