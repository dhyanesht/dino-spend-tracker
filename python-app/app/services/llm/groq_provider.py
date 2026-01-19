from llama_index.llms.groq import Groq
from app.services.llm.interface import LLMInterface


class GroqProvider(LLMInterface):
    """Groq LLM provider implementation"""

    def __init__(
            self,
            model: str = "llama-3.1-8b-instant",
            api_key: str = None
    ):
        self._model = model
        self._llm = Groq(
            model=model,
            api_key=api_key
        )

    def complete(self, prompt: str) -> str:
        """Execute completion using Ollama"""
        response = self._llm.complete(prompt)
        return response.text

    def get_provider_name(self) -> str:
        return "groq"

    @property
    def model(self) -> str:
        return self._model
