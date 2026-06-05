from fastapi import APIRouter

from schemas.models import PromptRequest
from guardrail import analyze as run_guardrail

# Mounted under "/api" in main.py -> final path is POST /api/analyze,
# which is exactly what the frontend's analyzeText() calls.
router = APIRouter(prefix="/api", tags=["analyze"])


@router.post("/analyze")
def analyze(request: PromptRequest):
    """Screen a prompt or model response and return the guardrail verdict."""
    return run_guardrail(request.text, request.mode)
