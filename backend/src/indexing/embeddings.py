"""BGE-M3 embedding generation."""

from __future__ import annotations

from typing import Iterator

import torch
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

from ..data.models import Chunk


class BGEEmbedder:
    """BGE-M3 embedding model wrapper."""

    # BGE-M3 query prefix for better retrieval
    QUERY_PREFIX = "Represent this sentence for searching relevant passages: "

    def __init__(self, model_name: str = "BAAI/bge-m3"):
        """Initialize the embedding model."""
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
