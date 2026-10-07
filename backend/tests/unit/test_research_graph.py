import pytest
from app.agents.research_graph import (
    ResearchGraphState,
    node_decompose_query,
    node_evaluate_evidence,
    node_synthesize_answer
)

def test_node_decompose_query():
    state = ResearchGraphState(project_id=1, query="BGE-M3 RAG performance")
    state = node_decompose_query(state)
    assert len(state.sub_queries) == 3
    assert state.sub_queries[0] == "BGE-M3 RAG performance"
    assert "methodology" in state.sub_queries[1]
    assert "findings" in state.sub_queries[2]

def test_node_evaluate_evidence():
    state = ResearchGraphState(project_id=1, query="test query")
    state.retrieved_chunks = [
        {"section": "Abstract", "text": "sample text"},
        {"section": "Methodology", "text": "sample method"}
    ]
    state = node_evaluate_evidence(state)
    assert state.evidence_evaluation["sufficient"] is True
    assert state.evidence_evaluation["total_excerpts"] == 2
    assert "Abstract" in state.evidence_evaluation["sections_covered"]
    assert "Methodology" in state.evidence_evaluation["sections_covered"]

def test_node_synthesize_answer_fallback():
    state = ResearchGraphState(project_id=1, query="BGE-M3 performance")
    state.retrieved_chunks = [
        {
            "doc_label": "Doc 1 (Methodology, p. 2)",
            "title": "BGE-M3 Evaluation Paper",
            "year": 2024,
            "text": "BGE-M3 achieves state of the art MTEB performance."
        }
    ]
    state.sources = [
        {
            "doc_label": "Doc 1 (Methodology, p. 2)",
            "title": "BGE-M3 Evaluation Paper",
            "snippet": "BGE-M3 achieves state of the art MTEB performance."
        }
    ]
    state = node_synthesize_answer(state)
    assert state.final_answer is not None
    assert len(state.final_answer) > 0
