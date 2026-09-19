import hashlib
import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session
from strands import tool
from strands.tools.decorator import DecoratedFunctionTool

from app.models.reviews.finding import Finding, FindingEvidence
from app.schemas.agents.fact_reviewer import (
    FactClaim,
    FactCorrectionCandidate,
    ProposedFactFinding,
)
from app.schemas.agents.writer import DocumentOperation
from app.schemas.sources import CreateEvidenceSpanRequest
from app.services.drafts import draft_service
from app.services.legal_sources import company_master_adapter, ecourts_adapter, legal_materializer
from app.services.sources.retrieval import retrieval_service


class FactReviewerToolHandlers:
    """Server-scoped execution handlers for Fact Reviewer tools with strict Matter isolation."""

    def __init__(
        self,
        db: Session,
        matter_id: UUID,
        document_version_id: UUID,
        claims: list[FactClaim] | None = None,
        max_tool_calls: int = 12,
    ) -> None:
        self._db = db
        self._matter_id = matter_id
        self._document_version_id = document_version_id
        self._claims = claims or []
        self._claim_map: dict[UUID, FactClaim] = {c.id: c for c in self._claims}
        self._correction_candidates: dict[UUID, FactCorrectionCandidate] = {}
        self.max_tool_calls = max_tool_calls
        self.tool_call_count = 0
        self.submitted_findings: list[ProposedFactFinding] = []

    def _record_tool_call(self) -> None:
        self.tool_call_count += 1
        if self.tool_call_count > self.max_tool_calls:
            raise RuntimeError(
                f"Tool call limit exceeded: maximum {self.max_tool_calls} tool calls allowed per review run."
            )

    def register_correction_candidate(self, candidate: FactCorrectionCandidate) -> None:
        self._correction_candidates[candidate.candidate_id] = candidate

    def get_review_claims(
        self,
        document_version_id: str,
        block_ids: list[str] | None = None,
    ) -> dict[str, object]:
        self._record_tool_call()
        req_version_id = UUID(document_version_id)
        if req_version_id != self._document_version_id:
            raise ValueError(
                "Requested document_version_id does not match the active review target"
            )

        filtered = [
            c
            for c in self._claims
            if not block_ids or c.block_id in block_ids or str(c.block_index) in block_ids
        ]
        return {
            "document_version_id": str(self._document_version_id),
            "claims": [c.model_dump(mode="json") for c in filtered],
        }

    def search_matter_evidence(
        self,
        claim_id: str,
        query: str,
        source_types: list[str] | None = None,
        limit: int = 6,
    ) -> dict[str, object]:
        self._record_tool_call()
        cid = UUID(claim_id)
        if cid not in self._claim_map:
            raise ValueError(f"Claim ID {claim_id} is not part of this document version")

        if not query.strip():
            raise ValueError("query cannot be empty")
        if len(query) > 500:
            raise ValueError("query must be at most 500 characters")
        if not 1 <= limit <= 10:
            raise ValueError("limit must be between 1 and 10")

        passages = retrieval_service.search_sources(
            db=self._db,
            query=query,
            matter_id=self._matter_id,
            source_types=source_types,
            limit=limit,
        )
        return {
            "claim_id": claim_id,
            "passages": [passage.model_dump(mode="json") for passage in passages],
        }

    def materialize_fact_evidence(
        self,
        claim_id: str,
        passage_ids: list[str],
    ) -> dict[str, object]:
        self._record_tool_call()
        cid = UUID(claim_id)
        if cid not in self._claim_map:
            raise ValueError(f"Claim ID {claim_id} is not part of this document version")

        if len(passage_ids) > 10:
            raise ValueError("At most 10 passage IDs can be materialized per tool call")

        evidence_spans: list[dict[str, Any]] = []
        for pid in passage_ids:
            span = retrieval_service.create_evidence_span(
                db=self._db,
                req=CreateEvidenceSpanRequest(
                    matter_id=self._matter_id,
                    passage_id=UUID(pid),
                ),
            )
            evidence_spans.append(span.model_dump(mode="json"))

        return {
            "claim_id": claim_id,
            "evidence_spans": evidence_spans,
        }

    def submit_fact_findings(
        self,
        document_version_id: str,
        findings: list[dict[str, Any]],
    ) -> dict[str, object]:
        self._record_tool_call()
        req_version_id = UUID(document_version_id)
        if req_version_id != self._document_version_id:
            raise ValueError(
                "Requested document_version_id does not match the active review target"
            )

        if len(findings) > 100:
            raise ValueError("A single submission cannot exceed 100 findings")

        created_finding_ids: list[str] = []
        for raw in findings:
            finding_item = ProposedFactFinding.model_validate(raw)
            if finding_item.claim_id not in self._claim_map:
                raise ValueError(f"Finding references unknown claim_id: {finding_item.claim_id}")

            claim = self._claim_map[finding_item.claim_id]

            if finding_item.status in {"supported", "contradicted"} and not finding_item.evidence:
                finding_item.status = "unresolved"
                finding_item.reason = "No authoritative evidence span provided to support finding."

            span_ids = [link.evidence_span_id for link in finding_item.evidence]
            if span_ids:
                retrieval_service.get_evidence_spans(
                    db=self._db,
                    matter_id=self._matter_id,
                    span_ids=span_ids,
                )

            recomputed_hash = hashlib.sha256(claim.text.strip().encode()).hexdigest()

            db_finding = Finding(
                claim_id=claim.id,
                document_version_id=self._document_version_id,
                block_index=claim.block_index,
                claim_text=claim.text,
                claim_sha256=recomputed_hash,
                dimension=finding_item.dimension,
                status=finding_item.status,
                method=finding_item.method,
                reason=finding_item.reason,
                limitations=finding_item.limitations,
                checked_at=datetime.now(UTC),
                stale_at=None,
            )
            self._db.add(db_finding)
            self._db.flush()

            for link in finding_item.evidence:
                self._db.add(
                    FindingEvidence(
                        finding_id=db_finding.id,
                        evidence_span_id=link.evidence_span_id,
                        relation=link.relation,
                    )
                )

            created_finding_ids.append(str(db_finding.id))
            self.submitted_findings.append(finding_item)

        self._db.commit()
        return {
            "submitted_count": len(created_finding_ids),
            "finding_ids": created_finding_ids,
        }

    def lookup_public_registry(
        self,
        claim_id: str,
        registry: str,
        query: str,
    ) -> dict[str, object]:
        self._record_tool_call()
        cid = UUID(claim_id)
        if cid not in self._claim_map:
            raise ValueError(f"Claim ID {claim_id} is not part of this document version")

        allowed_registries = {"ibbi_public_announcement", "ibbi"}
        if registry.lower() not in allowed_registries:
            return {
                "status": "unavailable",
                "message": f"Registry '{registry}' is not permitted. Only approved registries are allowlisted.",
                "passages": [],
            }

        if len(query) > 500:
            raise ValueError("query must be at most 500 characters")

        return {
            "status": "unavailable",
            "message": "IBBI registry adapter is temporarily offline or unconfigured for this environment.",
            "passages": [],
        }

    def lookup_company_master(self, claim_id: str, cin: str) -> dict[str, object]:
        self._record_tool_call()
        cid = UUID(claim_id)
        if cid not in self._claim_map:
            raise ValueError(f"Claim ID {claim_id} is not part of this document version")

        try:
            result = company_master_adapter.lookup_by_cin(cin)
            record = result["record"]
            company_name = str(record.get("company_name") or record.get("companyname") or cin)
            evidence_text = json.dumps(
                {
                    "provider": result["provider"],
                    "retrieved_for_cin": result["cin"],
                    "dataset_updated_date": result.get("updated_date"),
                    "record": record,
                    "limitations": result["limitations"],
                },
                ensure_ascii=False,
                sort_keys=True,
            )
            span, source, version = legal_materializer.materialize_legal_text(
                db=self._db,
                title=f"MCA Company Master Data - {company_name}",
                text=evidence_text,
                source_type="registry_record",
                official_url=result["source_url"],
                authority_level="official_primary",
                heading_path=["Company Master Data"],
            )
            return {
                "status": "available",
                "claim_id": claim_id,
                "evidence_span_id": str(span.id),
                "source_id": str(source.id),
                "source_version_id": str(version.id),
                **result,
            }
        except Exception:
            return {
                "status": "unavailable",
                "claim_id": claim_id,
                "message": "The MCA Company Master Data provider could not confirm this CIN.",
                "limitations": [
                    "Do not treat an unavailable or missing registry result as a contradiction."
                ],
            }

    def request_fact_fix(
        self,
        document_version_id: str,
        correction_candidate_ids: list[str],
        idempotency_key: str,
    ) -> dict[str, object]:
        self._record_tool_call()
        req_version_id = UUID(document_version_id)
        if req_version_id != self._document_version_id:
            raise ValueError("Requested document_version_id does not match active review target")

        applied_ids: list[str] = []
        blocked_ids: list[str] = []
        safe_candidates: list[FactCorrectionCandidate] = []

        for cid_str in correction_candidate_ids:
            cid = UUID(cid_str)
            candidate = self._correction_candidates.get(cid)
            if not candidate:
                blocked_ids.append(cid_str)
                continue
            if candidate.safety != "safe":
                blocked_ids.append(cid_str)
                continue
            safe_candidates.append(candidate)
            applied_ids.append(cid_str)

        if not safe_candidates:
            return {
                "new_version_id": None,
                "applied_candidate_ids": applied_ids,
                "blocked_candidate_ids": blocked_ids,
            }

        current_version = draft_service.get_document_version(
            db=self._db,
            version_id=self._document_version_id,
            matter_id=self._matter_id,
        )

        operations: list[DocumentOperation] = []
        for candidate in safe_candidates:
            claim = self._claim_map[candidate.claim_id]
            operations.append(
                DocumentOperation(
                    type="replace_block",
                    position=claim.block_id or str(claim.block_index),
                    text=candidate.replacement_text,
                    evidence_span_ids=candidate.evidence_span_ids,
                )
            )

        new_version = draft_service.propose_document_ops(
            db=self._db,
            matter_id=self._matter_id,
            draft_id=current_version.draft_id,
            base_version_id=self._document_version_id,
            operations=operations,
            change_summary="Fact Reviewer safe automated correction applied",
            created_by_id="fact_reviewer",
        )

        return {
            "new_version_id": str(new_version.id),
            "applied_candidate_ids": applied_ids,
            "blocked_candidate_ids": blocked_ids,
        }

    def lookup_legal_fact(
        self,
        act_key: str,
        provision: str,
        unit: str = "section",
    ) -> dict[str, object]:
        self._record_tool_call()
        try:
            raw_prov = ecourts_adapter.get_provision(
                act_key=act_key, provision=provision, unit=unit
            )
            span, source, version = legal_materializer.materialize_legal_text(
                db=self._db,
                title=f"{raw_prov['act_title']} - {unit.capitalize()} {provision}",
                text=raw_prov["text"],
                source_type="statute",
                official_url=raw_prov.get("official_source_url") or raw_prov.get("provider_url"),
                heading_path=[f"{unit.capitalize()} {provision}"],
            )
            return {
                "status": "available",
                "evidence_span_id": str(span.id),
                "source_id": str(source.id),
                "source_version_id": str(version.id),
                "act_key": raw_prov["act_key"],
                "provision": raw_prov["provision"],
                "unit": raw_prov["unit"],
                "text": raw_prov["text"],
                "official_url": raw_prov.get("official_source_url"),
            }
        except Exception:
            return {
                "status": "unavailable",
                "message": "The live legal-text provider could not confirm this provision.",
            }


