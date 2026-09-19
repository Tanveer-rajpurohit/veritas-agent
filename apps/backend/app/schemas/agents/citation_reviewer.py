from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CitationDimensionSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")

    dimension: Literal["identity", "quotation", "support", "treatment"]
    status: Literal["supported", "contradicted", "unresolved", "needs_review"]
    summary: str = Field(min_length=1, max_length=1000)
    finding_ids: list[UUID] = Field(default_factory=list, max_length=100)
    limitations: list[str] = Field(default_factory=list, max_length=10)


class CitationReviewerResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=2000)
    dimensions: list[CitationDimensionSummary] = Field(min_length=1, max_length=4)
    suggested_actions: list[str] = Field(default_factory=list, max_length=10)
    run_limitations: list[str] = Field(default_factory=list, max_length=10)
