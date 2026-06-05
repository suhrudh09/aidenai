"""Hallucination detector.

This module provides a simple heuristic-based hallucination detector for
prototype purposes. In real systems, you might check factual claims against
trusted knowledge sources or use model-based verifiers.
"""
from typing import Dict, Any
import re
import json
from typing import Optional


def _parse_score_from_text(s: str) -> Optional[float]:
    """Attempt to extract a numeric score (0-1) from a model response."""
    if not s:
        return None
    # Look for a JSON-like score: "score": 0.12
    m = re.search(r'"score"\s*:\s*([0-9]*\.?[0-9]+)', s)
    if m:
        try:
            v = float(m.group(1))
            if 0.0 <= v <= 1.0:
                return v
        except Exception:
            pass
    # Fallback: find first floating number like 0.12 or .12 or 1.0
    m2 = re.search(r'\b0?\.?\d+\.?\d*\b', s)
    if m2:
        try:
            v = float(m2.group(0))
            if 0.0 <= v <= 1.0:
                return v
        except Exception:
            pass
    return None


def detect_hallucination(prompt: str, answer: str, llm: Optional[object] = None, use_llm: bool = False) -> Dict[str, Any]:
    """Estimate hallucination risk for an answer relative to the prompt.

    If `use_llm` and an `llm` object is provided, the function will attempt
    to ask the LLM to judge factuality (LLM-as-a-judge). Otherwise a simple
    heuristic is used.

    Returns: {"score": float, "explanation": str}
    """
    # Try LLM-as-a-judge when requested and an llm is passed
    if use_llm and llm is not None:
        try:
            judge_prompt = (
                "You are a factuality judge.\n"
                "Given the user question and the assistant's answer, estimate the probability (0-1) that the answer contains fabricated, unsupported, or unverifiable claims.\n"
                "Respond with a short JSON object: {\"score\": <number 0-1>, \"explain\": \"short text\"}.\n"
                f"User Question:\n{prompt}\n\nAssistant Answer:\n{answer}\n"
            )
            # The llm may expose either `generate` or `completion` methods; try both.
            if hasattr(llm, "generate"):
                judge_out = llm.generate(judge_prompt)
            elif hasattr(llm, "completion"):
                judge_out = llm.completion(judge_prompt).get("text", "")
            else:
                judge_out = str(llm)

            # Attempt to parse JSON first
            try:
                parsed = json.loads(judge_out)
                if isinstance(parsed, dict) and "score" in parsed:
                    s = float(parsed["score"])
                    s = max(0.0, min(1.0, s))
                    explain = parsed.get("explain", "")
                    return {"score": round(s, 3), "explanation": str(explain)}
            except Exception:
                # Not JSON; try to pull a numeric substring
                s = _parse_score_from_text(judge_out)
                if s is not None:
                    return {"score": round(float(s), 3), "explanation": "LLM judgment (parsed)"}
        except Exception:
            # If LLM judging fails, fall back to heuristic below
            pass

    # Heuristic fallback
    score = 0.0
    reasons = []

    qualifiers = [r"as far as i know", r"i think", r"i'm not sure", r"maybe", r"might", r"could be", r"no evidence", r"not sure", r"unverified"]
    for q in qualifiers:
        if re.search(q, answer, re.IGNORECASE):
            score += 0.15
            reasons.append(f"Found qualifier: {q}")

    # years and numeric claims
    if re.search(r"\b\d{4}\b", answer):
        score += 0.1
        reasons.append("Contains 4-digit year which may be a factual claim")

    if re.search(r"\b\d{1,3}(,\d{3})+\b|\b\d+%\b", answer):
        score += 0.15
        reasons.append("Contains numeric/statistical claim")

    # weak indicator: answer uses many hedging phrases
    hedges = [r"according to", r"reports", r"studies show", r"research suggests"]
    for h in hedges:
        if re.search(h, answer, re.IGNORECASE):
            score += 0.05
            reasons.append(f"Found hedge phrase: {h}")

    score = min(score, 1.0)
    explanation = "; ".join(reasons)
    return {"score": round(score, 3), "explanation": explanation}


if __name__ == "__main__":
    s = "In 2023, 12,345,678 people used our service. As far as I know, this is correct."
    print(detect_hallucination(s))
