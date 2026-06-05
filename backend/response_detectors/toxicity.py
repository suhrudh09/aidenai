"""Toxicity detector.

Prototype uses a small keyword-based approach. In production use a
specialized model or service (Perspective API, Safety SDKs).
"""
from typing import Dict, Any
import re


TOXIC_TERMS = [
    "idiot",
    "stupid",
    "kill",
    "shut up",
    "die",
    "hate",
    "dumb",
]


def detect_toxicity(text: str) -> Dict[str, Any]:
    """
    Return a toxicity score and a human-friendly status.

    Output example:
    {
      "score": 0.15,
      "status": "safe",    # safe|warning|dangerous
      "matches": [...],
      "explanation": "..."
    }
    """
    text_lower = text.lower()
    hits = []
    score = 0.0

    for term in TOXIC_TERMS:
        if term in text_lower:
            hits.append(term)
            score += 0.15

    score = min(score, 1.0)

    explanation = "; ".join([f"Matched token '{h}'" for h in hits])

    if score <= 0.3:
        status = "safe"
    elif score <= 0.6:
        status = "warning"
    else:
        status = "dangerous"

    return {"score": round(score, 3), "status": status, "matches": hits, "explanation": explanation}


if __name__ == "__main__":
    print(detect_toxicity("You are an idiot and I hate your code."))
