from pydantic import BaseModel, ConfigDict, Field


class RequiredFact(BaseModel):
    """Factual field required to complete a legal draft."""
    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1)
    question: str = Field(min_length=1)
    evidence_required: bool = True


class TemplateSection(BaseModel):
    """Section specification defining structure and drafting constraints."""
    model_config = ConfigDict(extra="forbid")

    section_id: str = Field(min_length=1)
    heading: str = Field(min_length=1)
    purpose: str = Field(min_length=1)
    required: bool = True
    drafting_rules: list[str] = Field(default_factory=list)


class DraftTemplate(BaseModel):
    """Curated legal drafting template schema defining document structure and rules."""
    model_config = ConfigDict(extra="forbid")

    template_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    jurisdiction: str = "india"
    document_type: str = Field(min_length=1)
    version: int = 1
    description: str = Field(min_length=1)
    required_facts: list[RequiredFact] = Field(default_factory=list)
    sections: list[TemplateSection] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)


class TemplateSummary(BaseModel):
    """Compact summary of a drafting template for discovery."""
    model_config = ConfigDict(extra="forbid")

    template_id: str
    name: str
    document_type: str
    jurisdiction: str
    description: str
    section_count: int


class ListTemplatesRequest(BaseModel):
    """Filter parameters for template listing."""
    model_config = ConfigDict(extra="forbid")

    query: str | None = None
    document_type: str | None = None
    jurisdiction: str | None = None
    limit: int = Field(default=5, ge=1, le=20)


class GetTemplateRequest(BaseModel):
    """Request parameter for retrieving a specific template."""
    model_config = ConfigDict(extra="forbid")

    template_id: str = Field(min_length=1)
