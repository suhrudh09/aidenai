"""Response Analyzer: combine detectors into a single analysis report.

Provides `analyze_response(prompt, answer)` which runs hallucination,
toxicity and pii checks and returns a normalized result suitable for the API.
Also provides `process_request_with_risk(risk_result, prompt)` demonstrating
integration with the Risk Engine output (mocked for tests).
"""
from typing import Dict, Any
import json


try:
    from backend.response_detectors.hallucination import detect_hallucination
    from backend.response_detectors.toxicity import detect_toxicity
    from backend.response_detectors.pii_leaker import detect_pii
    from backend.services.llm import generate_response
except Exception:
    # Fallback imports for different execution contexts
    from response_detectors.hallucination import detect_hallucination  # type: ignore
    from response_detectors.toxicity import detect_toxicity  # type: ignore
    from response_detectors.pii_leaker import detect_pii  # type: ignore
    from services.llm import generate_response  # type: ignore


def analyze_response(prompt: str, answer: str, use_llm_for_hallucination: bool = False) -> Dict[str, Any]:
    """Run all detectors and return a structured analysis.

    Output shape:
    {
      "hallucination": {"score": 0.2, "explanation": "..."},
      "toxicity": {"score": 0.1, "status": "safe"},
      "pii_leak": {"score": 0.0, "findings": []}
    }
    """
    hall = detect_hallucination(prompt, answer) if detect_hallucination else {"score": 0.0}
    tox = detect_toxicity(answer) if detect_toxicity else {"score": 0.0}
    pii = detect_pii(answer) if detect_pii else {"score": 0.0, "findings": []}

    return {
        "hallucination": {"score": hall.get("score", 0.0), "explanation": hall.get("explanation", "")},
        "toxicity": {"score": tox.get("score", 0.0), "status": tox.get("status", "safe")},
        "pii_leak": {"score": pii.get("score", 0.0), "findings": pii.get("findings", [])},
    }


def process_request_with_risk(risk_result: Dict[str, Any], prompt: str, llm_mock: bool = True) -> Dict[str, Any]:
    """Handle a request after Risk Engine has run.

    If `allow` is False, returns a blocked response per spec. If allowed,
    generates an answer via the LLM and runs response analysis.
    """
    if not risk_result.get("allow", False):
        return {"status": "blocked", "risk_score": risk_result.get("risk_score", None), "answer": None}

    # Generate answer
    answer = generate_response(prompt, mock=llm_mock)

    # Analyze the generated answer
    analysis = analyze_response(prompt, answer)

    return {
        "status": "allowed",
        "risk_score": risk_result.get("risk_score", None),
        "answer": answer,
        "response_analysis": analysis,
    }


if __name__ == "__main__":
    # Demo with mocked risk engine outputs
    allowed_risk = {"allow": True, "risk_score": 0.22}
    blocked_risk = {"allow": False, "risk_score": 0.91}

    prompt = "Who invented Python?"

    print("--- Allowed case ---")
    print(json.dumps(process_request_with_risk(allowed_risk, prompt, llm_mock=True), indent=2))

    print("\n--- Blocked case ---")
    print(json.dumps(process_request_with_risk(blocked_risk, prompt, llm_mock=True), indent=2))
