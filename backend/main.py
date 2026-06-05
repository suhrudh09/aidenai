"""AI Safety Guardrail — FastAPI backend.

Pipeline (see the architecture diagram):
    user prompt
      -> input guardrail (prompt-injection / jailbreak / toxicity)
      -> LLM  (OpenAI / Llama via OpenRouter)
      -> output detectors (Hallucination / Toxicity / PII Leak)
      -> Explainability Engine
      -> ALLOW / BLOCK  -> frontend UI

Run from inside the `backend/` directory:
    uvicorn main:app --reload --port 8000

The React frontend (Vite, http://localhost:5173) talks to this service at
http://localhost:8000 via VITE_API_BASE_URL.
"""

from dotenv import load_dotenv

# Load backend/.env (OPENROUTER_API_KEY etc.) before anything reads os.environ.
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.analyze import router as analyze_router
from routes.chat import router as chat_router

app = FastAPI(title="AI Safety Guardrail", version="2.0.0")

# Allow the Vite dev server (and other local origins) to call the API from the
# browser. Tighten allow_origins for production deployments.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)
app.include_router(chat_router)


@app.get("/")
def health():
    return {"status": "ok", "service": "AI Safety Guardrail"}
