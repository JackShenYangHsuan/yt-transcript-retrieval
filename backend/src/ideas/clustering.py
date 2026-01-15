"""Clustering and connection detection for ideas."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from typing import Literal

import numpy as np
import openai
from sklearn.cluster import KMeans
from sklearn.metrics.pairwise import cosine_similarity

from ..config import settings
from ..indexing.embeddings import BGEEmbedder
from .models import Idea, IdeaCluster, IdeaConnection, IdeaGraph


# Predefined cluster colors (10 distinct colors)
CLUSTER_COLORS = [
    "#6366f1",  # Indigo
    "#8b5cf6",  # Purple
    "#ec4899",  # Pink
    "#f43f5e",  # Rose
    "#f97316",  # Orange
    "#eab308",  # Yellow
    "#22c55e",  # Green
    "#14b8a6",  # Teal
    "#06b6d4",  # Cyan
    "#3b82f6",  # Blue
]


class IdeaClusterer:
    """Cluster ideas into themes and detect connections."""

    def __init__(
        self,
        embedder: BGEEmbedder | None = None,
        n_clusters: int = 10,
        similarity_threshold: float = 0.75,
        contradiction_threshold: float = 0.6,
    ):
        self.embedder = embedder or BGEEmbedder(model_name=settings.embedding_model)
        self.n_clusters = n_clusters
        self.similarity_threshold = similarity_threshold
        self.contradiction_threshold = contradiction_threshold
        self.client = openai.OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )
        self.model = "openai/gpt-4o"

    def generate_embeddings(self, ideas: list[Idea]) -> list[Idea]:
        """Generate embeddings for all ideas."""
        texts = [f"{idea.summary} {idea.full_context}" for idea in ideas]
        embeddings = self.embedder.embed_documents(texts)

        for idea, embedding in zip(ideas, embeddings):
            idea.embedding = embedding

        return ideas

    def cluster_ideas(self, ideas: list[Idea]) -> tuple[list[Idea], list[IdeaCluster]]:
        """Cluster ideas using K-means and name clusters using Claude."""
        if not ideas:
            return ideas, []

        # Get embedding matrix
        embeddings = np.array([idea.embedding for idea in ideas])

        # Perform K-means clustering
        n_clusters = min(self.n_clusters, len(ideas))
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        cluster_labels = kmeans.fit_predict(embeddings)

        # Group ideas by cluster
        cluster_ideas: dict[int, list[Idea]] = defaultdict(list)
        for idea, label in zip(ideas, cluster_labels):
            idea.cluster_id = str(label)
            cluster_ideas[label].append(idea)

        # Name clusters using Claude
        clusters = []
        for label in range(n_clusters):
            ideas_in_cluster = cluster_ideas[label]
            if not ideas_in_cluster:
                continue

            # Get sample ideas for naming
            sample_summaries = [idea.summary for idea in ideas_in_cluster[:10]]

            cluster_name, cluster_desc = self._name_cluster(sample_summaries)

            cluster = IdeaCluster(
                id=str(label),
                name=cluster_name,
                description=cluster_desc,
                color=CLUSTER_COLORS[label % len(CLUSTER_COLORS)],
                idea_ids=[idea.id for idea in ideas_in_cluster],
            )
            clusters.append(cluster)

            # Update ideas with cluster name
            for idea in ideas_in_cluster:
                idea.cluster_name = cluster_name

        return ideas, clusters

    def _name_cluster(self, sample_summaries: list[str]) -> tuple[str, str]:
        """Use Claude to name a cluster based on sample ideas."""
        prompt = f"""Based on these related ideas from podcast interviews, create a short cluster name and description.

Ideas in this cluster:
{chr(10).join(f"- {s}" for s in sample_summaries)}

