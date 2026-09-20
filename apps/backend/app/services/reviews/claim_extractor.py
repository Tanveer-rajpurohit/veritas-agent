import hashlib
import logging
import re
from typing import Any
from uuid import UUID, uuid4

from app.schemas.agents.fact_reviewer import FactClaim, NormalizedFact
from app.services.reviews.fact_comparison import (
    AMOUNT_PATTERN,
    DATE_PATTERNS,
    MULTIPLIERS,
    normalize_identifier,
    parse_amount,
    parse_date,
)

logger = logging.getLogger(__name__)

# Hard safety ceiling for any single normalized value. The schema allows up to
# 8000 chars now, but we still truncate defensively so a pathological block can
# never raise a ValidationError and bring down a whole drafting run.
_MAX_NORMALIZED = 7800
_MAX_CLAIM_TEXT = 3900

IDENTIFIER_PATTERN = re.compile(
    r"\b(?:Account|Sanction Letter|Facility Agreement|CP\s*(?:\(IB\))?|Loan Agreement|Demand Notice|Agreement)\s*(?:No\.?|Number)?\s*[:#\-]?\s*([A-Za-z0-9\-_/]+)",
    re.IGNORECASE,
)

LEGAL_PROVISION_PATTERN = re.compile(
    r"\b(?P<unit>Article|Section|Rule)\s+(?P<num>\d+[A-Za-z]?)(?:\s+of\s+(?:the\s+)?(?P<act>Constitution|Insolvency and Bankruptcy Code|IBC|Companies Act(?:,\s*2013)?))?\b",
    re.IGNORECASE,
)


def _clip(text: str, limit: int = _MAX_NORMALIZED) -> str:
    """Truncate to a safe length without breaking the min_length=1 invariant."""
    text = text.strip()
    if len(text) <= limit:
        return text or " "
    clipped = text[: limit - 1].rstrip()
    return (clipped or " ") + "…"


