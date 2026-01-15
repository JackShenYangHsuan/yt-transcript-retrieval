#!/usr/bin/env python3
"""Evaluation script for the podcast search system."""

import json
import sys
import time
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import settings
from src.indexing.embeddings import BGEEmbedder
from src.indexing.qdrant_store import PodcastVectorStore
from src.retrieval.bm25 import BM25Retriever
from src.retrieval.hybrid import HybridRetriever, SearchFilters
from src.retrieval.reranker import BGEReranker, SearchPipeline


def load_test_cases() -> list[dict]:
    """Load test cases from JSON file."""
    test_file = Path(__file__).parent / "test_queries.json"
    with open(test_file) as f:
        data = json.load(f)
    return data["test_cases"]


def keyword_hit_rate(results: list[dict], expected_keywords: list[str]) -> float:
    """Calculate what percentage of expected keywords appear in results."""
    if not expected_keywords:
        return 1.0

    all_text = " ".join(r.get("raw_text", "").lower() for r in results)
    hits = sum(1 for kw in expected_keywords if kw.lower() in all_text)
    return hits / len(expected_keywords)


def guest_accuracy(results: list[dict], expected_guest: str) -> float:
    """Calculate what percentage of results are from the expected guest."""
    if not results or not expected_guest:
        return 0.0

    matches = sum(1 for r in results if r.get("episode_guest") == expected_guest)
    return matches / len(results)


def mean_reciprocal_rank(results: list[dict], expected_keywords: list[str]) -> float:
    """Calculate MRR based on first result containing expected keywords."""
    if not expected_keywords:
        return 0.0

    for i, result in enumerate(results, start=1):
        text = result.get("raw_text", "").lower()
        if any(kw.lower() in text for kw in expected_keywords):
            return 1 / i

    return 0.0


def evaluate_test_case(
    pipeline: SearchPipeline,
    test_case: dict,
) -> dict:
    """Evaluate a single test case."""
    query = test_case["query"]
    filters_dict = test_case.get("filters", {})

    # Build filters
    filters = SearchFilters(
        guest=filters_dict.get("guest"),
        speaker_role=filters_dict.get("speaker_role"),
        topic=filters_dict.get("topic"),
        exclude_sponsors=True,
    )

    # Run search
    start_time = time.time()
    results = pipeline.search(query, filters)
    latency_ms = (time.time() - start_time) * 1000

    # Calculate metrics
    expected_keywords = test_case.get("expected_keywords", [])
    expected_guest = test_case.get("expected_guest")

    metrics = {
        "test_id": test_case["id"],
        "test_type": test_case["type"],
        "query": query,
        "num_results": len(results),
        "latency_ms": round(latency_ms, 2),
        "keyword_hit_rate": round(keyword_hit_rate(results, expected_keywords), 3),
        "mrr": round(mean_reciprocal_rank(results, expected_keywords), 3),
    }

    if expected_guest:
        metrics["guest_accuracy"] = round(guest_accuracy(results, expected_guest), 3)

    if results:
        metrics["top_score"] = round(results[0].get("rerank_score", 0), 3)

    # Flag potential issues
    if test_case.get("expected_low_scores"):
        if results and results[0].get("rerank_score", 1) > 0.5:
            metrics["issue"] = "High score on off-topic query"
    elif len(results) == 0:
        metrics["issue"] = "Zero results"
    elif metrics["keyword_hit_rate"] < 0.5:
        metrics["issue"] = "Low keyword coverage"

    return metrics


def run_evaluation():
    """Run full evaluation suite."""
    print("=" * 60)
    print("PODCAST SEARCH EVALUATION")
    print("=" * 60)

    # Load components
    print("\nLoading models and indexes...")

    embedder = BGEEmbedder(model_name=settings.embedding_model)

    vector_store = PodcastVectorStore(
        collection_name=settings.collection_name,
        path=settings.qdrant_path,
        embedding_dimension=embedder.dimension,
    )

    bm25_retriever = BM25Retriever()
    bm25_retriever.load(settings.bm25_index_path)

    hybrid_retriever = HybridRetriever(
        embedder=embedder,
        vector_store=vector_store,
        bm25_retriever=bm25_retriever,
    )

    reranker = BGEReranker(model_name=settings.reranker_model)

    pipeline = SearchPipeline(
        hybrid_retriever=hybrid_retriever,
        reranker=reranker,
    )

    # Load test cases
    test_cases = load_test_cases()
    print(f"\nRunning {len(test_cases)} test cases...\n")

    # Run evaluation
    all_metrics = []
    for test_case in test_cases:
        metrics = evaluate_test_case(pipeline, test_case)
        all_metrics.append(metrics)

        # Print progress
        status = "✓" if "issue" not in metrics else "✗"
        print(f"  {status} {metrics['test_id']}: {metrics['latency_ms']}ms, "
              f"kw_hit={metrics['keyword_hit_rate']}, mrr={metrics['mrr']}")

    # Aggregate metrics
    print("\n" + "=" * 60)
    print("AGGREGATE METRICS")
    print("=" * 60)

    avg_latency = sum(m["latency_ms"] for m in all_metrics) / len(all_metrics)
    avg_keyword_hit = sum(m["keyword_hit_rate"] for m in all_metrics) / len(all_metrics)
    avg_mrr = sum(m["mrr"] for m in all_metrics) / len(all_metrics)
    zero_results = sum(1 for m in all_metrics if m["num_results"] == 0)
    issues = sum(1 for m in all_metrics if "issue" in m)

    print(f"\n  Average Latency:     {avg_latency:.1f} ms")
    print(f"  Average Keyword Hit: {avg_keyword_hit:.3f}")
    print(f"  Average MRR:         {avg_mrr:.3f}")
    print(f"  Zero Result Rate:    {zero_results}/{len(all_metrics)}")
    print(f"  Issues Detected:     {issues}/{len(all_metrics)}")

    # Print issues
    if issues > 0:
        print("\n" + "-" * 40)
        print("ISSUES:")
        for m in all_metrics:
            if "issue" in m:
                print(f"  - {m['test_id']}: {m['issue']}")

    # Save results
    results_file = Path(__file__).parent / "evaluation_results.json"
    with open(results_file, "w") as f:
        json.dump({
            "summary": {
                "avg_latency_ms": round(avg_latency, 2),
                "avg_keyword_hit_rate": round(avg_keyword_hit, 3),
                "avg_mrr": round(avg_mrr, 3),
                "zero_result_rate": zero_results / len(all_metrics),
                "issue_rate": issues / len(all_metrics),
            },
            "test_results": all_metrics,
        }, f, indent=2)

    print(f"\n  Results saved to: {results_file}")

    return all_metrics


if __name__ == "__main__":
    run_evaluation()
