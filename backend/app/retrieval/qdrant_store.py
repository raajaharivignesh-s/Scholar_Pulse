import os
import uuid
import logging
from typing import List, Dict, Any, Optional
try:
    from qdrant_client import QdrantClient
    from qdrant_client.http import models
except ImportError:
    QdrantClient = None
    models = None

from app.ingestion.chunker import DocumentChunk
from app.retrieval.embeddings import generate_embeddings, VECTOR_SIZE

logger = logging.getLogger(__name__)

QDRANT_URL = os.environ.get("QDRANT_URL", "http://localhost:6333")
COLLECTION_NAME = "scholarpulse_papers"

_qdrant_client = None

def get_qdrant_client() -> Optional[Any]:
    global _qdrant_client
    if QdrantClient is None:
        return None
    if _qdrant_client is None:
        try:
            client = QdrantClient(url=QDRANT_URL, timeout=3.0)
            _init_collection(client)
            _qdrant_client = client
        except Exception as e:
            logger.warning(f"Qdrant connection unavailable at {QDRANT_URL}: {e}")
            _qdrant_client = None
    return _qdrant_client

def _init_collection(client: Any):
    try:
        collections = client.get_collections()
        if COLLECTION_NAME not in [c.name for c in collections.collections]:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=models.VectorParams(
                    size=VECTOR_SIZE,
                    distance=models.Distance.COSINE
                )
            )
            logger.info(f"Initialized Qdrant collection '{COLLECTION_NAME}' (size={VECTOR_SIZE})")
    except Exception as e:
        logger.warning(f"Could not initialize Qdrant collection: {e}")

def store_chunks(chunks: List[DocumentChunk]):
    """
    Embeds chunks and stores them in Qdrant with payload metadata (section, page, document_id, project_id).
    """
    if not chunks:
        return

    client = get_qdrant_client()
    if client is None:
        logger.warning("Qdrant store unavailable. Skipping vector upsert.")
        return

    try:
        texts = [chunk.text for chunk in chunks]
        vectors = generate_embeddings(texts)
        
        points = []
        for i, (chunk, vector) in enumerate(zip(chunks, vectors)):
            doc_id = chunk.metadata.get("document_id", 0)
            chk_idx = chunk.metadata.get("chunk_index", i)
            point_id = str(uuid.uuid5(uuid.NAMESPACE_OID, f"doc_{doc_id}_chunk_{chk_idx}"))
            
            payload = {
                "text": chunk.text,
                "document_id": doc_id,
                "project_id": chunk.metadata.get("project_id", 0),
                "chunk_index": chk_idx,
                "section": chunk.metadata.get("section", "General"),
                "page": chunk.metadata.get("page", 1)
            }
            
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload
                )
            )

        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        logger.info(f"Upserted {len(points)} vector points into Qdrant collection '{COLLECTION_NAME}'")
    except Exception as e:
        logger.error(f"Failed to upsert chunks into Qdrant: {e}")

def search_chunks(query: str, project_id: int, top_k: int = 5) -> List[Dict[str, Any]]:
    """
    Searches for the most relevant section chunks in a project via dense vector similarity.
    """
    client = get_qdrant_client()
    if client is None:
        logger.warning("Qdrant store unavailable. Vector search returning empty list.")
        return []

    try:
        query_vectors = generate_embeddings([query])
        if not query_vectors:
            return []
            
        query_vector = query_vectors[0]
        
        q_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="project_id",
                    match=models.MatchValue(value=project_id)
                )
            ]
        )
        if hasattr(client, "query_points"):
            res = client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_vector,
                query_filter=q_filter,
                limit=top_k
            )
            hits = getattr(res, "points", [])
            return [hit.payload for hit in hits if hasattr(hit, "payload")]
        else:
            results = client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_vector,
                query_filter=q_filter,
                limit=top_k
            )
            return [hit.payload for hit in results]
    except Exception as e:
        logger.error(f"Qdrant vector search failed: {e}")
        return []
