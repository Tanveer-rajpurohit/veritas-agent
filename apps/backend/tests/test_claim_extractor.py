from uuid import uuid4

from app.services.reviews.claim_extractor import claim_extractor


def test_extract_claims_from_tiptap_json() -> None:
    version_id = uuid4()
    content_json = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "attrs": {"id": "block-1"},
                "content": [
                    {
                        "type": "text",
                        "text": "The corporate debtor defaulted on a financial debt of ₹4.85 crore on 12 May 2026 under Facility Agreement No. FA-2021-99.",
                    }
                ],
            },
            {
                "type": "paragraph",
                "attrs": {"id": "block-2"},
                "content": [
                    {
                        "type": "text",
                        "text": "This petition is filed under Section 7 of the Insolvency and Bankruptcy Code.",
                    }
                ],
            },
        ],
    }

    claims = claim_extractor.extract_claims(version_id, content_json)
    assert len(claims) >= 4

    kinds = [c.kind for c in claims]
    assert "monetary_amount" in kinds
    assert "date" in kinds
    assert "identifier" in kinds
    assert "legal_text" in kinds

    amt_claim = next(c for c in claims if c.kind == "monetary_amount")
    assert amt_claim.text == "₹4.85 crore"
    assert amt_claim.from_offset >= 0
    assert amt_claim.to_offset > amt_claim.from_offset
    assert amt_claim.block_id == "block-1"
    assert len(amt_claim.claim_sha256) == 64

    legal_claim = next(c for c in claims if c.kind == "legal_text")
    assert "Section 7" in legal_claim.text
    assert legal_claim.normalized.metadata["provision"] == "7"


def test_extract_claims_block_filtering() -> None:
    version_id = uuid4()
    content_json = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "attrs": {"id": "block-a"},
                "content": [{"type": "text", "text": "Debt of ₹10 lakh."}],
            },
            {
                "type": "paragraph",
                "attrs": {"id": "block-b"},
                "content": [{"type": "text", "text": "Debt of ₹20 lakh."}],
            },
        ],
    }

    claims = claim_extractor.extract_claims(version_id, content_json, block_ids=["block-a"])
    assert len(claims) == 2
    assert {claim.kind for claim in claims} == {"monetary_amount", "event"}
    assert claims[0].text == "₹10 lakh"
