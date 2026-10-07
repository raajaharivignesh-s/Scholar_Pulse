from typing import List, Dict, Any
from app.retrieval.qdrant_store import search_chunks as dense_vector_search
from app.retrieval.bm25_search import bm25_search_chunks
from app.retrieval.reranker import rerank_chunks

def hybrid_search(
    query: str, 
    project_id: int, 
    top_k: int = 5, 
    rrf_k: int = 60, 
    rerank: bool = True
) -> List[Dict[str, Any]]:
    """
    Combines dense Qdrant vector retrieval and BM25 lexical retrieval 
    using Reciprocal Rank Fusion (RRF), followed by Cross-Encoder Reranking.
    """
    # Fetch candidate pool (top_k * 3)
    candidate_k = max(15, top_k * 3)
    dense_results = dense_vector_search(query, project_id=project_id, top_k=candidate_k)
    bm25_results = bm25_search_chunks(query, project_id=project_id, top_k=candidate_k)

    rrf_scores: Dict[str, Dict[str, Any]] = {}

    def get_chunk_key(chunk: Dict[str, Any]) -> str:
        doc_id = chunk.get("document_id", 0)
        idx = chunk.get("chunk_index", 0)
        text_snippet = chunk.get("text", "")[:30]
        return f"{doc_id}_{idx}_{hash(text_snippet)}"

    # Dense Vector RRF ranks
    for rank, chunk in enumerate(dense_results, start=1):
        key = get_chunk_key(chunk)
        if key not in rrf_scores:
            rrf_scores[key] = {"chunk": chunk, "rrf_score": 0.0, "dense_rank": rank, "bm25_rank": None}
        rrf_scores[key]["rrf_score"] += 1.0 / (rrf_k + rank)

    # BM25 RRF ranks
    for rank, chunk in enumerate(bm25_results, start=1):
        key = get_chunk_key(chunk)
        if key not in rrf_scores:
            rrf_scores[key] = {"chunk": chunk, "rrf_score": 0.0, "dense_rank": None, "bm25_rank": rank}
        else:
            rrf_scores[key]["bm25_rank"] = rank
        rrf_scores[key]["rrf_score"] += 1.0 / (rrf_k + rank)

    sorted_candidates = sorted(rrf_scores.values(), key=lambda item: item["rrf_score"], reverse=True)

    # Format candidate chunks with RRF metadata
    candidate_chunks = []
    for item in sorted_candidates:
        chunk = dict(item["chunk"])
        chunk["rrf_score"] = round(item["rrf_score"], 6)
        chunk["dense_rank"] = item["dense_rank"]
        chunk["bm25_rank"] = item["bm25_rank"]
        candidate_chunks.append(chunk)

    if rerank and candidate_chunks:
        return rerank_chunks(query, candidate_chunks, top_k=top_k)
    
    return candidate_chunks[:top_k]
