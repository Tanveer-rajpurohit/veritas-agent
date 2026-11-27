import re
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation


@dataclass(frozen=True)
class ParsedAmount:
    raw_text: str
    numeric_value: Decimal
    currency: str
    unit: str | None
    canonical_text: str


AMOUNT_PATTERN = re.compile(
    r"(?P<currency>\u20b9|INR|Rs\.?)\s*(?P<num>[\d,]+(?:\.\d+)?)\s*(?P<unit>crores?|lakhs?|lacs?)?",
    re.IGNORECASE,
)

MULTIPLIERS: dict[str | None, Decimal] = {
    None: Decimal(1),
    "lakh": Decimal("100000"),
    "lakhs": Decimal("100000"),
    "lac": Decimal("100000"),
    "lacs": Decimal("100000"),
    "crore": Decimal("10000000"),
    "crores": Decimal("10000000"),
}


def parse_amount(text: str) -> ParsedAmount | None:
    match = AMOUNT_PATTERN.search(text)
    if not match:
        return None
    raw = match.group(0).strip()
    num_str = match.group("num").replace(",", "")
    try:
        base_num = Decimal(num_str)
    except InvalidOperation:
        return None

    unit_raw = match.group("unit")
    unit_key = unit_raw.lower() if unit_raw else None
    multiplier = MULTIPLIERS.get(unit_key, Decimal(1))
    total_val = base_num * multiplier

    canonical = f"₹{total_val:,.2f}".rstrip("0").rstrip(".")
    return ParsedAmount(
        raw_text=raw,
        numeric_value=total_val,
        currency="INR",
        unit=unit_key,
        canonical_text=canonical,
    )


def extract_amounts(text: str) -> list[ParsedAmount]:
    results: list[ParsedAmount] = []
    for match in AMOUNT_PATTERN.finditer(text):
        raw = match.group(0).strip()
        num_str = match.group("num").replace(",", "")
        try:
            base_num = Decimal(num_str)
        except InvalidOperation:
            continue
        unit_raw = match.group("unit")
        unit_key = unit_raw.lower() if unit_raw else None
        multiplier = MULTIPLIERS.get(unit_key, Decimal(1))
        total_val = base_num * multiplier
        canonical = f"₹{total_val:,.2f}".rstrip("0").rstrip(".")
        results.append(
            ParsedAmount(
                raw_text=raw,
                numeric_value=total_val,
                currency="INR",
                unit=unit_key,
                canonical_text=canonical,
            )
        )
    return results


def compare_amounts(amount_a: Decimal, amount_b: Decimal) -> bool:
    return amount_a == amount_b


MONTH_NAMES = {
    "january": 1,
    "jan": 1,
    "february": 2,
    "feb": 2,
    "march": 3,
    "mar": 3,
    "april": 4,
    "apr": 4,
    "may": 5,
    "june": 6,
    "jun": 6,
    "july": 7,
    "jul": 7,
    "august": 8,
    "aug": 8,
    "september": 9,
    "sep": 9,
    "sept": 9,
    "october": 10,
    "oct": 10,
    "november": 11,
    "nov": 11,
    "december": 12,
    "dec": 12,
}

DATE_PATTERNS = [
    re.compile(
        r"\b(?P<day>\d{1,2})(?:st|nd|rd|th)?[\s\-]+(?P<month>[a-zA-Z]+)[\s,\-]+(?P<year>\d{4})\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?P<month>[a-zA-Z]+)[\s\-]+(?P<day>\d{1,2})(?:st|nd|rd|th)?[\s,\-]+(?P<year>\d{4})\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(?P<year>\d{4})-(?P<month>\d{2})-(?P<day>\d{2})\b",
    ),
]


@dataclass(frozen=True)
class ParsedDate:
    raw_text: str
    iso_date: str | None
    is_ambiguous: bool


def parse_date(text: str) -> ParsedDate | None:
    for pattern in DATE_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        groups = match.groupdict()
        year_str = groups.get("year")
        month_str = groups.get("month")
        day_str = groups.get("day")

        if not year_str or not month_str or not day_str:
            continue

        try:
            year = int(year_str)
            if month_str.lower() in MONTH_NAMES:
                month = MONTH_NAMES[month_str.lower()]
            else:
                month = int(month_str)
            day = int(day_str)
            d = datetime(year, month, day)
            iso = d.strftime("%Y-%m-%d")
            return ParsedDate(raw_text=match.group(0), iso_date=iso, is_ambiguous=False)
        except (ValueError, KeyError):
            continue

    num_slash_match = re.search(r"\b(?P<a>\d{1,2})/(?P<b>\d{1,2})/(?P<year>\d{4})\b", text)
    if num_slash_match:
        a = int(num_slash_match.group("a"))
        b = int(num_slash_match.group("b"))
        year = int(num_slash_match.group("year"))
        if a > 12 and b <= 12:
            iso = datetime(year, b, a).strftime("%Y-%m-%d")
            return ParsedDate(raw_text=num_slash_match.group(0), iso_date=iso, is_ambiguous=False)
        if b > 12 and a <= 12:
            iso = datetime(year, a, b).strftime("%Y-%m-%d")
            return ParsedDate(raw_text=num_slash_match.group(0), iso_date=iso, is_ambiguous=False)
        return ParsedDate(raw_text=num_slash_match.group(0), iso_date=None, is_ambiguous=True)

    return None


def normalize_identifier(identifier: str) -> str:
    cleaned = re.sub(r"[\s\-_/]+", "-", identifier.strip())
    return cleaned.casefold()


def normalize_party_name(party: str) -> str:
    cleaned = " ".join(party.strip().split())
    return cleaned.casefold()
