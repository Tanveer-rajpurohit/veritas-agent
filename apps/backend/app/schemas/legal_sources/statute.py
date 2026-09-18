from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SearchStatutesRequest(BaseModel):
    """Query parameters for statutory candidate discovery."""

    model_config = ConfigDict(extra="forbid")

    query: str = Field(min_length=1, max_length=500)
    limit: int = Field(default=5, ge=1, le=20)


class StatuteCandidate(BaseModel):
    """Candidate statutory provision representation returned by discovery."""

    model_config = ConfigDict(extra="forbid")

    act_key: str
    provision: str
    unit: Literal["section", "article", "rule"]
    act_title: str
    heading: str
    provider_url: str | None = None


class SearchStatutesResponse(BaseModel):
    """Envelope for statutory candidate search results."""

    model_config = ConfigDict(extra="forbid")

    provider: str
    candidates: list[StatuteCandidate]


class LookupStatuteRequest(BaseModel):
    """Exact provision lookup request."""

    model_config = ConfigDict(extra="forbid")

    act_key: str = Field(min_length=1, max_length=128)
    provision: str = Field(min_length=1, max_length=64)
    unit: Literal["section", "article", "rule"] = "section"


class LookupStatuteResponse(BaseModel):
    """Materialized statutory provision response providing exact stored evidence."""

    model_config = ConfigDict(extra="forbid")

    evidence_span_id: UUID
    source_id: UUID
    source_version_id: UUID
    act_key: str
    provision: str
    unit: str
    heading: str
    provider: str
    provider_url: str | None = None
    official_source_url: str | None = None
    retrieved_at: str
    content_sha256: str
    text: str
    limitations: list[str] = Field(default_factory=list)
