"""Jailbreak detector.

Flags well-known jailbreak personas / phrasings. Short tokens like "dan" use
word boundaries (\\b) so everyday words ("abundant", "mundane", "redundant")
are NOT false-flagged.
"""

import re

JAILBREAK_PATTERNS = [
    r"\bdan\b",                       # the "DAN" persona — word-bounded
    r"do\s+anything\s+now",
    r"developer\s+mode",
    r"unrestricted\s+ai",
    r"pretend\s+(?:you\s+are|to\s+be|that\s+you)",
    r"\bjailbreak\b",
    r"ignore\s+(?:openai|anthropic|all)\s+polic",
    r"evil\s+(?:assistant|ai|mode)",
    r"no\s+(?:restrictions|rules|filters|limits)",
    r"you\s+have\s+no\s+(?:restrictions|rules|limits)",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in JAILBREAK_PATTERNS]


def detect_jailbreak(text: str) -> dict:
    matches = sorted({m.group(0).strip() for p in _COMPILED for m in p.finditer(text)})
    detected = len(matches) > 0

    return {
        "detected": detected,
        "matches": matches,
        "count": len(matches),
        "severity": "HIGH" if detected else "NONE",
        "reason": (
            "Known jailbreak pattern detected"
            if detected
            else "No jailbreak pattern found"
        ),
    }
