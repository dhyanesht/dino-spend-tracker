from abc import ABC, abstractmethod


class LLMInterface(ABC):
    """Abstract base class for LLM providers"""

    @abstractmethod
    def complete(self, prompt: str) -> str:
        """Execute a completion request"""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the provider name"""
        pass

    @abstractmethod
    def model(self) -> str:
        """Return the model name"""
        pass
