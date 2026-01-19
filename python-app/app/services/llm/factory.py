from typing import Dict, List
from app.services.llm.interface import LLMInterface
from app.services.llm.ollama_provider import OllamaProvider
from app.services.llm.groq_provider import GroqProvider


class LLMProviderFactory:
    """Factory for creating LLM provider instances based on configuration"""

    _providers: Dict[str, type] = {
        "ollama": OllamaProvider,
        "groq": GroqProvider,
    }

    @classmethod
    def register_provider(cls, name: str, provider_class: type):
        """Register a new provider class"""
        cls._providers[name.lower()] = provider_class

    @classmethod
    def create_provider(
            cls,
            provider_name: str,
            **kwargs
    ) -> LLMInterface:
        """Create an LLM provider instance"""
        provider_class = cls._providers.get(provider_name.lower())

        if provider_class is None:
            raise ValueError(
                f"Unknown LLM provider: {provider_name}. "
                f"Available providers: {list(cls._providers.keys())}"
            )

        return provider_class(**kwargs)

    @classmethod
    def get_available_providers(cls) -> List[str]:
        """Get list of available provider names"""
        return list(cls._providers.keys())
