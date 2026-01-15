"""Data models for idea constellation graph."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class Idea:
    """A single idea extracted from a podcast transcript."""

    id: str
    summary: str  # Concise summary of the idea (1-2 sentences)
    full_context: str  # Original transcript excerpt
    guest: str
    episode_title: str
    video_id: str
    timestamp: str
    timestamp_seconds: int
    youtube_deep_link: str

    # Classification
    idea_type: Literal["strategic", "tactical"]  # Strategic theme vs tactical insight
    cluster_id: str | None = None
    cluster_name: str | None = None

    # Embedding for similarity search
    embedding: list[float] = field(default_factory=list)

    # Position in graph (set during layout)
    x: float = 0.0
    y: float = 0.0


@dataclass
class IdeaConnection:
    """Connection between two ideas."""

    source_id: str
    target_id: str
    connection_type: Literal["similar", "contradictory"]
    strength: float  # 0-1, determines edge thickness
    explanation: str | None = None  # Why they're connected/contradictory


@dataclass
class IdeaCluster:
    """A cluster of related ideas."""

    id: str
    name: str
    description: str
    color: str  # Hex color for visualization
    idea_ids: list[str] = field(default_factory=list)

    # Top representative ideas (most connected within cluster)
    top_idea_ids: list[str] = field(default_factory=list)

    # Centroid position for cluster layout
    center_x: float = 0.0
    center_y: float = 0.0


@dataclass
class IdeaGraph:
    """Complete graph data structure for visualization."""

    ideas: list[Idea]
    connections: list[IdeaConnection]
    clusters: list[IdeaCluster]
