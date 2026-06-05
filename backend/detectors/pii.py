"""PII detector + redactor.

Finds emails, phone numbers, Indian PAN, Aadhaar, and credit-card numbers, and
produces a redacted copy of the text. Credit cards are Luhn-validated to cut
down on false positives (e.g. long order/account IDs).
"""

import re

EMAIL_PATTERN = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
# 10-digit numbers, optionally with a country code and common separators.
PHONE_PATTERN = r"(?:\+?\d{1,3}[\s.-]?)?(?:\d{5}[\s.-]?\d{5}|\d{3}[\s.-]?\d{3}[\s.-]?\d{4}|\d{10})"
PAN_PATTERN = r"\b[A-Z]{5}[0-9]{4}[A-Z]\b"            # Indian PAN, case-sensitive
AADHAAR_PATTERN = r"\b\d{4}\s\d{4}\s\d{4}\b"
CARD_PATTERN = r"\b(?:\d[ -]?){13,16}\b"

_EMAIL = re.compile(EMAIL_PATTERN)
_PHONE = re.compile(PHONE_PATTERN)
_PAN = re.compile(PAN_PATTERN)
_AADHAAR = re.compile(AADHAAR_PATTERN)
_CARD = re.compile(CARD_PATTERN)


def _luhn_valid(number: str) -> bool:
    """Standard Luhn checksum used by real credit-card numbers."""
    digits = [int(d) for d in re.sub(r"\D", "", number)]
    if not 13 <= len(digits) <= 16:
        return False
    checksum = 0
    for i, d in enumerate(reversed(digits)):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        checksum += d
    return checksum % 10 == 0


def detect_pii(text: str) -> dict:
    emails = _EMAIL.findall(text)

    # Credit cards first (Luhn-checked) so their digits aren't mis-claimed as phones.
    cards = [m.group(0) for m in _CARD.finditer(text) if _luhn_valid(m.group(0))]
    aadhaar = _AADHAAR.findall(text)
    pan = _PAN.findall(text)

    # Strip out anything already claimed as a card/aadhaar before phone matching.
    phone_scan = text
    for token in cards + aadhaar:
        phone_scan = phone_scan.replace(token, " ")
    phones = [m.group(0).strip() for m in _PHONE.finditer(phone_scan)]

    detected = any([emails, phones, pan, aadhaar, cards])

    return {
        "detected": detected,
        "emails": emails,
        "phones": phones,
        "pan": pan,
        "aadhaar": aadhaar,
        "credit_card": cards,
        "severity": "MEDIUM" if detected else "NONE",
        "reason": (
            "Sensitive information detected" if detected else "No PII found"
        ),
    }


def redact_pii(text: str) -> str:
    """Return `text` with every PII span replaced by a category token."""
    redacted = _EMAIL.sub("[EMAIL]", text)
    redacted = _CARD.sub(
        lambda m: "[CARD]" if _luhn_valid(m.group(0)) else m.group(0), redacted
    )
    redacted = _AADHAAR.sub("[AADHAAR]", redacted)
    redacted = _PAN.sub("[PAN]", redacted)
    redacted = _PHONE.sub("[PHONE]", redacted)
    return redacted
