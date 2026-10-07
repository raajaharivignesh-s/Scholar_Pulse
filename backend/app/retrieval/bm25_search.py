import re
from typing import List, Dict, Any
from app.retrieval.qdrant_store import get_qdrant_client, COLLECTION_NAME
# pyrefly: ignore [missing-import]
from qdrant_client.http import models

try:
    # pyrefly: ignore [missing-import]
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None

def tokenize(text: str) -> List[str]:
    """Simple alphanumeric lowercase tokenizer."""
    return re.findall(r'\w+', text.lower())

def fetch_project_chunks(project_id: int) -> List[Dict[str, Any]]:
    """Fetches all stored document chunks for a specific project from Qdrant payload."""
    client = get_qdrant_client()
    try:
        records, _ = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="project_id",
                        match=models.MatchValue(value=project_id)
                    )
                ]
            ),
            limit=500,
            with_payload=True,
            with_vectors=False
        )
        return [record.payload for record in records if record.payload]
    except Exception as e:
        print(f"Error fetching project chunks for BM25: {e}")
        return []

def bm25_search_chunks(query: str, project_id: int, top_k: int = 10) -> List[Dict[str, Any]]:
    """
    Performs BM25 lexical search over all document chunks belonging to a project.
    """
    chunks = fetch_project_chunks(project_id)
    if not chunks:
        return []

    tokenized_corpus = [tokenize(chunk.get("text", "")) for chunk in chunks]
    tokenized_query = tokenize(query)

    if not tokenized_query or not tokenized_corpus:
        return chunks[:top_k]

    if BM25Okapi is not None:
        bm25 = BM25Okapi(tokenized_corpus)
        scores = bm25.get_scores(tokenized_query)
    else:
        # Fallback simple term-frequency matching if rank_bm25 not installed
        scores = []
        q_set = set(tokenized_query)
        for doc in tokenized_corpus:
            doc_set = set(doc)
            scores.append(len(q_set.intersection(doc_set)))

    scored_chunks = list(zip(chunks, scores))
    # Sort by BM25 score descending
    scored_chunks.sort(key=lambda x: x[1], reverse=True)

    results = []
    for chunk, score in scored_chunks[:top_k]:
        chunk_copy = dict(chunk)
        chunk_copy["bm25_score"] = float(score)
        results.append(chunk_copy)

    return results
