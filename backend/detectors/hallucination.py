"""Hallucination-risk detector.

Without ground truth you can't *prove* a statement is false, so this flags
linguistic *risk signals* commonly associated with fabrication: unsourced
authority claims, fake-looking citations, and overconfident absolutes. It is a
heuristic risk gauge (category "Hallucination Risk"), not a fact-checker — it
warns, it never blocks.
"""

import re

SIGNALS = {
    "unsourced authority": [
        r"\baccording to (?:a |recent |multiple )?(?:study|studies|research|report|survey)\b",
        r"\b(?:studies|research|experts|scientists)\s+(?:show|shows|suggest|say|prove)\b",
        r"\bit (?:is|has been) (?:widely |well )?(?:known|established|proven)\b",
    ],
    "fabricated citation": [
        r"\([A-Z][a-z]+(?:\s+et al\.?)?,?\s+\d{4}\)",   # (Smith et al., 2019)
        r"\[\d+\]",                                       # [1], [2]
        r"\bdoi:\s*\S+",
    ],
    "overconfidence": [
        r"\b(?:definitely|certainly|undoubtedly|without (?:a )?doubt|guaranteed|100%\s+certain|absolutely sure)\b",
        r"\bthere is no doubt\b",
    ],
}

_COMPILED = {
    kind: [re.compile(p, re.IGNORECASE) for p in patterns]
    for kind, patterns in SIGNALS.items()
}


def detect_hallucination(text: str, prompt: str | None = None) -> dict:
    signals, matches = [], []

    for kind, compiled in _COMPILED.items():
        hits = sorted({m.group(0).strip() for p in compiled for m in p.finditer(text)})
        if hits:
            signals.append(kind)
            matches.extend(hits)

    detected = len(signals) > 0
    # Multiple distinct signal types -> higher risk.
    severity = "MEDIUM" if len(signals) >= 2 else ("LOW" if detected else "NONE")

    return {
        "detected": detected,
        "signals": signals,
        "matches": sorted(set(matches)),
        "count": len(matches),
        "severity": severity,
        "reason": (
            f"Possible hallucination risk ({', '.join(signals)})"
            if detected
            else "No obvious hallucination signals"
        ),
    }
