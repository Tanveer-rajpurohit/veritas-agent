import hashlib
import math
import struct

from app.core.config import settings

try:
    from fastembed import TextEmbedding
except ImportError:
    TextEmbedding = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None


class EmbeddingService:
    """Generates 384-dimensional dense vector embeddings for legal chunks and queries."""

    def __init__(self) -> None:
        self.model_name = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION
        self._model = None

    def _get_model(self):
        """Loads and caches the local embedding model instance."""
        if self._model is not None:
            return self._model

        if TextEmbedding is not None:
            self._model = TextEmbedding(model_name=self.model_name)
            return self._model

        if SentenceTransformer is not None:
            self._model = SentenceTransformer(self.model_name)
            return self._model

        return None

    def embed_text(self, text: str) -> list[float]:
        """Generates a dense embedding vector for a single query or text."""
        return self.embed_chunks([text])[0]

    def embed_chunks(self, texts: list[str]) -> list[list[float]]:
        """Batch generates embeddings for a list of chunk texts."""
        if not texts:
            return []

        model = self._get_model()
        if model is not None:
            if hasattr(model, "embed"):
                return [vector.tolist() for vector in model.embed(texts)]
            elif hasattr(model, "encode"):
                embeddings = model.encode(texts, normalize_embeddings=True)
                return [vec.tolist() for vec in embeddings]

        return [self._fallback_embed(t) for t in texts]

    def _fallback_embed(self, text: str) -> list[float]:
        """Generates a deterministic 384-dimensional unit vector from token hashes."""
        vec = [0.0] * self.dimension
        words = text.lower().split()
        if not words:
            vec[0] = 1.0
            return vec

        for word in words:
            digest = hashlib.sha256(word.encode("utf-8")).digest()
            for i in range(0, len(digest) - 4, 4):
                slot = (struct.unpack(">I", digest[i : i + 4])[0]) % self.dimension
                vec[slot] += 1.0

        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0:
            vec = [x / norm for x in vec]
        else:
            vec[0] = 1.0
        return vec


embedding_service = EmbeddingService()
