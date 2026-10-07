from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.agents.research_graph import run_research_graph

class CitationResearchAgent:
    """
    Multi-step research reasoning agent orchestrating:
    - Node 1: Query Decomposition
    - Node 2: Multi-Vector & BM25 Evidence Retrieval with Cross-Encoder Reranking
    - Node 3: Evidence Evaluation
    - Node 4: Section-Grounded Answer Synthesis
    """
    
    def __init__(self, db: Session):
        self.db = db

    def run_research_query(self, project_id: int, query: str, top_k: int = 5) -> Dict[str, Any]:
        return run_research_graph(project_id=project_id, query=query, db=self.db)
