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
    chunk_lookup: dict[str, dict] | None = None,
) -> list[dict]:
    """
    Combine multiple ranked lists using Reciprocal Rank Fusion.

    Formula: score(d) = Σ 1/(k + rank(d))

    Args:
        results_lists: List of ranked result lists, each containing dicts with 'chunk_id'
        k: RRF constant (default 60)
        chunk_lookup: Optional dict to enrich results that only have chunk_id

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
                # Use lookup to enrich sparse results, or use result directly
                if chunk_lookup and chunk_id in chunk_lookup:
                    chunk_data[chunk_id] = chunk_lookup[chunk_id]
                elif len(result) > 2:  # Has more than just chunk_id and score
                    chunk_data[chunk_id] = result

    # Sort by RRF score
    sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)

    # Build output with fused scores (only include chunks we have data for)
    output = []
    for chunk_id in sorted_ids:
        if chunk_id in chunk_data:
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
        # In lightweight mode, BM25 returns only chunk_ids without filtering
        bm25_results = self.bm25_retriever.search(
            query=query,
            top_k=self.bm25_top_k,
            guest_filter=filters.guest if not self.bm25_retriever.lightweight_mode else None,
            speaker_role_filter=filters.speaker_role if not self.bm25_retriever.lightweight_mode else None,
            topic_filter=filters.topic if not self.bm25_retriever.lightweight_mode else None,
            exclude_sponsors=filters.exclude_sponsors if not self.bm25_retriever.lightweight_mode else False,
        )

        # In lightweight mode, enrich BM25 results from Qdrant
        chunk_lookup = None
        if self.bm25_retriever.lightweight_mode and bm25_results:
            # Get chunk_ids that aren't already in dense results
            dense_ids = {r["chunk_id"] for r in dense_results}
            bm25_only_ids = [r["chunk_id"] for r in bm25_results if r["chunk_id"] not in dense_ids]

            if bm25_only_ids:
                # Fetch from Qdrant with filters applied
                chunk_lookup = self.vector_store.get_by_ids(
                    chunk_ids=bm25_only_ids,
                    guest_filter=filters.guest,
                    speaker_role_filter=filters.speaker_role,
                    topic_filter=filters.topic,
                    exclude_sponsors=filters.exclude_sponsors,
                )

        # RRF fusion
        fused_results = reciprocal_rank_fusion(
            [dense_results, bm25_results],
            k=60,
            chunk_lookup=chunk_lookup,
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