def create_fact_reviewer_tools(
    db: Session,
    matter_id: UUID,
    document_version_id: UUID,
    claims: list[FactClaim] | None = None,
    allow_fixes: bool = False,
    max_tool_calls: int = 12,
) -> tuple[list[DecoratedFunctionTool], FactReviewerToolHandlers]:
    """Constructs the 7 bounded Fact Reviewer tools scoped to the authorized Matter."""
    handlers = FactReviewerToolHandlers(
        db=db,
        matter_id=matter_id,
        document_version_id=document_version_id,
        claims=claims,
        max_tool_calls=max_tool_calls,
    )

    @tool(name="get_review_claims")
    def get_review_claims(
        document_version_id: str,
        block_ids: list[str] | None = None,
    ) -> dict[str, object]:
        """Obtain the authorized extracted factual claims for the current document version."""
        return handlers.get_review_claims(document_version_id, block_ids)

    @tool(name="search_matter_evidence")
    def search_matter_evidence(
        claim_id: str,
        query: str,
        source_types: list[str] | None = None,
        limit: int = 6,
    ) -> dict[str, object]:
        """Search client-record evidence passages within the authorized Matter boundary."""
        return handlers.search_matter_evidence(claim_id, query, source_types, limit)

    @tool(name="materialize_fact_evidence")
    def materialize_fact_evidence(
        claim_id: str,
        passage_ids: list[str],
    ) -> dict[str, object]:
        """Materialize passage IDs into immutable EvidenceSpan records for finding attribution."""
        return handlers.materialize_fact_evidence(claim_id, passage_ids)

    @tool(name="submit_fact_findings")
    def submit_fact_findings(
        document_version_id: str,
        findings: list[dict[str, Any]],
    ) -> dict[str, object]:
        """Persist structured review findings backed by verified EvidenceSpans."""
        return handlers.submit_fact_findings(document_version_id, findings)

    @tool(name="lookup_public_registry")
    def lookup_public_registry(
        claim_id: str,
        registry: str,
        query: str,
    ) -> dict[str, object]:
        """Query an allowlisted official public registry (e.g. IBBI public announcement) for public facts."""
        return handlers.lookup_public_registry(claim_id, registry, query)

    @tool(name="lookup_company_master")
    def lookup_company_master(claim_id: str, cin: str) -> dict[str, object]:
        """Look up official MCA company master fields for one exact CIN via data.gov.in."""
        if not cin.strip():
            raise ValueError("cin cannot be empty")
        return handlers.lookup_company_master(claim_id, cin)

    @tool(name="request_fact_fix")
    def request_fact_fix(
        document_version_id: str,
        correction_candidate_ids: list[str],
        idempotency_key: str,
    ) -> dict[str, object]:
        """Request bounded safe corrections against the document, delegating mutations to Writer."""
        return handlers.request_fact_fix(
            document_version_id, correction_candidate_ids, idempotency_key
        )

    @tool(name="lookup_legal_fact")
    def lookup_legal_fact(
        act_key: str,
        provision: str,
        unit: str = "section",
    ) -> dict[str, object]:
        """Lookup exact constitutional/statutory provision identity and text via secured live adapter."""
        return handlers.lookup_legal_fact(act_key, provision, unit)

    tool_list = [
        get_review_claims,
        search_matter_evidence,
        materialize_fact_evidence,
        submit_fact_findings,
        lookup_public_registry,
        lookup_company_master,
        lookup_legal_fact,
    ]
    if allow_fixes:
        tool_list.append(request_fact_fix)

    return tool_list, handlers
