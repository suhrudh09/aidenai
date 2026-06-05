"""Toxicity detector.

Rule-based lexicon scan for abusive, hateful, threatening, or self-harm content.
Word boundaries are used so substrings of innocent words aren't flagged. This is
a lightweight filter, not a trained classifier — tune the lists for production.
"""

import re

# Grouped by kind so the explanation can say *what* was found. Kept deliberately
# small/representative; HIGH-severity buckets force a block.
PROFANITY = [r"\bf+u+c+k", r"\bsh[i1]t", r"\basshole", r"\bbitch", r"\bbastard", r"\bdick\b", r"\bcrap\b"]
HATE = [r"\bhate\s+(?:all\s+)?(?:jews|muslims|christians|blacks|whites|gays|women|men)\b", r"\bslur\b"]
THREAT = [r"\bkill\s+(?:you|them|him|her|everyone|yourself|himself|herself)\b",
          r"\bi('| wi)ll\s+(?:kill|hurt|murder|destroy)\b",
          r"\bblow\s+up\b", r"\bshoot\s+(?:you|them|up)\b", r"\bbomb\b"]
# Encouraging harm toward self or others.
SELF_HARM = [r"\bkill\s+(?:myself|yourself)\b", r"\bk+y+s+\b", r"\bsuicide\b",
             r"\bself[\s-]?harm\b", r"\bend\s+(?:my|your)\s+life\b",
             r"\b(?:go\s+)?hang\s+yourself\b", r"\bgo\s+die\b",
             r"\byou\s+should\s+die\b", r"\bhurt\s+(?:myself|yourself)\b"]

GROUPS = {
    "self-harm": (SELF_HARM, "HIGH"),
    "threat": (THREAT, "HIGH"),
    "hate": (HATE, "HIGH"),
    "profanity": (PROFANITY, "MEDIUM"),
}

_COMPILED = {
    kind: ([re.compile(p, re.IGNORECASE) for p in patterns], sev)
    for kind, (patterns, sev) in GROUPS.items()
}

_SEVERITY_RANK = {"NONE": 0, "MEDIUM": 1, "HIGH": 2}


def detect_toxicity(text: str) -> dict:
    matches, kinds, severity = [], [], "NONE"

    for kind, (compiled, sev) in _COMPILED.items():
        hits = sorted({m.group(0).strip() for p in compiled for m in p.finditer(text)})
        if hits:
            matches.extend(hits)
            kinds.append(kind)
            if _SEVERITY_RANK[sev] > _SEVERITY_RANK[severity]:
                severity = sev

    detected = len(matches) > 0
    return {
        "detected": detected,
        "matches": sorted(set(matches)),
        "kinds": kinds,
        "count": len(matches),
        "severity": severity,
        "reason": (
            f"Toxic content detected ({', '.join(kinds)})"
            if detected
            else "No toxic content found"
        ),
    }
