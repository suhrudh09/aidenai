from fastapi import APIRouter

from schemas.models import ChatRequest
from guardrail import run_chat
from services import openrouter

# Mounted under "/api" -> final path POST /api/chat.
router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat")
def chat(request: ChatRequest):
    """Full pipeline: screen input -> call the LLM -> screen output -> explain."""
    history = [m.model_dump() for m in request.history] if request.history else None
    return run_chat(request.message, history=history)


@router.get("/config")
def config():
    """Lets the UI show whether the LLM is wired up."""
    return {"llm_configured": openrouter.is_configured()}
