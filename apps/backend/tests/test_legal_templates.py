import pytest

from app.schemas.legal_sources.template import DraftTemplate, TemplateSummary
from app.services.legal_sources.templates import TEMPLATES_RAW, template_service


def test_template_registry_count_and_uniqueness() -> None:
    template_ids = template_service.template_ids
    assert len(template_ids) == 15
    assert len(set(template_ids)) == 15


def test_every_raw_template_validates_as_draft_template() -> None:
    for raw in TEMPLATES_RAW:
        template = DraftTemplate.model_validate(raw)
        assert template.version >= 1
        assert template.jurisdiction == "india"
        assert len(template.sections) >= 3
        assert len(template.required_facts) >= 1
        assert len(template.limitations) >= 1

        section_ids = [s.section_id for s in template.sections]
        assert len(section_ids) == len(set(section_ids)), (
            f"Duplicate section ID in {template.template_id}"
        )


def test_list_templates_returns_summaries_only() -> None:
    summaries = template_service.list_templates(limit=5)
    assert len(summaries) == 5
    for s in summaries:
        assert isinstance(s, TemplateSummary)
        assert hasattr(s, "section_count")
        assert not hasattr(s, "sections")
        assert not hasattr(s, "required_facts")


def test_list_templates_filters_by_document_type() -> None:
    briefs = template_service.list_templates(document_type="working_brief")
    assert len(briefs) >= 1
    assert briefs[0].template_id == "ibc_section_7_working_brief"


def test_get_template_unknown_id_raises() -> None:
    with pytest.raises(ValueError, match="not found"):
        template_service.get_template("non_existent_template_xyz")


def test_template_examples_never_expose_evidence_spans() -> None:
    for raw in TEMPLATES_RAW:
        serialized = str(raw)
        assert "evidence_span_id" not in serialized
        assert "evidence_span_ids" not in serialized
