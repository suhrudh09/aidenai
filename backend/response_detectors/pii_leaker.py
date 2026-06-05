"""PII leaker detector for generated answers.

Detects common PII types and scores their severity. Returns a normalized
score (0.0-1.0) and a list of findings.
"""
from typing import Dict, Any, List, Tuple
import re


PII_PATTERNS: List[Tuple[str, re.Pattern]] = [
    ("ssn", re.compile(r"\b\d{3}-\d{2}-\d{4}\b")),
    ("email", re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")),
    ("phone", re.compile(r"\b\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")),
    ("credit_card", re.compile(r"\b(?:\d[ -]*?){13,16}\b")),
    ("api_key", re.compile(r"\bsk-[A-Za-z0-9-_]{8,}\b")),
    ("password_assign", re.compile(r"password\s*[=:]\s*[^\s,;]+", re.IGNORECASE)),
]


def detect_pii(text: str) -> Dict[str, Any]:
    """Detect PII in `text` and return a score and findings list.

    Output example:
    {
       "score": 0.8,
       "findings": ["Email detected: john@example.com"]
    }
    """
    findings: List[str] = []
    max_score = 0.0

    for name, pat in PII_PATTERNS:
        for m in pat.finditer(text):
            val = m.group(0)
            if name == "ssn":
                score = 0.95
                findings.append(f"SSN detected: {val}")
            elif name == "credit_card":
                score = 0.95
                findings.append(f"Credit card detected: {val}")
            elif name == "api_key":
                score = 0.9
                findings.append(f"API key detected: {val}")
            elif name == "password_assign":
                score = 0.9
                findings.append(f"Password assignment detected: {val}")
            elif name == "email":
                score = 0.6
                findings.append(f"Email detected: {val}")
            elif name == "phone":
                score = 0.6
                findings.append(f"Phone number detected: {val}")
            else:
                score = 0.5
                findings.append(f"{name} detected: {val}")

            if score > max_score:
                max_score = score

    # Normalize to 0-1
    return {"score": round(max_score, 3), "findings": findings}


if __name__ == "__main__":
    s = "Contact John at SSN 123-45-6789 or email john.doe@example.com or sk-abcdef12345"
    print(detect_pii(s))
