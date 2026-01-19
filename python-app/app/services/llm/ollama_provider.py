from llama_index.llms.ollama import Ollama
from app.services.llm.interface import LLMInterface


class OllamaProvider(LLMInterface):
    """Ollama LLM provider implementation"""

    def __init__(
            self,
            model: str = "qwen2:0.5b",
            base_url: str = "http://localhost:11434",
            request_timeout: float = 120.0,
            context_window: int = 8000,
            temperature: float = 0.2
    ):
        self._model = model
        self._llm = Ollama(
            model=model,
            base_url=base_url,
            request_timeout=request_timeout,
            context_window=context_window,
            temperature=temperature
        )

    def complete(self, prompt: str) -> str:
        """Execute completion using Ollama"""
        response = self._llm.complete(prompt)
        return response.text

    def get_provider_name(self) -> str:
        return "ollama"

    @property
    def model(self) -> str:
        return self._model

