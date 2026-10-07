import pytest
from app.retrieval.reranker import calculate_relevance_score, rerank_chunks

def test_calculate_relevance_score():
    query = "attention mechanism transformer"
    text_high = "This paper presents the attention mechanism in transformer architectures for sequence modeling."
    text_low = "We discuss traditional recurrent neural networks and convolutional layers."

    score_high = calculate_relevance_score(query, text_high, section="Methodology")
    score_low = calculate_relevance_score(query, text_low, section="General")

    assert score_high > score_low
    assert score_high > 0.5

def test_rerank_chunks_ordering():
    query = "qdrant vector search"
    chunks = [
        {"document_id": 1, "text": "Unrelated topic on legacy SQL database indexing.", "section": "Introduction", "rrf_score": 0.01},
        {"document_id": 2, "text": "Qdrant vector search engine enables fast cosine similarity search over dense embeddings.", "section": "Methodology", "rrf_score": 0.05}
    ]

    reranked = rerank_chunks(query, chunks, top_k=2)
    assert len(reranked) == 2
    assert reranked[0]["document_id"] == 2
    assert reranked[0]["rerank_score"] > reranked[1]["rerank_score"]
    assert "rerank_score" in reranked[0]
