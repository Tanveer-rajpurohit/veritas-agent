from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=12, max_length=256)
    display_name: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=256)


class VerifyEmailRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=1, max_length=256)


class ResendVerificationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: str = Field(min_length=3, max_length=320)


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    token: str = Field(min_length=1, max_length=256)
    new_password: str = Field(min_length=12, max_length=256)


class UpdateProfileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, max_length=255)
    display_name: str | None = Field(default=None, max_length=255)
    phone_number: str | None = Field(default=None, max_length=32)
    law_firm: str | None = Field(default=None, max_length=255)
    bar_council_number: str | None = Field(default=None, max_length=64)
    avatar_url: str | None = Field(default=None, max_length=1024)
    city: str | None = Field(default=None, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    display_name: str | None = None
    email_verified: bool = False
    full_name: str | None = None
    phone_number: str | None = None
    law_firm: str | None = None
    bar_council_number: str | None = None
    avatar_url: str | None = None
    city: str | None = None
    created_at: datetime
    updated_at: datetime


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    expires_at: datetime
    last_seen_at: datetime
    is_current: bool = False


class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    request_id: str | None = None
    details: Any = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail
