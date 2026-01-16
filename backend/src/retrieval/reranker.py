"""BGE Reranker for improving retrieval precision."""

from __future__ import annotations

import torch
from FlagEmbedding import FlagReranker


class BGEReranker:
    """BGE Reranker for cross-encoder reranking."""

    def __init__(self, model_name: str = "BAAI/bge-reranker-large"):
        """Initialize the reranker."""
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        print(f"Loading reranker {model_name} on {self.device}...")

        # FlagReranker automatically handles device placement
        self.reranker = FlagReranker(model_name, use_fp16=self.device != "cpu")
        print("Reranker loaded.")

    def rerank(
        self,
        query: str,
        results: list[dict],
        top_n: int = 5,
        text_key: str = "text",
    ) -> list[dict]:
        """
        Rerank results using cross-encoder.

        Args:
            query: The search query
            results: List of result dicts with text content
            top_n: Number of top results to return
            text_key: Key to access text content in result dicts

        Returns:
            Reranked results with rerank_score added
        """
        if not results:
            return []

        # Prepare query-document pairs
        pairs = [[query, result[text_key]] for result in results]

        # Compute reranking scores
        scores = self.reranker.compute_score(pairs, normalize=True)

        # Handle single result case (scores returns a float instead of list)
        if isinstance(scores, (int, float)):
            scores = [scores]

        # Add scores to results
        for result, score in zip(results, scores):
            result["rerank_score"] = float(score)

        # Sort by rerank score and return top_n
        reranked = sorted(results, key=lambda x: x["rerank_score"], reverse=True)
        return reranked[:top_n]


class SearchPipeline:
    """Complete search pipeline with hybrid retrieval and optional reranking."""

    def __init__(
        self,
        hybrid_retriever,
        reranker: BGEReranker | None = None,
        rerank_top_n: int = 5,
    ):
        """Initialize the search pipeline."""
        self.hybrid_retriever = hybrid_retriever
        self.reranker = reranker
        self.rerank_top_n = rerank_top_n

    def search(
        self,
        query: str,
        filters=None,
        include_reranking: bool = True,
    ) -> list[dict]:
        """
        Execute full search pipeline.

        Args:
            query: Search query
            filters: Optional SearchFilters
            include_reranking: Whether to apply reranking

        Returns:
            Final ranked results
        """
        # Hybrid retrieval (dense + sparse + RRF fusion)
        candidates = self.hybrid_retriever.search(query, filters)

        # Skip reranking if disabled or no reranker configured
        if not include_reranking or not candidates or not self.reranker:
            return candidates

        # Rerank candidates
        reranked = self.reranker.rerank(
            query=query,
            results=candidates,
            top_n=self.rerank_top_n,
        )

        return reranked
