"""BM25 sparse retrieval for keyword matching."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import bm25s

from ..data.models import Chunk


class BM25Retriever:
    """BM25 retriever for sparse keyword matching."""

    def __init__(self):
        """Initialize the BM25 retriever."""
        self.retriever = None
        self.chunks: list[Chunk] = []
        self.chunk_id_to_idx: dict[str, int] = {}

    def build_index(self, chunks: list[Chunk]):
        """Build BM25 index from chunks."""
        self.chunks = chunks
        self.chunk_id_to_idx = {chunk.chunk_id: i for i, chunk in enumerate(chunks)}

        # Extract texts for indexing
        texts = [chunk.text for chunk in chunks]

        # Tokenize
        print("Tokenizing documents for BM25...")
        corpus_tokens = bm25s.tokenize(texts, show_progress=True)

        # Build index
        print("Building BM25 index...")
        self.retriever = bm25s.BM25()
        self.retriever.index(corpus_tokens, show_progress=True)

        print(f"BM25 index built with {len(chunks)} documents")

    def search(
        self,
        query: str,
        top_k: int = 15,
        guest_filter: str | None = None,
        speaker_role_filter: str | None = None,
        topic_filter: str | None = None,
        exclude_sponsors: bool = True,
    ) -> list[dict]:
        """Search using BM25."""
        if self.retriever is None:
            raise ValueError("Index not built. Call build_index first.")

        # Tokenize query
        query_tokens = bm25s.tokenize([query])

        # Get more results than needed for post-filtering
        fetch_k = top_k * 3 if any([guest_filter, speaker_role_filter, topic_filter, exclude_sponsors]) else top_k

        # Search
        results, scores = self.retriever.retrieve(query_tokens, k=min(fetch_k, len(self.chunks)))

        # Build results with filtering
        output = []
        for idx, score in zip(results[0], scores[0]):
            chunk = self.chunks[idx]

            # Apply filters
            if guest_filter and chunk.episode_guest != guest_filter:
                continue
            if speaker_role_filter and chunk.speaker_role != speaker_role_filter:
                continue
            if topic_filter and topic_filter not in chunk.topics:
                continue
            if exclude_sponsors and chunk.is_sponsor_segment:
                continue

            output.append({
                "chunk_id": chunk.chunk_id,
                "score": float(score),
                "text": chunk.text,
                "raw_text": chunk.raw_text,
                "episode_title": chunk.episode_title,
                "episode_guest": chunk.episode_guest,
                "youtube_url": chunk.youtube_url,
                "video_id": chunk.video_id,
                "speaker": chunk.speaker,
                "speaker_role": chunk.speaker_role,
                "start_timestamp": chunk.start_timestamp,
                "start_seconds": chunk.start_seconds,
                "youtube_deep_link": chunk.youtube_deep_link,
                "is_sponsor_segment": chunk.is_sponsor_segment,
                "chunk_type": chunk.chunk_type,
                "topics": chunk.topics,
            })

            if len(output) >= top_k:
                break

        return output

    def save(self, path: Path):
        """Save the BM25 index and chunks to disk."""
        path = Path(path)
        path.mkdir(parents=True, exist_ok=True)

        # Save BM25 index (uses numpy internally, safe serialization)
        self.retriever.save(str(path / "bm25_index"))

        # Save chunks metadata as JSON (safe serialization)
        chunks_data = []
        for chunk in self.chunks:
            chunks_data.append({
                "chunk_id": chunk.chunk_id,
                "text": chunk.text,
                "raw_text": chunk.raw_text,
                "episode_title": chunk.episode_title,
                "episode_guest": chunk.episode_guest,
                "youtube_url": chunk.youtube_url,
                "video_id": chunk.video_id,
                "episode_duration_seconds": chunk.episode_duration_seconds,
                "speaker": chunk.speaker,
                "speaker_role": chunk.speaker_role,
                "start_timestamp": chunk.start_timestamp,
                "start_seconds": chunk.start_seconds,
                "end_timestamp": chunk.end_timestamp,
                "end_seconds": chunk.end_seconds,
                "youtube_deep_link": chunk.youtube_deep_link,
                "is_sponsor_segment": chunk.is_sponsor_segment,
                "chunk_type": chunk.chunk_type,
                "token_count": chunk.token_count,
                "topics": chunk.topics,
            })

        with open(path / "chunks.json", "w") as f:
            json.dump(chunks_data, f)

        print(f"BM25 index saved to {path}")

    def load(self, path: Path):
        """Load the BM25 index and chunks from disk."""
        path = Path(path)

        # Load BM25 index
        self.retriever = bm25s.BM25.load(str(path / "bm25_index"), load_corpus=False)

        # Load chunks metadata
        with open(path / "chunks.json") as f:
            chunks_data = json.load(f)

        self.chunks = []
        for data in chunks_data:
            chunk = Chunk(
                chunk_id=data["chunk_id"],
                text=data["text"],
                raw_text=data["raw_text"],
                episode_title=data["episode_title"],
                episode_guest=data["episode_guest"],
                youtube_url=data["youtube_url"],
                video_id=data["video_id"],
                episode_duration_seconds=data["episode_duration_seconds"],
                speaker=data["speaker"],
                speaker_role=data["speaker_role"],
                start_timestamp=data["start_timestamp"],
                start_seconds=data["start_seconds"],
                end_timestamp=data["end_timestamp"],
                end_seconds=data["end_seconds"],
                youtube_deep_link=data["youtube_deep_link"],
                is_sponsor_segment=data["is_sponsor_segment"],
                chunk_type=data["chunk_type"],
                token_count=data["token_count"],
                topics=data.get("topics", []),
            )
            self.chunks.append(chunk)

        self.chunk_id_to_idx = {chunk.chunk_id: i for i, chunk in enumerate(self.chunks)}
        print(f"BM25 index loaded from {path} with {len(self.chunks)} documents")
