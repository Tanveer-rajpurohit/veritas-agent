from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MatterCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=255, description="Short title of the legal matter")
    description: str | None = Field(default=None, max_length=2000, description="Brief synopsis of the dispute")
    case_number: str | None = Field(default=None, max_length=100, description="Court or tribunal case filing number")
    court: str | None = Field(default=None, max_length=255, description="Court or tribunal jurisdiction")
    matter_type: str = Field(default="Insolvency (IBC)", max_length=100, description="Practice area or matter category")
    stage: str = Field(default="Drafting", max_length=100, description="Current workflow stage")

    @field_validator("title")
    @classmethod
    def validate_title_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be empty or whitespace only")
        return cleaned


class MatterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None = None
    case_number: str | None = None
    court: str | None = None
    matter_type: str
    stage: str
    created_at: datetime
    updated_at: datetime
