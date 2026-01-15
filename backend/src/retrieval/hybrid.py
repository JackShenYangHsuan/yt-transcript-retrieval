"""Hybrid retrieval combining dense (vector) and sparse (BM25) search with RRF fusion."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from ..indexing.embeddings import BGEEmbedder
from ..indexing.qdrant_store import PodcastVectorStore
from .bm25 import BM25Retriever


@dataclass
class SearchFilters:
    """Filters for search queries."""

    guest: str | None = None
    speaker_role: str | None = None  # "host" or "guest"
    topic: str | None = None
    exclude_sponsors: bool = True


def reciprocal_rank_fusion(
    results_lists: list[list[dict]],
    k: int = 60,
) -> list[dict]:
    """
    Combine multiple ranked lists using Reciprocal Rank Fusion.

    Formula: score(d) = Σ 1/(k + rank(d))

    Args:
        results_lists: List of ranked result lists, each containing dicts with 'chunk_id'
        k: RRF constant (default 60)

    Returns:
        Fused and re-ranked results
    """
    # Calculate RRF scores
    rrf_scores: dict[str, float] = {}
    chunk_data: dict[str, dict] = {}

    for results in results_lists:
        for rank, result in enumerate(results, start=1):
            chunk_id = result["chunk_id"]
            rrf_score = 1 / (k + rank)

            if chunk_id in rrf_scores:
                rrf_scores[chunk_id] += rrf_score
            else:
                rrf_scores[chunk_id] = rrf_score
                chunk_data[chunk_id] = result

    # Sort by RRF score
    sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

    # Build output with fused scores
    output = []
    for chunk_id in sorted_ids:
        result = chunk_data[chunk_id].copy()
        result["rrf_score"] = rrf_scores[chunk_id]
        output.append(result)

    return output


class HybridRetriever:
    """Hybrid retriever combining dense and sparse search."""

    def __init__(
        self,
        embedder: BGEEmbedder,
        vector_store: PodcastVectorStore,
        bm25_retriever: BM25Retriever,
        dense_top_k: int = 15,
        bm25_top_k: int = 15,
        fusion_top_k: int = 20,
    ):
        """Initialize the hybrid retriever."""
        self.embedder = embedder
        self.vector_store = vector_store
        self.bm25_retriever = bm25_retriever
        self.dense_top_k = dense_top_k
        self.bm25_top_k = bm25_top_k
        self.fusion_top_k = fusion_top_k

    def search(
        self,
        query: str,
        filters: SearchFilters | None = None,
        dense_weight: float = 0.5,  # Not used with RRF, but kept for future alpha tuning
    ) -> list[dict]:
        """
        Perform hybrid search with RRF fusion.

        Args:
            query: Search query
            filters: Optional search filters
            dense_weight: Weight for dense vs sparse (for future alpha tuning)

        Returns:
            Fused and ranked results
        """
        if filters is None:
            filters = SearchFilters()

        # Dense search (vector)
        query_embedding = self.embedder.embed_query(query)
        dense_results = self.vector_store.search(
            query_embedding=query_embedding,
            top_k=self.dense_top_k,
            guest_filter=filters.guest,
            speaker_role_filter=filters.speaker_role,
            topic_filter=filters.topic,
            exclude_sponsors=filters.exclude_sponsors,
        )

        # Sparse search (BM25)
        bm25_results = self.bm25_retriever.search(
            query=query,
            top_k=self.bm25_top_k,
            guest_filter=filters.guest,
            speaker_role_filter=filters.speaker_role,
            topic_filter=filters.topic,
            exclude_sponsors=filters.exclude_sponsors,
        )

        # RRF fusion
        fused_results = reciprocal_rank_fusion(
            [dense_results, bm25_results],
            k=60,
        )

        # Return top fusion_top_k results
        return fused_results[: self.fusion_top_k]

    def search_dense_only(
        self,
        query: str,
        filters: SearchFilters | None = None,
        top_k: int | None = None,
    ) -> list[dict]:
        """Search using only dense (vector) retrieval."""
        if filters is None:
            filters = SearchFilters()
        if top_k is None:
            top_k = self.dense_top_k

        query_embedding = self.embedder.embed_query(query)
        return self.vector_store.search(
            query_embedding=query_embedding,
            top_k=top_k,
            guest_filter=filters.guest,
            speaker_role_filter=filters.speaker_role,
            topic_filter=filters.topic,
            exclude_sponsors=filters.exclude_sponsors,
        )

    def search_bm25_only(
        self,
        query: str,
        filters: SearchFilters | None = None,
        top_k: int | None = None,
    ) -> list[dict]:
        """Search using only BM25 (sparse) retrieval."""
        if filters is None:
            filters = SearchFilters()
        if top_k is None:
            top_k = self.bm25_top_k

        return self.bm25_retriever.search(
            query=query,
            top_k=top_k,
            guest_filter=filters.guest,
            speaker_role_filter=filters.speaker_role,
            topic_filter=filters.topic,
            exclude_sponsors=filters.exclude_sponsors,
        )
