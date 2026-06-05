"""Request / response contracts shared with the React frontend."""

from typing import Literal, Optional

from pydantic import BaseModel, Field

Category = Literal[
    "Prompt Injection",
    "Jailbreak",
    "Toxicity",
    "PII Exposure",
    "Hallucination Risk",
    "Safe",
]


class PromptRequest(BaseModel):
    """Body for the static Prompt Scanner (POST /api/analyze)."""

    text: str = Field(..., min_length=1, max_length=20000)
    mode: Literal["prompt", "response"] = "prompt"


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    """Body for the full guardrail + LLM pipeline (POST /api/chat)."""

    message: str = Field(..., min_length=1, max_length=20000)
    # Optional prior turns for multi-turn context.
    history: Optional[list[ChatMessage]] = None
