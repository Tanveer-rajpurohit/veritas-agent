import math

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
    """Generate and validate dense embeddings for source chunks and queries."""

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

        raise RuntimeError(
            "No embedding runtime is installed. Install fastembed or sentence-transformers."
        )

    def embed_text(self, text: str) -> list[float]:
        """Generates a dense embedding vector for a single query or text."""
        return self.embed_chunks([text])[0]

    def embed_chunks(self, texts: list[str]) -> list[list[float]]:
        """Batch generates embeddings for a list of chunk texts."""
        if not texts:
            return []

        if any(not text.strip() for text in texts):
            raise ValueError("Embedding input cannot contain empty text")

        model = self._get_model()
        if hasattr(model, "embed"):
            vectors = [vector.tolist() for vector in model.embed(texts)]
        elif hasattr(model, "encode"):
            encoded = model.encode(texts, normalize_embeddings=True)
            vectors = [vector.tolist() for vector in encoded]
        else:
            raise RuntimeError("Configured embedding runtime has no supported encode method")

        if len(vectors) != len(texts):
            raise RuntimeError("Embedding runtime returned an unexpected vector count")
        return [self._validate_and_normalize(vector) for vector in vectors]

    def _validate_and_normalize(self, vector: list[float]) -> list[float]:
        """Reject malformed output and normalize it for cosine search."""
        if len(vector) != self.dimension:
            raise ValueError(
                f"Embedding dimension mismatch: expected {self.dimension}, got {len(vector)}"
            )
        if not all(math.isfinite(value) for value in vector):
            raise ValueError("Embedding contains a non-finite value")

        norm = math.sqrt(sum(value * value for value in vector))
        if norm == 0:
            raise ValueError("Embedding runtime returned a zero vector")
        return [value / norm for value in vector]


embedding_service = EmbeddingService()
