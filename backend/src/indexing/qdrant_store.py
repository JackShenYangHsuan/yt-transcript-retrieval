"""Qdrant vector store for podcast chunks."""

from __future__ import annotations

from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    Range,
    VectorParams,
)

from ..data.models import Chunk


class PodcastVectorStore:
    """Qdrant vector store for podcast transcript chunks."""

    def __init__(
        self,
        collection_name: str = "podcast_chunks",
        path: Path | str | None = None,
        url: str | None = None,
        api_key: str | None = None,
        embedding_dimension: int = 1024,
    ):
        """
        Initialize Qdrant client.

        Args:
            collection_name: Name of the collection
            path: Path for local file-based storage
            url: URL for Qdrant Cloud
            api_key: API key for Qdrant Cloud
            embedding_dimension: Dimension of embeddings (1024 for BGE-M3)
        """
        self.collection_name = collection_name
        self.embedding_dimension = embedding_dimension

        if url and api_key:
            # Use Qdrant Cloud
            self.client = QdrantClient(url=url, api_key=api_key)
        elif path:
            # Use local file-based storage
            self.client = QdrantClient(path=str(path))
        else:
            # In-memory (for testing)
            self.client = QdrantClient(":memory:")

    def create_collection(self, recreate: bool = False):
        """Create the collection with proper schema."""
        collections = self.client.get_collections().collections
        exists = any(c.name == self.collection_name for c in collections)

        if exists:
            if recreate:
                self.client.delete_collection(self.collection_name)
            else:
                print(f"Collection {self.collection_name} already exists")
                return

        # Create collection
        self.client.create_collection(
            collection_name=self.collection_name,
            vectors_config=VectorParams(
                size=self.embedding_dimension,
                distance=Distance.COSINE,
            ),
        )

        # Create payload indexes for fast filtering
        self._create_payload_indexes()
        print(f"Created collection {self.collection_name}")

    def _create_payload_indexes(self):
        """Create indexes on payload fields for fast filtering."""
        indexes = [
            ("episode_guest", PayloadSchemaType.KEYWORD),
            ("episode_title", PayloadSchemaType.KEYWORD),
            ("speaker", PayloadSchemaType.KEYWORD),
            ("speaker_role", PayloadSchemaType.KEYWORD),
            ("video_id", PayloadSchemaType.KEYWORD),
            ("is_sponsor_segment", PayloadSchemaType.BOOL),
            ("start_seconds", PayloadSchemaType.INTEGER),
            ("chunk_type", PayloadSchemaType.KEYWORD),
            ("topics", PayloadSchemaType.KEYWORD),
        ]

        for field_name, field_type in indexes:
            try:
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name=field_name,
                    field_schema=field_type,
                )
            except Exception as e:
                # Index might already exist
                pass

    def upsert_chunks(
        self,
        chunks: list[Chunk],
        embeddings: list[list[float]],
        batch_size: int = 100,
    ):
        """Insert or update chunks in the collection."""
        points = []

        for chunk, embedding in zip(chunks, embeddings):
            payload = {
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
            }

            point = PointStruct(
                id=chunk.chunk_id,
                vector=embedding,
                payload=payload,
            )
            points.append(point)

        # Upsert in batches
        for i in range(0, len(points), batch_size):
            batch = points[i : i + batch_size]
            self.client.upsert(
                collection_name=self.collection_name,
                points=batch,
            )

        print(f"Upserted {len(points)} chunks to {self.collection_name}")

    def search(
        self,
        query_embedding: list[float],
        top_k: int = 15,
        guest_filter: str | None = None,
        speaker_role_filter: str | None = None,
        topic_filter: str | None = None,
        exclude_sponsors: bool = True,
    ) -> list[dict]:
        """Search for similar chunks."""
        # Build filter
        must_conditions = []

        if guest_filter:
            must_conditions.append(
                FieldCondition(
                    key="episode_guest",
                    match=MatchValue(value=guest_filter),
                )
            )

        if speaker_role_filter:
            must_conditions.append(
                FieldCondition(
                    key="speaker_role",
                    match=MatchValue(value=speaker_role_filter),
                )
            )

        if topic_filter:
            must_conditions.append(
                FieldCondition(
                    key="topics",
                    match=MatchValue(value=topic_filter),
                )
            )

        if exclude_sponsors:
            must_conditions.append(
                FieldCondition(
                    key="is_sponsor_segment",
                    match=MatchValue(value=False),
                )
            )

        query_filter = Filter(must=must_conditions) if must_conditions else None

        results = self.client.query_points(
            collection_name=self.collection_name,
            query=query_embedding,
            query_filter=query_filter,
            limit=top_k,
        )

        return [
            {
                "chunk_id": hit.id,
                "score": hit.score,
                **hit.payload,
            }
            for hit in results.points
        ]

    def get_collection_info(self) -> dict:
        """Get collection statistics."""
        info = self.client.get_collection(self.collection_name)
        return {
            "name": self.collection_name,
            "points_count": info.points_count,
            "vectors_count": info.vectors_count,
            "status": info.status,
        }

    def list_guests(self) -> list[str]:
        """List all unique guests in the collection."""
        # Scroll through all points and collect unique guests
        guests = set()
        offset = None

        while True:
            results, offset = self.client.scroll(
                collection_name=self.collection_name,
                limit=1000,
                offset=offset,
                with_payload=["episode_guest"],
            )

            for point in results:
                guests.add(point.payload["episode_guest"])

            if offset is None:
                break

        return sorted(list(guests))
