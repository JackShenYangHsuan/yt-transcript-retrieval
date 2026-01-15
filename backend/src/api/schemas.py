"""Pydantic schemas for API requests and responses."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SearchFiltersRequest(BaseModel):
    """Search filter parameters."""

    guest: str | None = Field(None, description="Filter by guest name")
    speaker_role: str | None = Field(None, description="Filter by speaker role: 'host' or 'guest'")
    topic: str | None = Field(None, description="Filter by topic (e.g., 'growth', 'onboarding', 'hiring')")
    exclude_sponsors: bool = Field(True, description="Exclude sponsor segments")
    guest_only: bool = Field(True, description="Only show guest answers (exclude host questions)")
    min_content_length: int = Field(200, description="Minimum character length for results", ge=0)


class SearchRequest(BaseModel):
    """Search request body."""

    query: str = Field(..., description="Search query", min_length=1)
    filters: SearchFiltersRequest | None = Field(None, description="Optional filters")
    top_k: int = Field(5, description="Number of results to return", ge=1, le=20)
    include_reranking: bool = Field(True, description="Whether to apply reranking")


class ChunkResult(BaseModel):
    """A single search result chunk."""

    chunk_id: str
    text: str
    raw_text: str
    episode_title: str
    episode_guest: str
    youtube_url: str
    video_id: str
    speaker: str
    speaker_role: str
    start_timestamp: str
    start_seconds: int
    youtube_deep_link: str
    is_sponsor_segment: bool
    chunk_type: str
    topics: list[str] = []
    score: float | None = None
    rrf_score: float | None = None
    rerank_score: float | None = None


class SearchResponse(BaseModel):
    """Search response."""

    results: list[ChunkResult]
    query: str
    filters_applied: SearchFiltersRequest
    total_results: int
    query_time_ms: float


class EpisodeInfo(BaseModel):
    """Episode information."""

    guest: str
    title: str
    youtube_url: str
    video_id: str
    duration_formatted: str
    duration_seconds: float


class GuestsResponse(BaseModel):
    """List of unique guests."""

    guests: list[str]
    total: int


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    collection_info: dict | None = None


# Idea Graph schemas
class IdeaNode(BaseModel):
    """A single idea node for the graph."""

    id: str
    summary: str
    full_context: str
    guest: str
    episode_title: str
    video_id: str
    timestamp: str
    youtube_deep_link: str
    idea_type: str
    cluster_id: str | None = None
    cluster_name: str | None = None
    x: float = 0.0
    y: float = 0.0


class IdeaEdge(BaseModel):
    """Connection between two ideas."""

    source: str
    target: str
    connection_type: str  # "similar" or "contradictory"
    strength: float
    explanation: str | None = None


class ClusterInfo(BaseModel):
    """Information about an idea cluster."""

    id: str
    name: str
    description: str
    color: str
    idea_count: int
    top_idea_ids: list[str] = []  # Most connected/representative ideas
    center_x: float = 0.0
    center_y: float = 0.0


class IdeaGraphResponse(BaseModel):
    """Complete graph data for visualization."""

    nodes: list[IdeaNode]
    edges: list[IdeaEdge]
    clusters: list[ClusterInfo]
    total_ideas: int
    total_connections: int
