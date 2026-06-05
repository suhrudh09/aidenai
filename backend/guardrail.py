"""Guardrail orchestration.

Two entry points:

* analyze(text, mode)  -> the Prompt Scanner: static screening of one piece of
  text, returns the verdict the UI renders.

* run_chat(prompt)     -> the full architecture pipeline:
      input guardrail -> LLM (OpenRouter) -> output detectors
      -> Explainability Engine -> ALLOW/BLOCK.

Decision policy (highest risk wins):
    Prompt Injection / Jailbreak / Toxicity(HIGH) -> BLOCKED
    PII Exposure                                  -> ALLOWED, redacted
    Hallucination Risk                            -> ALLOWED, warned
    nothing                                       -> ALLOWED, Safe
"""

from detectors.prompt_injection import detect_prompt_injection
from detectors.jailbreak import detect_jailbreak
from detectors.toxicity import detect_toxicity
from detectors.hallucination import detect_hallucination
from detectors.pii import detect_pii, redact_pii
from explainability import explain
from services import openrouter

# Per-category risk score (higher == riskier; mirrors the frontend riskTier).
SCORES = {
    "Prompt Injection": 0.94,
    "Jailbreak": 0.90,
    "Toxicity": 0.88,
    "PII Exposure": 0.55,
    "Hallucination Risk": 0.50,
    "Safe": 0.05,
}


# --------------------------------------------------------------------------- #
# Prompt Scanner (static, single-text)                                        #
# --------------------------------------------------------------------------- #
def analyze(text: str, mode: str = "prompt") -> dict:
    injection = detect_prompt_injection(text)
    jailbreak = detect_jailbreak(text)
    toxicity = detect_toxicity(text)
    pii = detect_pii(text)

    subject = "response" if mode == "response" else "prompt"

    if injection["detected"]:
        category, action = "Prompt Injection", "BLOCKED"
        explanation = (
            f"This {subject} appears to override the system instructions "
            f"(matched: {', '.join(injection['matches'])})."
        )
    elif jailbreak["detected"]:
        category, action = "Jailbreak", "BLOCKED"
        explanation = (
            f"This {subject} matches a known jailbreak pattern "
            f"(matched: {', '.join(jailbreak['matches'])})."
        )
    elif toxicity["detected"] and toxicity["severity"] == "HIGH":
        category, action = "Toxicity", "BLOCKED"
        explanation = f"This {subject} contains toxic content ({', '.join(toxicity['kinds'])})."
    elif pii["detected"]:
        category, action = "PII Exposure", "ALLOWED"
        explanation = (
            f"This {subject} contains sensitive information. It is allowed but the "
            "detected values have been redacted."
        )
    elif toxicity["detected"]:
        category, action = "Toxicity", "ALLOWED"
        explanation = f"This {subject} contains mild profanity ({', '.join(toxicity['kinds'])})."
    else:
        category, action = "Safe", "ALLOWED"
        explanation = f"No unsafe content found. This {subject} passed the safety check."

    return {
        "safety_score": SCORES[category],
        "category": category,
        "action": action,
        "explanation": explanation,
        "redacted_text": redact_pii(text) if pii["detected"] else None,
        "details": {
            "prompt_injection": injection,
            "jailbreak": jailbreak,
            "toxicity": toxicity,
            "pii": pii,
        },
    }


# --------------------------------------------------------------------------- #
# Full chat pipeline (input -> LLM -> output -> explain -> decide)            #
# --------------------------------------------------------------------------- #
def _verdict(category, action, *, reply, model, stage, detectors, redacted=None, note=None):
    return {
        "action": action,
        "category": category,
        "safety_score": SCORES.get(category, 0.05),
        "reply": reply,
        "model": model,
        "blocked_stage": stage if action == "BLOCKED" else None,
        "redacted_text": redacted,
        "note": note,
        "detectors": detectors,
        "explainability": explain(detectors, action=action, category=category,
                                  stage=stage),
    }


def run_chat(prompt: str, history: list | None = None) -> dict:
    # ---- Stage 1: input guardrail (before the LLM is ever called) ----------
    injection = detect_prompt_injection(prompt)
    jailbreak = detect_jailbreak(prompt)
    in_toxicity = detect_toxicity(prompt)
    in_pii = detect_pii(prompt)
    input_detectors = {
        "prompt_injection": injection,
        "jailbreak": jailbreak,
        "toxicity": in_toxicity,
        "pii": in_pii,
    }

    if injection["detected"]:
        return _verdict("Prompt Injection", "BLOCKED", reply=None, model=None,
                        stage="input", detectors=input_detectors)
    if jailbreak["detected"]:
        return _verdict("Jailbreak", "BLOCKED", reply=None, model=None,
                        stage="input", detectors=input_detectors)
    if in_toxicity["detected"] and in_toxicity["severity"] == "HIGH":
        return _verdict("Toxicity", "BLOCKED", reply=None, model=None,
                        stage="input", detectors=input_detectors)

    # Scrub any PII out of the prompt before it ever reaches the LLM.
    safe_prompt = redact_pii(prompt) if in_pii["detected"] else prompt

    # ---- Stage 2: LLM (OpenAI / Llama via OpenRouter) ----------------------
    llm = openrouter.generate(safe_prompt, history=history)
    if llm["error"]:
        # Couldn't reach the model — surface it without pretending it was unsafe.
        category = "PII Exposure" if in_pii["detected"] else "Safe"
        return _verdict(category, "ALLOWED", reply=None, model=llm["model"],
                        stage="input", detectors=input_detectors,
                        redacted=safe_prompt if in_pii["detected"] else None,
                        note=f"LLM unavailable: {llm['error']}")

    reply = llm["reply"]
    model = llm["model"]

    # ---- Stage 3: output detectors (on the model's reply) ------------------
    out_toxicity = detect_toxicity(reply)
    hallucination = detect_hallucination(reply, prompt=prompt)
    out_pii = detect_pii(reply)
    output_detectors = {
        "toxicity": out_toxicity,
        "hallucination": hallucination,
        "pii": out_pii,
    }

    # ---- Decision ----------------------------------------------------------
    if out_toxicity["detected"] and out_toxicity["severity"] == "HIGH":
        # Withhold the toxic reply entirely.
        return _verdict("Toxicity", "BLOCKED", reply=None, model=model,
                        stage="output", detectors=output_detectors)

    if out_pii["detected"]:
        # The model leaked PII — allow but redact what it returned.
        return _verdict("PII Exposure", "ALLOWED", reply=redact_pii(reply),
                        model=model, stage="output", detectors=output_detectors,
                        redacted=redact_pii(reply),
                        note="Sensitive values in the reply were redacted.")

    if in_pii["detected"]:
        # The user's message contained PII — flag it (already redacted upstream).
        return _verdict("PII Exposure", "ALLOWED", reply=reply, model=model,
                        stage="input", detectors=input_detectors,
                        redacted=safe_prompt,
                        note="Your message contained sensitive information, which was "
                             "redacted before being sent to the model.")

    if hallucination["detected"]:
        return _verdict("Hallucination Risk", "ALLOWED", reply=reply, model=model,
                        stage="output", detectors=output_detectors,
                        note="The reply may contain unverified claims.")

    return _verdict("Safe", "ALLOWED", reply=reply, model=model,
                    stage="output", detectors=output_detectors)