class ClaimExtractor:
    """Deterministic extractor of atomic factual claims from TipTap document structures.

    Every claim is built defensively: long paragraphs are clipped to the schema
    ceiling and each block is wrapped so one malformed paragraph cannot abort
    extraction for the whole document (which previously surfaced as a raw
    ``ValidationError`` to the end user).
    """

    @classmethod
    def _extract_text_and_citations(
        cls, block: dict[str, Any]
    ) -> tuple[str, list[tuple[str, str | None]]]:
        text_parts: list[str] = []
        citations: list[tuple[str, str | None]] = []

        for child in block.get("content", []):
            child_type = child.get("type")
            if child_type == "text":
                text_parts.append(child.get("text", ""))
                for mark in child.get("marks", []):
                    if mark.get("type") == "citation":
                        citations.append(
                            (child.get("text", ""), mark.get("attrs", {}).get("quote"))
                        )
            elif child_type == "citationRef":
                attrs = child.get("attrs", {})
                display = attrs.get("display", "")
                text_parts.append(display)
                citations.append((display, attrs.get("quote")))

        return "".join(text_parts), citations

    @classmethod
    def extract_claims(
        cls,
        document_version_id: UUID,
        content_json: dict[str, Any],
        block_ids: list[str] | None = None,
    ) -> list[FactClaim]:
        claims: list[FactClaim] = []
        blocks = content_json.get("content", [])

        for block_index, block in enumerate(blocks):
            block_type = block.get("type")
            if block_type != "paragraph":
                continue

            block_id = block.get("attrs", {}).get("id") or str(block_index)
            if block_ids and block_id not in block_ids and str(block_index) not in block_ids:
                continue

            try:
                cls._extract_block_claims(
                    claims=claims,
                    document_version_id=document_version_id,
                    block_index=block_index,
                    block_id=block_id,
                    block=block,
                )
            except Exception as exc:  # pragma: no cover - defensive guard
                logger.warning(
                    "Claim extraction skipped block %s (%s): %s: %s",
                    block_index,
                    block_id,
                    type(exc).__name__,
                    exc,
                )
                continue

        return claims

    @classmethod
    def _extract_block_claims(
        cls,
        *,
        claims: list[FactClaim],
        document_version_id: UUID,
        block_index: int,
        block_id: str,
        block: dict[str, Any],
    ) -> None:
        block_text, _ = cls._extract_text_and_citations(block)
        block_text_stripped = block_text.strip()
        if not block_text_stripped:
            return

        # 1. Extract monetary amounts
        for match in AMOUNT_PATTERN.finditer(block_text):
            matched_text = match.group(0)
            parsed = parse_amount(matched_text)
            if not parsed:
                continue

            try:
                norm = NormalizedFact(
                    kind="monetary_amount",
                    raw_value=_clip(matched_text),
                    canonical_value=_clip(parsed.canonical_text),
                    unit_or_currency=parsed.currency,
                    numeric_value=float(parsed.numeric_value),
                    metadata={"multiplier": str(MULTIPLIERS.get(parsed.unit, 1))},
                )
                claim_sha256 = hashlib.sha256(matched_text.strip().encode()).hexdigest()
                claims.append(
                    FactClaim(
                        id=uuid4(),
                        document_version_id=document_version_id,
                        block_index=block_index,
                        block_id=block_id,
                        from_offset=match.start(),
                        to_offset=match.end(),
                        kind="monetary_amount",
                        text=_clip(matched_text, _MAX_CLAIM_TEXT),
                        normalized=norm,
                        claim_sha256=claim_sha256,
                    )
                )
            except Exception as exc:
                logger.debug("Skip monetary claim: %s", exc)

        # 2. Extract dates
        for pattern in DATE_PATTERNS:
            for match in pattern.finditer(block_text):
                matched_text = match.group(0)
                parsed_d = parse_date(matched_text)
                if not parsed_d:
                    continue

                try:
                    norm = NormalizedFact(
                        kind="date",
                        raw_value=_clip(matched_text),
                        canonical_value=_clip(parsed_d.iso_date or matched_text),
                        unit_or_currency=None,
                        numeric_value=None,
                        metadata={"is_ambiguous": parsed_d.is_ambiguous},
                    )
                    claim_sha256 = hashlib.sha256(matched_text.strip().encode()).hexdigest()
                    claims.append(
                        FactClaim(
                            id=uuid4(),
                            document_version_id=document_version_id,
                            block_index=block_index,
                            block_id=block_id,
                            from_offset=match.start(),
                            to_offset=match.end(),
                            kind="date",
                            text=_clip(matched_text, _MAX_CLAIM_TEXT),
                            normalized=norm,
                            claim_sha256=claim_sha256,
                        )
                    )
                except Exception as exc:
                    logger.debug("Skip date claim: %s", exc)

        # 3. Extract identifiers
        for match in IDENTIFIER_PATTERN.finditer(block_text):
            matched_text = match.group(0)
            identifier_val = match.group(1)
            try:
                norm = NormalizedFact(
                    kind="identifier",
                    raw_value=_clip(matched_text),
                    canonical_value=_clip(normalize_identifier(identifier_val)),
                    unit_or_currency=None,
                    numeric_value=None,
                    metadata={"identifier": identifier_val},
                )
                claim_sha256 = hashlib.sha256(matched_text.strip().encode()).hexdigest()
                claims.append(
                    FactClaim(
                        id=uuid4(),
                        document_version_id=document_version_id,
                        block_index=block_index,
                        block_id=block_id,
                        from_offset=match.start(),
                        to_offset=match.end(),
                        kind="identifier",
                        text=_clip(matched_text, _MAX_CLAIM_TEXT),
                        normalized=norm,
                        claim_sha256=claim_sha256,
                    )
                )
            except Exception as exc:
                logger.debug("Skip identifier claim: %s", exc)

        # 4. Extract legal provisions (objective constitutional / statutory references)
        for match in LEGAL_PROVISION_PATTERN.finditer(block_text):
            matched_text = match.group(0)
            unit = match.group("unit").lower()
            num = match.group("num")
            act_raw = match.group("act")
            if act_raw and "constitution" in act_raw.lower():
                act_key = "constitution"
            elif act_raw and ("insolvency" in act_raw.lower() or act_raw.lower() == "ibc"):
                act_key = "ibc"
            elif act_raw and "companies" in act_raw.lower():
                act_key = "companies_act"
            elif unit == "article":
                act_key = "constitution"
            else:
                # A bare section/rule has no trustworthy Act identity. Keep it as an
                # ordinary proposition instead of silently looking up the IBC.
                continue

            try:
                norm = NormalizedFact(
                    kind="legal_text",
                    raw_value=_clip(matched_text),
                    canonical_value=_clip(f"{act_key}:{unit}:{num}"),
                    unit_or_currency=None,
                    numeric_value=None,
                    metadata={"act_key": act_key, "unit": unit, "provision": num},
                )
                claim_sha256 = hashlib.sha256(matched_text.strip().encode()).hexdigest()
                claims.append(
                    FactClaim(
                        id=uuid4(),
                        document_version_id=document_version_id,
                        block_index=block_index,
                        block_id=block_id,
                        from_offset=match.start(),
                        to_offset=match.end(),
                        kind="legal_text",
                        text=_clip(matched_text, _MAX_CLAIM_TEXT),
                        normalized=norm,
                        claim_sha256=claim_sha256,
                    )
                )
            except Exception as exc:
                logger.debug("Skip legal_text claim: %s", exc)

        # 5. Keep the full proposition: isolated values do not capture who did what.
        #    This is the block that previously exceeded 1000 chars and crashed the
        #    run; the clipped values keep the proposition usable without breaking.
        if block_text_stripped:
            try:
                canonical = " ".join(block_text_stripped.split()).casefold()
                norm = NormalizedFact(
                    kind="event",
                    raw_value=_clip(block_text_stripped),
                    canonical_value=_clip(canonical),
                    unit_or_currency=None,
                    numeric_value=None,
                    metadata={},
                )
                claim_sha256 = hashlib.sha256(block_text_stripped.encode()).hexdigest()
                claims.append(
                    FactClaim(
                        id=uuid4(),
                        document_version_id=document_version_id,
                        block_index=block_index,
                        block_id=block_id,
                        from_offset=0,
                        to_offset=len(block_text_stripped),
                        kind="event",
                        text=_clip(block_text_stripped, _MAX_CLAIM_TEXT),
                        normalized=norm,
                        claim_sha256=claim_sha256,
                    )
                )
            except Exception as exc:
                logger.debug("Skip event claim for block %s: %s", block_index, exc)


claim_extractor = ClaimExtractor()
