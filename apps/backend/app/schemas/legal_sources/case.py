from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SearchCasesRequest(BaseModel):
    """Query parameters for case-law candidate discovery."""

    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=500)
    act_key: str | None = None
    provision: str | None = None
    court: str | None = "SC"
    limit: int = Field(default=5, ge=1, le=20)


class CaseCandidate(BaseModel):
    """Candidate judgment representation returned by discovery."""

    model_config = ConfigDict(extra="forbid")

    candidate_id: str
    provider: str
    title: str
    court: str | None = None
    date: str | None = None
    citation: str | None = None
    source_url: str | None = None
    is_fixture: bool = False
    limitations: list[str] = Field(default_factory=list)


class SearchCasesResponse(BaseModel):
    """Envelope for case-law search results."""

    model_config = ConfigDict(extra="forbid")

    provider: str
    candidates: list[CaseCandidate]


class FetchCaseRequest(BaseModel):
    """Request parameter for fetching and materializing a selected judgment."""

    model_config = ConfigDict(extra="forbid")

    candidate_id: str = Field(min_length=1)
    query: str | None = Field(default=None, max_length=500)


class FetchCaseResponse(BaseModel):
    """Materialized judgment response providing exact stored evidence."""

    model_config = ConfigDict(extra="forbid")

    evidence_span_id: UUID
    source_id: UUID
    source_version_id: UUID
    candidate_id: str
    title: str
    court: str | None = None
    date: str | None = None
    citation: str | None = None
    provider: str
    source_url: str | None = None
    retrieved_at: str
    content_sha256: str
    text: str
    summary: str | None = None
    is_fixture: bool = False
    limitations: list[str] = Field(default_factory=list)
