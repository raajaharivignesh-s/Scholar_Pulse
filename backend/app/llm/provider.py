from abc import ABC, abstractmethod
from typing import List, Dict, Any

class LLMProvider(ABC):
    @abstractmethod
    def generate_answer(self, query: str, context_chunks: List[Dict[str, Any]]) -> str:
        """
        Given a user query and a list of context chunks retrieved from the knowledge base,
        generate a grounded answer.
        """
        pass
