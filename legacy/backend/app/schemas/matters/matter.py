from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class MatterCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(
        ..., min_length=1, max_length=255, description="Short title of the legal matter"
    )
    description: str | None = Field(
        default=None, max_length=2000, description="Brief synopsis of the dispute"
    )
    case_number: str | None = Field(
        default=None, max_length=100, description="Court or tribunal case filing number"
    )
    court: str | None = Field(
        default=None, max_length=255, description="Court or tribunal jurisdiction"
    )
    matter_type: str = Field(
        default="Insolvency (IBC)", max_length=100, description="Practice area or matter category"
    )
    stage: str = Field(default="Drafting", max_length=100, description="Current workflow stage")

    @field_validator("title")
    @classmethod
    def validate_title_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be empty or whitespace only")
        return cleaned


class MatterUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(
        default=None, min_length=1, max_length=255, description="Short title of the legal matter"
    )
    description: str | None = Field(
        default=None, max_length=2000, description="Brief synopsis of the dispute"
    )
    case_number: str | None = Field(
        default=None, max_length=100, description="Court or tribunal case filing number"
    )
    court: str | None = Field(
        default=None, max_length=255, description="Court or tribunal jurisdiction"
    )
    matter_type: str | None = Field(
        default=None, max_length=100, description="Practice area or matter category"
    )
    stage: str | None = Field(default=None, max_length=100, description="Current workflow stage")

    @field_validator("title")
    @classmethod
    def validate_title_not_blank(cls, value: str | None) -> str | None:
        if value is not None:
            cleaned = value.strip()
            if not cleaned:
                raise ValueError("title must not be empty or whitespace only")
            return cleaned
        return value


MatterRole = Literal["owner", "editor", "reviewer", "viewer"]


class MatterResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    description: str | None = None
    case_number: str | None = None
    court: str | None = None
    matter_type: str
    stage: str
    created_by: UUID
    role: MatterRole | None = None
    created_at: datetime
    updated_at: datetime


class MatterMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    matter_id: UUID
    user_id: UUID
    role: MatterRole
    email: str | None = None
    created_at: datetime
    created_by: UUID | None = None


class AddMemberRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: UUID | None = Field(default=None, description="Target user ID")
    email: str | None = Field(default=None, description="Target user email")
    role: MatterRole = Field(description="Role to assign: owner, editor, reviewer, or viewer")

    @field_validator("email")
    @classmethod
    def validate_email_format(cls, value: str | None) -> str | None:
        if value is not None:
            cleaned = value.strip().lower()
            if "@" not in cleaned:
                raise ValueError("Invalid email address")
            return cleaned
        return value

    @model_validator(mode="after")
    def require_one_user_identifier(self) -> "AddMemberRequest":
        if (self.user_id is None) == (self.email is None):
            raise ValueError("Provide exactly one of user_id or email")
        return self


class UpdateMemberRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: MatterRole = Field(description="Role to update: owner, editor, reviewer, or viewer")
