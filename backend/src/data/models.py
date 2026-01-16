"""Data models for podcast transcripts and chunks."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class EpisodeMetadata:
    """Metadata for a podcast episode."""

    guest: str
    title: str
    youtube_url: str
    video_id: str
    description: str
    duration_seconds: float
    duration_formatted: str
    view_count: int | None = None
    keywords: list[str] = field(default_factory=list)


@dataclass
class SpeakerTurn:
    """A single speaker turn in the transcript."""

    speaker: str
    role: Literal["host", "guest"]
    timestamp_raw: str  # "HH:MM:SS"
    timestamp_seconds: int
    content: str
    is_sponsor: bool = False
    word_count: int = 0

    def __post_init__(self):
        self.word_count = len(self.content.split())


@dataclass
class ParsedEpisode:
    """A fully parsed podcast episode."""

    metadata: EpisodeMetadata
    turns: list[SpeakerTurn]
    file_path: str


@dataclass
class Chunk:
    """A chunk ready for embedding and indexing."""

    # Unique identifier
    chunk_id: str

    # Content
    text: str  # Contextualized text (with context prefix)
    raw_text: str  # Original text without context

    # Episode metadata
    episode_title: str
    episode_guest: str
    youtube_url: str
    video_id: str
    episode_duration_seconds: float

    # Chunk-specific metadata
    speaker: str
    speaker_role: Literal["host", "guest"]
    start_timestamp: str
    start_seconds: int
    end_timestamp: str
    end_seconds: int

    # Computed fields
    youtube_deep_link: str
    is_sponsor_segment: bool
    chunk_type: Literal["host_question", "guest_answer", "qa_pair", "sponsor"]

    # Token count (for validation)
    token_count: int = 0

    # Extracted topics (for filtering)
    topics: list[str] = field(default_factory=list)
