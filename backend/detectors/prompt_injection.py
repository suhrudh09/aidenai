"""Prompt-injection detector.

Looks for attempts to override, leak, or subvert the system instructions.
Uses regex (not bare substring matching) so natural phrasing variations like
"ignore ALL previous instructions" or "reveal your system prompt" are caught,
while ordinary text isn't flagged.
"""

import re

# Each pattern allows optional filler words ("all", "your", "the", ...) so the
# detector is resilient to phrasing without exploding into hundreds of literals.
PROMPT_PATTERNS = [
    r"ignore\s+(?:all\s+|the\s+|any\s+)*(?:previous|prior|above|earlier)?\s*instructions",
    r"disregard\s+(?:all\s+|the\s+|any\s+)*(?:previous|prior|above)?\s*(?:instructions|rules)",
    r"forget\s+(?:all\s+|your\s+|the\s+)*(?:previous\s+)?(?:rules|instructions)",
    r"reveal\s+(?:your\s+|the\s+)*(?:system\s+|hidden\s+|initial\s+)?(?:prompt|instructions)",
    r"show\s+(?:me\s+)?(?:your\s+|the\s+)*(?:hidden\s+|system\s+)?(?:prompt|instructions)",
    r"print\s+(?:your\s+|the\s+)*(?:system\s+)?(?:prompt|instructions)",
    r"(?:what\s+(?:is|are)|repeat)\s+(?:your\s+|the\s+)*(?:system\s+)?(?:prompt|instructions)",
    r"bypass\s+(?:all\s+|your\s+|the\s+)*(?:restrictions|filters|rules|safety)",
    r"override\s+(?:your\s+|the\s+)*(?:rules|instructions|safety)",
    r"act\s+as\s+(?:a\s+|an\s+)?(?:developer|admin|root|system)",
]

_COMPILED = [re.compile(p, re.IGNORECASE) for p in PROMPT_PATTERNS]


def detect_prompt_injection(text: str) -> dict:
    matches = sorted({m.group(0).strip() for p in _COMPILED for m in p.finditer(text)})
    detected = len(matches) > 0

    return {
        "detected": detected,
        "matches": matches,
        "count": len(matches),
        "severity": "HIGH" if detected else "NONE",
        "reason": (
            "Instruction-override attempt detected"
            if detected
            else "No prompt injection found"
        ),
    }
