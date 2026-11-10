from abc import ABC, abstractmethod
from typing import List, Dict, Any, Generator

class LLMProvider(ABC):
    @abstractmethod
    def generate_answer(self, query: str, context_chunks: List[Dict[str, Any]], mode: str = "deep") -> str:
        """
        Given a user query and a list of context chunks retrieved from the knowledge base,
        generate a grounded answer.
        """
        pass

    @abstractmethod
    def generate_answer_stream(self, query: str, context_chunks: List[Dict[str, Any]]) -> Generator[str, None, None]:
        """
        Stream answer tokens for real-time response.
        """
        pass
