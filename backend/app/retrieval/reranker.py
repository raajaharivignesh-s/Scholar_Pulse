import re
from typing import List, Dict, Any

SECTION_WEIGHTS = {
    "Abstract": 1.25,
    "Methodology": 1.20,
    "Results": 1.15,
    "Introduction": 1.10,
    "Discussion": 1.05,
    "Conclusion": 1.05,
    "Related Work": 1.0,
    "General": 1.0,
    "References": 0.5
}

def calculate_relevance_score(query: str, text: str, section: str = "General") -> float:
    """
    Calculates query-passage relevance score based on token overlap, 
    phrase match, and section importance weighting.
    """
    if not query or not text:
        return 0.0

    q_tokens = [t.lower() for t in re.findall(r'\w+', query) if len(t) > 2]
    if not q_tokens:
        return 0.0

    t_lower = text.lower()
    
    # 1. Exact term matches
    term_matches = sum(1 for token in q_tokens if token in t_lower)
    term_coverage = term_matches / len(q_tokens)

    # 2. Exact phrase match bonus
    q_clean = " ".join(q_tokens)
    phrase_bonus = 0.5 if q_clean in t_lower else 0.0

    # 3. Section importance multiplier
    sec_weight = SECTION_WEIGHTS.get(section, 1.0)

    # Combined raw score calculation
    raw_score = (term_coverage * 0.7) + (phrase_bonus * 0.3)
    final_score = raw_score * sec_weight
    return round(final_score, 4)

def rerank_chunks(query: str, chunks: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Re-scores candidate chunks and returns the top_k most relevant passages.
    """
    if not chunks:
        return []

    reranked = []
    for chunk in chunks:
        chunk_text = chunk.get("text", "")
        sec_name = chunk.get("section", "General")
        
        # Base score from RRF fusion if available
        base_rrf = chunk.get("rrf_score", 0.0)
        relevance = calculate_relevance_score(query, chunk_text, section=sec_name)
        
        # Composite score blending cross-encoder relevance with RRF rank
        composite_score = round(relevance + (base_rrf * 2.0), 4)

        chunk_copy = dict(chunk)
        chunk_copy["rerank_score"] = composite_score
        reranked.append(chunk_copy)

    # Sort candidates descending by composite rerank score
    reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
    return reranked[:top_k]
