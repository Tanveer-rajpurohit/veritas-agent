import uuid
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


class DocumentOperation(BaseModel):
    """Represents an atomic, validated document revision operation."""
    model_config = ConfigDict(extra="forbid")

    type: Literal["insert_paragraph", "replace_block", "delete_block", "append_section"] = Field(
        description="The atomic operation type to perform on the document."
    )
    position: str = Field(
        min_length=1,
        max_length=128,
        description="Target block or section identifier where the operation applies."
    )
    text: str = Field(
        default="",
        max_length=50_000,
        description="The draft proposition or legal argument to insert or replace."
    )
    evidence_span_ids: list[uuid.UUID] = Field(
        default_factory=list,
        description="List of verified EvidenceSpan UUIDs materialized from source passages."
    )

    @field_validator("position")
    @classmethod
    def validate_position(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("position must not be empty or whitespace")
        return value


class WriterResult(BaseModel):
    """Structured output envelope returned by the Writer Agent."""
    model_config = ConfigDict(extra="forbid")

    operations: list[DocumentOperation] = Field(
        default_factory=list,
        description="Ordered list of proposed document mutations."
    )
    assumptions: list[str] = Field(
        default_factory=list,
        description="Explicit factual or legal assumptions made where records were silent."
    )
    unresolved_questions: list[str] = Field(
        default_factory=list,
        description="Open questions or missing evidentiary records requiring clarification."
    )


class WriterRunRequest(BaseModel):
    """Application request parameters to trigger a Writer Agent drafting workflow."""
    model_config = ConfigDict(extra="forbid")

    matter_id: uuid.UUID = Field(
        description="Authorized Matter boundary."
    )
    instruction: str = Field(
        min_length=3,
        max_length=10_000,
        description="Specific user instruction guiding the legal drafting task."
    )
    document_id: uuid.UUID | None = Field(
        default=None,
        description="Target document aggregate to update, or None if drafting a new document."
    )
    base_version_id: uuid.UUID | None = Field(
        default=None,
        description="Base immutable version ID if revising an existing document."
    )
    target_section: str | None = Field(
        default=None,
        max_length=128,
        description="Optional scope limiter to focus drafting on a specific section."
    )
    source_types: list[str] | None = Field(
        default=None,
        description="Optional filter on source types."
    )

    @field_validator("instruction")
    @classmethod
    def validate_instruction(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("instruction must not be empty or whitespace")
        return value


class WriterRunResponse(BaseModel):
    """Response returned upon completion of a Writer Agent execution."""
    model_config = ConfigDict(extra="ignore")

    matter_id: uuid.UUID
    result: WriterResult
    model_id: str
    execution_time_ms: float
