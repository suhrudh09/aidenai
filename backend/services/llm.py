"""LLM generation layer (prototype).

Provides a minimal `LLMService` and a convenience `generate_response` function.
In production this would call OpenAI, Gemini, Ollama, etc. For local testing
it supports `mock=True` which returns deterministic canned responses.
"""
from typing import Optional


class LLMService:
    def __init__(self, model: str = "gpt-4", api_key: Optional[str] = None, mock: bool = True):
        self.model = model
        self.api_key = api_key
        self.mock = mock

    def generate(self, prompt: str, max_tokens: int = 256) -> str:
        """Return a generated answer string. In `mock` mode returns canned text."""
        if self.mock:
            p = prompt.strip().lower()
            # Mock heuristics useful for tests
            if "ssn" in p or "social security" in p:
                return "Contact John at SSN 123-45-6789."
            if "who invented python" in p:
                return "Python was invented by Guido van Rossum."
            if "api key" in p or "sk-" in p:
                return "Do not share secrets."
            return "This is a harmless mock response."

        # Real provider integration would go here.
        raise NotImplementedError("LLM provider integration not implemented in prototype")


def generate_response(prompt: str, mock: bool = True) -> str:
    """Convenience function used by the integration tests.

    Args:
        prompt: user prompt to send to the LLM
        mock: whether to use mock responses

    Returns:
        Generated answer string.
    """
    svc = LLMService(mock=mock)
    return svc.generate(prompt)


if __name__ == "__main__":
    print(generate_response("Who invented Python?", mock=True))
    print(generate_response("Provide a contact with SSN", mock=True))
