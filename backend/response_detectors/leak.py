"""PII leak detector & redactor.

Uses regex patterns to detect common PII types (SSN, emails, phone numbers,
credit cards) and redacts them from text. Returns a normalized score and
details about findings.
"""
from typing import Dict, Any, List, Tuple
import re


PII_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("email", re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")),
    ("phone", re.compile(r"\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")),
    ("credit_card", re.compile(r"\b(?:\d[ -]*?){13,16}\b")),
]


def detect_and_redact_pii(text: str) -> Dict[str, Any]:
    findings: List[Dict[str, Any]] = []
    redacted = text
    max_score = 0.0

    for name, pat in PII_PATTERNS:
        for m in pat.finditer(text):
            val = m.group(0)
            findings.append({"type": name, "match": val, "span": [m.start(), m.end()]})
            # simple scoring: different PII types can contribute differently
            if name == "ssn":
                max_score = max(max_score, 0.9)
            elif name == "credit_card":
                max_score = max(max_score, 0.9)
            else:
                max_score = max(max_score, 0.6)

            # redact in the redacted string
            redacted = redacted.replace(val, f"[REDACTED_{name.upper()}]")

    return {"findings": findings, "redacted": redacted, "max_pii_score": round(max_score, 3)}


if __name__ == "__main__":
    s = "Contact John at SSN 123-45-6789 or email john.doe@example.com"
    print(detect_and_redact_pii(s))
