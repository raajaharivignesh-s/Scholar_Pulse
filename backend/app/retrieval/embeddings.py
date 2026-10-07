import hashlib
from typing import List

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
            _embedding_model = TextEmbedding(model_name="BAAI/bge-small-en-v1.5")
        except Exception as e:
            print(f"Failed to load FastEmbed model: {e}")
            _embedding_model = None
    return _embedding_model

def fallback_vector(text: str, dim: int = VECTOR_SIZE) -> List[float]:
    """Generates a deterministic float vector based on text hash for offline/fallback use."""
    h = hashlib.sha256(text.encode("utf-8")).digest()
    vec = [(float(b) / 255.0) - 0.5 for b in h]
    # Tile or trim to exact vector size (384)
    while len(vec) < dim:
        vec.extend(vec)
    return vec[:dim]

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """
    Generate embeddings for a list of strings using FastEmbed with fallback support.
    Returns a list of 384-dimensional float arrays.
    """
    if not texts:
        return []

    model = get_embedding_model()
    if model is None:
        return [fallback_vector(t) for t in texts]

    try:
        embeddings_gen = model.embed(texts)
        vectors = [list(map(float, emb)) for emb in embeddings_gen]
        return vectors
    except Exception as e:
        print(f"Error during FastEmbed generation: {e}. Using fallback vector generation.")
        return [fallback_vector(t) for t in texts]
