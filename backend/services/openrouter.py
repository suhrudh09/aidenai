"""OpenRouter LLM client.

The "OpenAI / Llama" box in the architecture. Sends the (already input-screened)
user prompt to a model via the OpenRouter API and returns its reply. Any model
slug supported by OpenRouter works — set OPENROUTER_MODEL (e.g.
"openai/gpt-4o-mini" or "meta-llama/llama-3.1-8b-instruct").

Config (env vars, see backend/.env.example):
    OPENROUTER_API_KEY   required to actually call the LLM
    OPENROUTER_MODEL     default "openai/gpt-4o-mini"
    OPENROUTER_REFERER   sent as HTTP-Referer (OpenRouter ranking, optional)
    OPENROUTER_TITLE     sent as X-Title (optional)
"""

import os

import requests

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are a helpful AI assistant operating behind a safety guardrail. "
    "Answer clearly, concisely, and truthfully. If you are unsure about a "
    "fact, say so rather than inventing details."
)


def _config() -> dict:
    return {
        "api_key": os.getenv("OPENROUTER_API_KEY", "").strip(),
        "model": os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip(),
        "referer": os.getenv("OPENROUTER_REFERER", "http://localhost:5173").strip(),
        "title": os.getenv("OPENROUTER_TITLE", "AI Safety Guardrail").strip(),
    }


def is_configured() -> bool:
    """True when an API key is present so the LLM can actually be called."""
    return bool(_config()["api_key"])


def generate(prompt: str, history: list | None = None, timeout: int = 40) -> dict:
    """Call the LLM. Returns {reply, model, error} — error is None on success."""
    cfg = _config()
    if not cfg["api_key"]:
        return {
            "reply": None,
            "model": cfg["model"],
            "error": "OPENROUTER_API_KEY is not configured on the server.",
        }

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": prompt})

    try:
        resp = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {cfg['api_key']}",
                "HTTP-Referer": cfg["referer"],
                "X-Title": cfg["title"],
                "Content-Type": "application/json",
            },
            json={"model": cfg["model"], "messages": messages},
            timeout=timeout,
        )
        resp.raise_for_status()
        data = resp.json()
        reply = data["choices"][0]["message"]["content"]
        return {"reply": reply, "model": data.get("model", cfg["model"]), "error": None}
    except requests.HTTPError:
        detail = ""
        try:
            detail = resp.json().get("error", {}).get("message", "")
        except Exception:
            detail = resp.text[:200] if "resp" in dir() else ""
        return {
            "reply": None,
            "model": cfg["model"],
            "error": f"OpenRouter API error ({resp.status_code}): {detail}",
        }
    except requests.RequestException as e:
        return {"reply": None, "model": cfg["model"], "error": f"Network error: {e}"}
    except (KeyError, IndexError, ValueError) as e:
        return {"reply": None, "model": cfg["model"], "error": f"Unexpected LLM response: {e}"}
