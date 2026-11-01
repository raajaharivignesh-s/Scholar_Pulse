import os
import hashlib
import logging
from typing import List

logger = logging.getLogger(__name__)
VECTOR_SIZE = 384

try:
    from fastembed import TextEmbedding
    _embedding_model = None
except ImportError:
    TextEmbedding = None
    _embedding_model = None

def get_embedding_model():
    global _embedding_model
    if TextEmbedding is None:
        return None
    if _embedding_model is None:
        try:
            # Multi-threaded ONNX execution utilizing all CPU cores
            threads = max(1, os.cpu_count() or 4)
            _embedding_model = TextEmbedding(
                model_name="BAAI/bge-small-en-v1.5",
                threads=threads
            )
            logger.info(f"FastEmbed BAAI/bge-small-en-v1.5 initialized with {threads} CPU threads.")
        except Exception as e:
            logger.warning(f"Failed to load FastEmbed model: {e}")
            _embedding_model = None
    return _embedding_model

def warmup_embeddings():
    """
    Pre-warms the embedding model into memory during server startup
    to prevent cold-start latency on the user's first document upload.
    """
    try:
        model = get_embedding_model()
        if model is not None:
            list(model.embed(["ScholarPulse pre-warm"]))
            logger.info("Embedding model pre-warmed successfully.")
    except Exception as e:
        logger.warning(f"Embedding warmup warning: {e}")

def fallback_vector(text: str, dim: int = VECTOR_SIZE) -> List[float]:
    """Generates a deterministic float vector based on text hash for offline/fallback use."""
    h = hashlib.sha256(text.encode("utf-8")).digest()
    vec = [(float(b) / 255.0) - 0.5 for b in h]
    # Tile or trim to exact vector size (384)
    while len(vec) < dim:
        vec.extend(vec)
    return vec[:dim]

def generate_embeddings(texts: List[str], batch_size: int = 256) -> List[List[float]]:
    """
    Generate embeddings for a list of strings using FastEmbed with multi-core parallel batching.
    Returns a list of 384-dimensional float arrays.
    """
    if not texts:
        return []

    model = get_embedding_model()
    if model is None:
        return [fallback_vector(t) for t in texts]

    try:
        parallel_workers = min(4, max(1, (os.cpu_count() or 2) // 2))
        embeddings_gen = model.embed(
            texts, 
            batch_size=batch_size,
            parallel=parallel_workers if len(texts) > 20 else None
        )
        vectors = [list(map(float, emb)) for emb in embeddings_gen]
        return vectors
    except Exception as e:
        logger.warning(f"Error during FastEmbed generation: {e}. Using fallback vector generation.")
        return [fallback_vector(t) for t in texts]
