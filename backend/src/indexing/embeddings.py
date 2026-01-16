"""Embedding generation (OpenAI or local BGE-M3)."""

from __future__ import annotations

from typing import Iterator

from tqdm import tqdm

from ..data.models import Chunk


class OpenAIEmbedder:
    """OpenAI embedding model wrapper."""

    def __init__(self, model_name: str = "text-embedding-3-small", api_key: str = ""):
        """Initialize the OpenAI embedding model."""
        from openai import OpenAI

        self.client = OpenAI(api_key=api_key)
        self.model_name = model_name
        # text-embedding-3-small: 1536 dimensions
        # text-embedding-3-large: 3072 dimensions
        self.dimension = 1536 if "small" in model_name else 3072
        print(f"Using OpenAI {model_name}. Embedding dimension: {self.dimension}")

    def _embed_with_retry(self, batch: list[str], max_retries: int = 5) -> list[list[float]]:
        """Embed a batch with exponential backoff retry for rate limits."""
        import time
        from openai import RateLimitError

        for attempt in range(max_retries):
            try:
                response = self.client.embeddings.create(
                    model=self.model_name,
                    input=batch,
                )
                return [item.embedding for item in response.data]
            except RateLimitError as e:
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # 1, 2, 4, 8, 16 seconds
                    print(f"\nRate limit hit, waiting {wait_time}s...")
                    time.sleep(wait_time)
                else:
                    raise e
        return []

    def embed_documents(
        self,
        texts: list[str],
        batch_size: int = 50,  # Smaller batches to avoid rate limits
        show_progress: bool = True,
    ) -> list[list[float]]:
        """Embed documents (chunks)."""
        all_embeddings = []

        iterator: Iterator = range(0, len(texts), batch_size)
        if show_progress:
            iterator = tqdm(iterator, desc="Embedding documents (OpenAI)")

        for i in iterator:
            batch = texts[i : i + batch_size]
            batch_embeddings = self._embed_with_retry(batch)
            all_embeddings.extend(batch_embeddings)

        return all_embeddings

    def embed_query(self, query: str) -> list[float]:
        """Embed a query."""
        response = self.client.embeddings.create(
            model=self.model_name,
            input=query,
        )
        return response.data[0].embedding

    def embed_chunks(
        self,
        chunks: list[Chunk],
        batch_size: int = 100,
    ) -> list[tuple[Chunk, list[float]]]:
        """Embed chunks and return (chunk, embedding) pairs."""
        texts = [chunk.text for chunk in chunks]
        embeddings = self.embed_documents(texts, batch_size)
        return list(zip(chunks, embeddings))


class BGEEmbedder:
    """BGE-M3 embedding model wrapper (local, requires ~2GB RAM)."""

    # BGE-M3 query prefix for better retrieval
    QUERY_PREFIX = "Represent this sentence for searching relevant passages: "

    def __init__(self, model_name: str = "BAAI/bge-m3"):
        """Initialize the embedding model."""
        import torch
        from sentence_transformers import SentenceTransformer

        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        print(f"Loading {model_name} on {self.device}...")

        self.model = SentenceTransformer(model_name, device=self.device)
        self.dimension = self.model.get_sentence_embedding_dimension()
        print(f"Model loaded. Embedding dimension: {self.dimension}")

    def embed_documents(
        self,
        texts: list[str],
        batch_size: int = 32,
        show_progress: bool = True,
    ) -> list[list[float]]:
        """Embed documents (chunks). No prefix needed for documents."""
        all_embeddings = []

        iterator: Iterator = range(0, len(texts), batch_size)
        if show_progress:
            iterator = tqdm(iterator, desc="Embedding documents")

        for i in iterator:
            batch = texts[i : i + batch_size]
            embeddings = self.model.encode(
                batch,
                normalize_embeddings=True,
                show_progress_bar=False,
            )
            all_embeddings.extend(embeddings.tolist())

        return all_embeddings

    def embed_query(self, query: str) -> list[float]:
        """Embed a query. Uses query prefix for better retrieval."""
        prefixed_query = self.QUERY_PREFIX + query
        embedding = self.model.encode(
            prefixed_query,
            normalize_embeddings=True,
        )
        return embedding.tolist()

    def embed_chunks(
        self,
        chunks: list[Chunk],
        batch_size: int = 32,
    ) -> list[tuple[Chunk, list[float]]]:
        """Embed chunks and return (chunk, embedding) pairs."""
        texts = [chunk.text for chunk in chunks]
        embeddings = self.embed_documents(texts, batch_size)
        return list(zip(chunks, embeddings))


def create_embedder(provider: str = "openai", model_name: str = "", api_key: str = ""):
    """Factory function to create the appropriate embedder.

    Args:
        provider: "openai" or "local"
        model_name: Model name (e.g., "text-embedding-3-small" or "BAAI/bge-m3")
        api_key: API key for OpenAI (required if provider="openai")
    """
    if provider == "openai":
        model = model_name or "text-embedding-3-small"
        return OpenAIEmbedder(model_name=model, api_key=api_key)
    else:
        model = model_name or "BAAI/bge-m3"
        return BGEEmbedder(model_name=model)