Return a JSON object:
{{
  "name": "Short cluster name (2-4 words)",
  "description": "One sentence describing this theme"
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=256,
                messages=[{"role": "user", "content": prompt}],
            )
            json_match = re.search(r'\{[\s\S]*\}', response.choices[0].message.content)
            if json_match:
                result = json.loads(json_match.group())
                return result.get("name", "Unnamed Cluster"), result.get("description", "")
        except Exception as e:
            print(f"Error naming cluster: {e}")

        return "Unnamed Cluster", ""

    def find_connections(
        self,
        ideas: list[Idea],
        max_connections_per_idea: int = 5,
    ) -> list[IdeaConnection]:
        """Find similar and contradictory connections between ideas."""
        if len(ideas) < 2:
            return []

        embeddings = np.array([idea.embedding for idea in ideas])
        similarity_matrix = cosine_similarity(embeddings)

        connections = []
        idea_connection_counts = defaultdict(int)

        # Find similar connections
        for i, idea_i in enumerate(ideas):
            if idea_connection_counts[idea_i.id] >= max_connections_per_idea:
                continue

            # Get top similar ideas (excluding self)
            similarities = [(j, similarity_matrix[i, j]) for j in range(len(ideas)) if j != i]
            similarities.sort(key=lambda x: x[1], reverse=True)

            for j, sim in similarities[:max_connections_per_idea]:
                # No threshold - always take top N connections regardless of strength
                idea_j = ideas[j]

                # Skip if from same guest (less interesting)
                if idea_i.guest == idea_j.guest:
                    continue

                if idea_connection_counts[idea_j.id] >= max_connections_per_idea:
                    continue

                connection = IdeaConnection(
                    source_id=idea_i.id,
                    target_id=idea_j.id,
                    connection_type="similar",
                    strength=float(sim),
                )
                connections.append(connection)
                idea_connection_counts[idea_i.id] += 1
                idea_connection_counts[idea_j.id] += 1

        return connections

    def detect_contradictions(
        self,
        ideas: list[Idea],
        batch_size: int = 20,
    ) -> list[IdeaConnection]:
        """Use Claude to detect contradictory ideas."""
        contradictions = []

        # Focus on ideas that are moderately similar (0.4-0.7) - these might contradict
        embeddings = np.array([idea.embedding for idea in ideas])
        similarity_matrix = cosine_similarity(embeddings)

        # Find candidate pairs
        candidates = []
        for i in range(len(ideas)):
            for j in range(i + 1, len(ideas)):
                sim = similarity_matrix[i, j]
                if 0.4 <= sim <= 0.7 and ideas[i].guest != ideas[j].guest:
                    candidates.append((i, j, sim))

        # Sort by similarity and take top candidates
        candidates.sort(key=lambda x: x[2], reverse=True)
        candidates = candidates[:100]  # Limit API calls

        # Batch analyze for contradictions
        for batch_start in range(0, len(candidates), batch_size):
            batch = candidates[batch_start:batch_start + batch_size]

            pairs_text = "\n".join(
                f"{idx}. Idea A ({ideas[i].guest}): {ideas[i].summary}\n"
                f"   Idea B ({ideas[j].guest}): {ideas[j].summary}"
                for idx, (i, j, _) in enumerate(batch)
            )

            prompt = f"""Analyze these pairs of ideas from different podcast guests. Identify which pairs contain CONTRADICTORY viewpoints (not just different topics, but actually opposing views).

{pairs_text}

Return a JSON array of indices where ideas contradict:
{{
  "contradictions": [
    {{"pair_index": 0, "explanation": "Brief explanation of contradiction"}}
  ]
}}

Only include pairs with clear contradictions. Return empty array if none found."""

            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}],
                )
                json_match = re.search(r'\{[\s\S]*\}', response.choices[0].message.content)
                if json_match:
                    result = json.loads(json_match.group())
                    for c in result.get("contradictions", []):
                        pair_idx = c.get("pair_index", -1)
                        if 0 <= pair_idx < len(batch):
                            i, j, sim = batch[pair_idx]
                            contradiction = IdeaConnection(
                                source_id=ideas[i].id,
                                target_id=ideas[j].id,
                                connection_type="contradictory",
                                strength=0.8,  # Fixed strength for contradictions
                                explanation=c.get("explanation"),
                            )
                            contradictions.append(contradiction)
            except Exception as e:
                print(f"Error detecting contradictions: {e}")

        return contradictions

    def layout_graph(self, ideas: list[Idea], clusters: list[IdeaCluster]) -> None:
        """Assign x, y positions to ideas with generous spread for exploration."""
        if not ideas:
            return

        # Group ideas by cluster
        cluster_ideas = defaultdict(list)
        for idea in ideas:
            cluster_ideas[idea.cluster_id].append(idea)

        # Position clusters in a large circle with plenty of spacing
        n_clusters = len(clusters)
        cluster_radius = 1500  # Much larger radius for cluster centers
        for i, cluster in enumerate(clusters):
            angle = 2 * np.pi * i / n_clusters
            cluster.center_x = cluster_radius * np.cos(angle)
            cluster.center_y = cluster_radius * np.sin(angle)

        # Position ideas around cluster centers with generous spacing
        for cluster in clusters:
            ideas_in_cluster = cluster_ideas.get(cluster.id, [])
            n_ideas = len(ideas_in_cluster)

            if n_ideas == 0:
                continue

            # Use grid-like spiral for better spread
            # Each idea gets ~60px of space
            idea_radius = 200 + n_ideas * 4
            rings = max(1, int(np.sqrt(n_ideas)))

            for j, idea in enumerate(ideas_in_cluster):
                # Distribute in concentric rings with jitter
                ring = j // (n_ideas // rings + 1) if rings > 0 else 0
                pos_in_ring = j % (n_ideas // rings + 1) if rings > 0 else j
                items_in_ring = min(n_ideas // rings + 1, n_ideas - ring * (n_ideas // rings + 1))

                if items_in_ring > 0:
                    angle = 2 * np.pi * pos_in_ring / items_in_ring + ring * 0.3
                else:
                    angle = 0

                r = 150 + ring * 120  # Generous spacing between rings
                # Add slight randomization for organic feel
                jitter_x = np.random.uniform(-20, 20)
                jitter_y = np.random.uniform(-20, 20)

                idea.x = cluster.center_x + r * np.cos(angle) + jitter_x
                idea.y = cluster.center_y + r * np.sin(angle) + jitter_y

    def compute_top_ideas(
        self,
        ideas: list[Idea],
        clusters: list[IdeaCluster],
        connections: list[IdeaConnection],
        top_n: int = 20,
    ) -> None:
        """Compute top representative ideas per cluster based on connection count."""
        # Build connection count per idea
        connection_counts = defaultdict(int)
        for conn in connections:
            connection_counts[conn.source_id] += 1
            connection_counts[conn.target_id] += 1

        # Build idea lookup by cluster
        cluster_ideas = defaultdict(list)
        for idea in ideas:
            if idea.cluster_id:
                cluster_ideas[idea.cluster_id].append(idea)

        # For each cluster, find top connected ideas
        for cluster in clusters:
            ideas_in_cluster = cluster_ideas.get(cluster.id, [])

            # Sort by connection count, then by idea type (prefer strategic)
            sorted_ideas = sorted(
                ideas_in_cluster,
                key=lambda i: (connection_counts[i.id], i.idea_type == "strategic"),
                reverse=True,
            )

            # Take top N, ensuring diversity of guests
            top_ideas = []
            seen_guests = set()
            for idea in sorted_ideas:
                if len(top_ideas) >= top_n:
                    break
                # Prefer diverse guests
                if idea.guest not in seen_guests or len(top_ideas) < top_n // 2:
                    top_ideas.append(idea.id)
                    seen_guests.add(idea.guest)

            cluster.top_idea_ids = top_ideas

    def build_graph(self, ideas: list[Idea]) -> IdeaGraph:
        """Build complete idea graph with clustering and connections."""
        # Generate embeddings
        print("Generating embeddings...")
        ideas = self.generate_embeddings(ideas)

        # Cluster ideas
        print("Clustering ideas...")
        ideas, clusters = self.cluster_ideas(ideas)

        # Find connections
        print("Finding similar connections...")
        similar_connections = self.find_connections(ideas)

        print("Detecting contradictions...")
        contradiction_connections = self.detect_contradictions(ideas)

        all_connections = similar_connections + contradiction_connections

        # Compute top ideas per cluster
        print("Computing top ideas per cluster...")
        self.compute_top_ideas(ideas, clusters, all_connections)

        # Layout
        print("Computing layout...")
        self.layout_graph(ideas, clusters)

        return IdeaGraph(
            ideas=ideas,
            connections=all_connections,
            clusters=clusters,
        )
