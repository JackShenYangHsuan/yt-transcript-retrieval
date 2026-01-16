"""FastAPI application for podcast transcript search."""

from __future__ import annotations

import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ..config import settings
from ..indexing.embeddings import create_embedder
from ..indexing.qdrant_store import PodcastVectorStore
from ..retrieval.bm25 import BM25Retriever
from ..retrieval.hybrid import HybridRetriever, SearchFilters
from ..retrieval.reranker import BGEReranker, SearchPipeline
from .logging_middleware import LoggingMiddleware, search_metrics
from .schemas import (
    ChunkResult,
    ClusterInfo,
    GuestsResponse,
    HealthResponse,
    IdeaEdge,
    IdeaGraphResponse,
    IdeaNode,
    SearchFiltersRequest,
    SearchRequest,
    SearchResponse,
)

# Global components (loaded at startup)
search_pipeline: SearchPipeline | None = None
vector_store: PodcastVectorStore | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models and indexes at startup."""
    global search_pipeline, vector_store

    print("Loading models and indexes...")
    print(f"Embedding provider: {settings.embedding_provider}")
    print(f"Reranker enabled: {settings.use_reranker}")

    # Initialize embedder (OpenAI or local)
    embedder = create_embedder(
        provider=settings.embedding_provider,
        model_name=settings.embedding_model,
        api_key=settings.openai_api_key,
    )

    # Initialize vector store
    vector_store = PodcastVectorStore(
        collection_name=settings.collection_name,
        path=settings.qdrant_path,
        embedding_dimension=embedder.dimension,
    )

    # Initialize BM25 retriever
    bm25_retriever = BM25Retriever()
    bm25_path = settings.bm25_index_path
    if bm25_path.exists():
        bm25_retriever.load(bm25_path)
    else:
        print(f"WARNING: BM25 index not found at {bm25_path}. Run indexing first.")

    # Initialize hybrid retriever
    hybrid_retriever = HybridRetriever(
        embedder=embedder,
        vector_store=vector_store,
        bm25_retriever=bm25_retriever,
        dense_top_k=settings.dense_top_k,
        bm25_top_k=settings.bm25_top_k,
        fusion_top_k=settings.fusion_top_k,
    )

    # Initialize reranker (only if enabled)
    reranker = None
    if settings.use_reranker:
        reranker = BGEReranker(model_name=settings.reranker_model)

    # Create search pipeline
    search_pipeline = SearchPipeline(
        hybrid_retriever=hybrid_retriever,
        reranker=reranker,
        rerank_top_n=settings.rerank_top_n,
    )

    print("All models and indexes loaded. Ready to serve requests.")
    yield

    # Cleanup
    print("Shutting down...")


app = FastAPI(
    title="Lenny's Podcast Search API",
    description="SOTA retrieval system for Lenny's Podcast transcripts",
    version="1.0.0",
    lifespan=lifespan,
)

# Logging middleware
app.add_middleware(LoggingMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Check API health and index status."""
    collection_info = None
    if vector_store:
        try:
            collection_info = vector_store.get_collection_info()
        except Exception:
            pass

    return HealthResponse(
        status="healthy" if search_pipeline else "initializing",
        collection_info=collection_info,
    )


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Search podcast transcripts.

    Performs hybrid search (dense + BM25) with RRF fusion and optional reranking.
    """
    if not search_pipeline:
        raise HTTPException(status_code=503, detail="Service initializing")

    start_time = time.time()

    # Get filter settings with defaults
    filter_settings = request.filters or SearchFiltersRequest()

    # Build filters - apply guest_only by setting speaker_role to "guest"
    speaker_role = filter_settings.speaker_role
    if filter_settings.guest_only and not speaker_role:
        speaker_role = "guest"

    filters = SearchFilters(
        guest=filter_settings.guest,
        speaker_role=speaker_role,
        topic=filter_settings.topic,
        exclude_sponsors=filter_settings.exclude_sponsors,
    )

    # Execute search
    results = search_pipeline.search(
        query=request.query,
        filters=filters,
        include_reranking=request.include_reranking,
    )

    # Apply min_content_length filter
    min_len = filter_settings.min_content_length
    if min_len > 0:
        results = [r for r in results if len(r.get("raw_text", "")) >= min_len]

    # Limit to requested top_k
    results = results[: request.top_k]

    # Convert to response format
    chunk_results = []
    for r in results:
        chunk_results.append(
            ChunkResult(
                chunk_id=r.get("chunk_id", ""),
                text=r.get("text", ""),
                raw_text=r.get("raw_text", ""),
                episode_title=r.get("episode_title", ""),
                episode_guest=r.get("episode_guest", ""),
                youtube_url=r.get("youtube_url", ""),
                video_id=r.get("video_id", ""),
                speaker=r.get("speaker", ""),
                speaker_role=r.get("speaker_role", ""),
                start_timestamp=r.get("start_timestamp", ""),
                start_seconds=r.get("start_seconds", 0),
                youtube_deep_link=r.get("youtube_deep_link", ""),
                is_sponsor_segment=r.get("is_sponsor_segment", False),
                chunk_type=r.get("chunk_type", ""),
                topics=r.get("topics", []),
                score=r.get("score"),
                rrf_score=r.get("rrf_score"),
                rerank_score=r.get("rerank_score"),
            )
        )

    query_time_ms = (time.time() - start_time) * 1000

    # Log search metrics
    if chunk_results:
        search_metrics.log_search(
            query=request.query,
            filters=request.filters.model_dump() if request.filters else {},
            num_dense_results=len(results),
            num_bm25_results=len(results),
            num_fused_results=len(results),
            num_final_results=len(chunk_results),
            latency_breakdown={"total": round(query_time_ms, 2)},
            top_result_score=chunk_results[0].rerank_score,
        )
    else:
        search_metrics.log_zero_results(
            query=request.query,
            filters=request.filters.model_dump() if request.filters else {},
        )

    return SearchResponse(
        results=chunk_results,
        query=request.query,
        filters_applied=request.filters or SearchFiltersRequest(),
        total_results=len(chunk_results),
        query_time_ms=round(query_time_ms, 2),
    )


@app.get("/guests", response_model=GuestsResponse)
async def list_guests():
    """List all unique guests in the podcast collection."""
    if not vector_store:
        raise HTTPException(status_code=503, detail="Service initializing")

    guests = vector_store.list_guests()
    return GuestsResponse(guests=guests, total=len(guests))


@app.get("/topics")
async def list_topics():
    """List all available topic filters."""
    from ..data.chunker import TOPIC_PATTERNS

    return {
        "topics": list(TOPIC_PATTERNS.keys()),
        "total": len(TOPIC_PATTERNS),
    }


@app.get("/")
async def root():
    """API root endpoint."""
    return {
        "name": "Lenny's Podcast Search API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "search": "POST /search",
            "guests": "GET /guests",
            "topics": "GET /topics",
            "health": "GET /health",
            "ideas": "GET /ideas/graph",
        },
    }


@app.get("/ideas/graph", response_model=IdeaGraphResponse)
async def get_idea_graph():
    """Get the idea constellation graph data."""
    from ..ideas.storage import IdeaGraphStorage

    storage = IdeaGraphStorage(settings.data_dir / "ideas")

    if not storage.exists():
        raise HTTPException(
            status_code=404,
            detail="Idea graph not generated yet. Run the idea extraction script first.",
        )

    graph = storage.load()
    if not graph:
        raise HTTPException(status_code=500, detail="Failed to load idea graph")

    # Convert to response format
    nodes = [
        IdeaNode(
            id=idea.id,
            summary=idea.summary,
            full_context=idea.full_context,
            guest=idea.guest,
            episode_title=idea.episode_title,
            video_id=idea.video_id,
            timestamp=idea.timestamp,
            youtube_deep_link=idea.youtube_deep_link,
            idea_type=idea.idea_type,
            cluster_id=idea.cluster_id,
            cluster_name=idea.cluster_name,
            x=idea.x,
            y=idea.y,
        )
        for idea in graph.ideas
    ]

    edges = [
        IdeaEdge(
            source=conn.source_id,
            target=conn.target_id,
            connection_type=conn.connection_type,
            strength=conn.strength,
            explanation=conn.explanation,
        )
        for conn in graph.connections
    ]

    clusters = [
        ClusterInfo(
            id=cluster.id,
            name=cluster.name,
            description=cluster.description,
            color=cluster.color,
            idea_count=len(cluster.idea_ids),
            top_idea_ids=cluster.top_idea_ids,
            center_x=cluster.center_x,
            center_y=cluster.center_y,
        )
        for cluster in graph.clusters
    ]

    return IdeaGraphResponse(
        nodes=nodes,
        edges=edges,
        clusters=clusters,
        total_ideas=len(nodes),
        total_connections=len(edges),
    )
