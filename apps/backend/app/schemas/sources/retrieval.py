import uuid
from pydantic import BaseModel, ConfigDict, Field


class SourcePassage(BaseModel):
    """
    Evidence passage returned to the Writer Agent conforming to Section 8 of the specification.
    """
    model_config = ConfigDict(extra="ignore")

    passage_id: uuid.UUID
    source_id: uuid.UUID
    source_version_id: uuid.UUID
    source_type: str
    authority_level: str
    title: str
    page: int
    text: str
    start_offset: int
    end_offset: int
    token_count: int
    file_sha256: str
    heading_path: list[str] = Field(default_factory=list)
    official_url: str | None = None
    distance: float | None = None


class SearchSourcesRequest(BaseModel):
    """
    Query parameters for Writer Agent evidence retrieval.
    """
    model_config = ConfigDict(extra="forbid")

    matter_id: uuid.UUID | None = None
    query: str = Field(min_length=1, max_length=2000)
    source_types: list[str] | None = None
    limit: int = Field(default=8, ge=1, le=20)


class CreateEvidenceSpanRequest(BaseModel):
    """
    Creates an auditable evidence span linked to exact chunk and page text.
    """
    model_config = ConfigDict(extra="forbid")

    source_version_id: uuid.UUID
    page_id: uuid.UUID | None = None
    chunk_id: uuid.UUID | None = None
    start_offset: int = Field(ge=0)
    end_offset: int = Field(ge=0)
    quoted_text: str = Field(min_length=1)
    created_by: str = Field(default="writer_agent")


class EvidenceSpanResponse(BaseModel):
    """
    Audited evidence span representation returned by get_evidence_spans.
    """
    model_config = ConfigDict(extra="ignore")

    id: uuid.UUID
    source_version_id: uuid.UUID
    page_id: uuid.UUID | None = None
    chunk_id: uuid.UUID | None = None
    start_offset: int
    end_offset: int
    quoted_text: str
    quoted_text_sha256: str
    created_by: str
