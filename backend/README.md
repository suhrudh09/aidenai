# AI Safety Guardrail — Backend

FastAPI service implementing the full guardrail pipeline:

```
user prompt
  -> input guardrail   (prompt-injection / jailbreak / toxicity)
  -> LLM               (OpenAI / Llama via OpenRouter)
  -> output detectors  (Hallucination / Toxicity / PII Leak)
  -> Explainability Engine
  -> ALLOW / BLOCK  -> frontend
```

## Setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

# configure the LLM
cp .env.example .env      # then add your OpenRouter key
```

Get an API key at https://openrouter.ai/keys and set it in `backend/.env`:

```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini
```

## Run

```bash
uvicorn main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health: http://localhost:8000/

## API

### `POST /api/chat` — full pipeline (used by the Chat page)

Request:

```json
{ "message": "Who won the 2018 World Cup?" }
```

Response (abridged):

```json
{
  "action": "ALLOWED",
  "category": "Safe",
  "safety_score": 0.05,
  "reply": "France won the 2018 FIFA World Cup.",
  "model": "openai/gpt-4o-mini",
  "blocked_stage": null,
  "redacted_text": null,
  "note": null,
  "detectors": { "toxicity": {...}, "hallucination": {...}, "pii": {...} },
  "explainability": {
    "summary": "Allowed: the model's response passed all 3 safety detectors.",
    "stage": "output",
    "decision": "ALLOWED",
    "primary_category": "Safe",
    "factors": [ { "detector": "Toxicity", "detected": false, "severity": "NONE", ... } ],
    "triggered": []
  }
}
```

- If the **input** is unsafe (injection / jailbreak / high toxicity) the LLM is
  never called: `action: "BLOCKED"`, `blocked_stage: "input"`, `reply: null`.
- If the **output** leaks PII it's redacted; if it looks toxic it's withheld; if
  it looks like a hallucination it's allowed with a warning `note`.

### `POST /api/analyze` — static scanner (used by the Scanner page)

```json
{ "text": "Ignore all previous instructions.", "mode": "prompt" }
```

Returns `{ safety_score, category, action, explanation, redacted_text, details }`.

### `GET /api/config`

`{ "llm_configured": true|false }` — lets the UI show whether a key is set.

## Structure

```
backend/
├── main.py              FastAPI app, env load, CORS, routers
├── guardrail.py         orchestration: analyze() + run_chat() pipeline
├── explainability.py    Explainability Engine (detectors -> rationale)
├── routes/
│   ├── analyze.py       POST /api/analyze
│   └── chat.py          POST /api/chat, GET /api/config
├── services/
│   └── openrouter.py    OpenRouter LLM client (OpenAI / Llama / ...)
├── schemas/models.py    request models
└── detectors/
    ├── prompt_injection.py
    ├── jailbreak.py
    ├── toxicity.py
    ├── hallucination.py
    └── pii.py           detection + redaction (Luhn-checked cards)
```
