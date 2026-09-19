from decimal import Decimal

from app.services.reviews.fact_comparison import (
    compare_amounts,
    extract_amounts,
    normalize_identifier,
    normalize_party_name,
    parse_amount,
    parse_date,
)


def test_amount_normalization_crores_and_lakhs() -> None:
    amt_crore = parse_amount("₹4.85 crore")
    assert amt_crore is not None
    assert amt_crore.numeric_value == Decimal("48500000")
    assert amt_crore.currency == "INR"

    amt_lakh = parse_amount("INR 50 lakh")
    assert amt_lakh is not None
    assert amt_lakh.numeric_value == Decimal("5000000")

    amt_lac = parse_amount("Rs. 12.5 lac")
    assert amt_lac is not None
    assert amt_lac.numeric_value == Decimal("1250000")


def test_amount_normalization_commas_and_symbols() -> None:
    amt_comma = parse_amount("₹5,20,00,000")
    assert amt_comma is not None
    assert amt_comma.numeric_value == Decimal("52000000")

    amt_standard_comma = parse_amount("INR 52,000,000")
    assert amt_standard_comma is not None
    assert amt_standard_comma.numeric_value == Decimal("52000000")

    amt_rs = parse_amount("Rs 48,500,000.00")
    assert amt_rs is not None
    assert amt_rs.numeric_value == Decimal("48500000")


def test_extract_multiple_amounts() -> None:
    text = "The sanction was ₹4.85 crore, but the ledger outstanding shows ₹5.20 crore as of May."
    extracted = extract_amounts(text)
    assert len(extracted) == 2
    assert extracted[0].numeric_value == Decimal("48500000")
    assert extracted[1].numeric_value == Decimal("52000000")
    assert not compare_amounts(extracted[0].numeric_value, extracted[1].numeric_value)


def test_date_normalization_unambiguous() -> None:
    d1 = parse_date("12 May 2026")
    assert d1 is not None
    assert d1.iso_date == "2026-05-12"
    assert not d1.is_ambiguous

    d2 = parse_date("2026-05-12")
    assert d2 is not None
    assert d2.iso_date == "2026-05-12"
    assert not d2.is_ambiguous

    d3 = parse_date("25/04/2023")
    assert d3 is not None
    assert d3.iso_date == "2023-04-25"
    assert not d3.is_ambiguous


def test_date_normalization_ambiguous() -> None:
    d_ambig = parse_date("05/06/2023")
    assert d_ambig is not None
    assert d_ambig.is_ambiguous
    assert d_ambig.iso_date is None


def test_normalize_identifier() -> None:
    assert normalize_identifier("SL - 2021 / 89") == "sl-2021-89"
    assert normalize_identifier("CP (IB) No. 45/2022") == "cp-(ib)-no.-45-2022"


def test_normalize_party_name() -> None:
    assert normalize_party_name("  State  Bank   of India  ") == "state bank of india"
