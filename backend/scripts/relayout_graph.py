#!/usr/bin/env python3
"""Re-layout the existing idea graph with new positions and compute top ideas."""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import settings
from src.ideas.clustering import IdeaClusterer
from src.ideas.storage import IdeaGraphStorage


def main():
    """Re-layout existing graph, regenerate connections, and compute top ideas."""
    print("Loading existing graph data...")
    storage = IdeaGraphStorage(settings.data_dir / "ideas")

    if not storage.exists():
        print("ERROR: No existing graph data found")
        return

    graph = storage.load()
    if not graph:
        print("ERROR: Failed to load graph")
        return

    print(f"Loaded {len(graph.ideas)} ideas, {len(graph.clusters)} clusters, {len(graph.connections)} connections")

    clusterer = IdeaClusterer(n_clusters=10)

    # Regenerate embeddings (not stored to save space)
    print("Regenerating embeddings for connection computation...")
    graph.ideas = clusterer.generate_embeddings(graph.ideas)

    # Regenerate connections with new settings (no threshold, top 5 per idea)
    print("Regenerating connections (no threshold, top 5 per idea)...")
    new_similar = clusterer.find_connections(graph.ideas, max_connections_per_idea=5)

    # Keep existing contradictions (expensive to regenerate)
    existing_contradictions = [c for c in graph.connections if c.connection_type == "contradictory"]
    graph.connections = new_similar + existing_contradictions

    print(f"  New similar connections: {len(new_similar)}")
    print(f"  Kept contradictions: {len(existing_contradictions)}")
    print(f"  Total connections: {len(graph.connections)}")

    # Compute top ideas per cluster (now 20 per cluster)
    print("Computing top ideas per cluster (top 20)...")
    clusterer.compute_top_ideas(graph.ideas, graph.clusters, graph.connections, top_n=20)

    # Print top ideas per cluster
    for cluster in graph.clusters:
        print(f"  {cluster.name}: {len(cluster.top_idea_ids)} top ideas")

    # Re-layout with new algorithm
    print("Computing new layout...")
    clusterer.layout_graph(graph.ideas, graph.clusters)

    # Save updated graph
    print("Saving updated graph...")
    storage.save(graph)

    print("Done! Graph re-laid out with new connections and top ideas computed.")


if __name__ == "__main__":
    main()
