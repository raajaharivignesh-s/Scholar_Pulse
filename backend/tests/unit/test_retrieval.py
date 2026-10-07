import pytest
from app.retrieval.embeddings import generate_embeddings, fallback_vector, VECTOR_SIZE
from app.ingestion.chunker import DocumentChunk
from app.retrieval.qdrant_store import store_chunks, search_chunks
from app.retrieval.hybrid_retriever import hybrid_search

def test_generate_embeddings_structure():
    texts = [
        "Attention mechanisms in transformer architectures.",
        "Lexical BM25 retrieval vs dense vector embeddings."
    ]
    vectors = generate_embeddings(texts)
    assert len(vectors) == 2
    assert len(vectors[0]) == VECTOR_SIZE
    assert len(vectors[1]) == VECTOR_SIZE
    assert isinstance(vectors[0][0], float)

def test_fallback_vector():
    vec = fallback_vector("Sample academic abstract")
    assert len(vec) == VECTOR_SIZE
    assert all(isinstance(val, float) for val in vec)

def test_store_and_search_chunks_resilience():
    chunks = [
        DocumentChunk(
            text="[Section: Methodology] We evaluate BGE-M3 embeddings.",
            metadata={"document_id": 1, "project_id": 1, "chunk_index": 0, "section": "Methodology", "page": 2}
        )
    ]
    # Verify store_chunks runs cleanly even if Qdrant container is offline
    store_chunks(chunks)

    # Verify search_chunks returns list without throwing exception
    results = search_chunks("BGE-M3", project_id=1, top_k=2)
    assert isinstance(results, list)

def test_hybrid_search_rrf():
    # Execute hybrid search for project 1
    results = hybrid_search("transformer attention", project_id=1, top_k=5)
    assert isinstance(results, list)
    for res in results:
        assert "rrf_score" in res
        assert "text" in res
