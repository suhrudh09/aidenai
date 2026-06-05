"""Explainability Engine.

The final box before ALLOW/BLOCK. Takes the raw output of every detector that
ran, plus the decision the guardrail reached, and turns it into a structured,
human-readable rationale the UI can render (a summary line + per-detector
factors). It explains *why* a verdict was reached — it does not make the
decision itself (guardrail.py does).
"""

# Friendly labels for each detector key.
LABELS = {
    "prompt_injection": "Prompt Injection",
    "jailbreak": "Jailbreak",
    "toxicity": "Toxicity",
    "hallucination": "Hallucination",
    "pii": "PII Leak",
}


def _factor(key: str, result: dict) -> dict:
    """Normalize one detector's output into a UI-friendly factor."""
    detected = bool(result.get("detected"))
    # Detectors expose their evidence under different keys.
    evidence = (
        result.get("matches")
        or result.get("signals")
        or result.get("kinds")
        or []
    )
    if key == "pii" and detected:
        evidence = [
            k
            for k, v in (
                ("email", result.get("emails")),
                ("phone", result.get("phones")),
                ("PAN", result.get("pan")),
                ("Aadhaar", result.get("aadhaar")),
                ("credit card", result.get("credit_card")),
            )
            if v
        ]
    return {
        "detector": LABELS.get(key, key),
        "detected": detected,
        "severity": result.get("severity", "NONE"),
        "reason": result.get("reason", ""),
        "evidence": evidence,
    }


def explain(detectors: dict, *, action: str, category: str, stage: str) -> dict:
    """Build the explainability report.

    Args:
        detectors: mapping of detector key -> its raw result dict.
        action:    final "ALLOWED" | "BLOCKED".
        category:  the deciding category.
        stage:     "input" (pre-LLM) or "output" (post-LLM).
    """
    factors = [_factor(k, r) for k, r in detectors.items()]
    triggered = [f for f in factors if f["detected"]]

    where = "the user's prompt" if stage == "input" else "the model's response"

    if action == "BLOCKED":
        summary = (
            f"Blocked: {where} was flagged as “{category}”. "
            f"{len(triggered)} detector(s) fired."
        )
    elif triggered:
        summary = (
            f"Allowed with warnings: {where} triggered {len(triggered)} "
            f"detector(s); primary concern “{category}”."
        )
    else:
        summary = f"Allowed: {where} passed all {len(factors)} safety detectors."

    return {
        "summary": summary,
        "stage": stage,
        "decision": action,
        "primary_category": category,
        "factors": factors,
        "triggered": [f["detector"] for f in triggered],
    }
