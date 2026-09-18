from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class DraftCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(..., min_length=1, max_length=255)
    kind: str = Field(default="brief", max_length=100)
    content_json: dict[str, object] | None = None

    @field_validator("title")
    @classmethod
    def validate_title_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be empty or whitespace only")
        return cleaned


class DraftUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    kind: str | None = Field(default=None, max_length=100)
    content_json: dict[str, object] | None = None
    bump_version: bool = False

    @field_validator("title")
    @classmethod
    def validate_title_not_blank(cls, value: str | None) -> str | None:
        if value is not None:
            cleaned = value.strip()
            if not cleaned:
                raise ValueError("title must not be empty or whitespace only")
            return cleaned
        return value


class DraftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    matter_id: UUID
    title: str
    kind: str
    content_json: dict[str, object]
    version_no: int
    created_at: datetime
    updated_at: datetime
