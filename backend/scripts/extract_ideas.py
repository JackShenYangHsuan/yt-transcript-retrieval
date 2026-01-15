#!/usr/bin/env python3
"""Script to extract ideas from all podcast transcripts and build the graph."""

from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import settings
from src.ideas.extractor import IdeaExtractor
from src.ideas.clustering import IdeaClusterer
from src.ideas.storage import IdeaGraphStorage


def save_raw_ideas(ideas, output_path: Path):
    """Save raw extracted ideas to JSON for backup."""
    output_path.parent.mkdir(parents=True, exist_ok=True)
    ideas_data = [asdict(idea) for idea in ideas]
    with open(output_path, "w") as f:
        json.dump(ideas_data, f, indent=2)
    print(f"   Saved raw ideas backup to {output_path}")


def main():
    """Extract ideas and build graph."""
    print("=" * 60)
    print("Idea Extraction Pipeline")
    print("=" * 60)

    transcripts_dir = settings.transcripts_dir / "episodes"
    if not transcripts_dir.exists():
        print(f"ERROR: Transcripts directory not found: {transcripts_dir}")
        return

    # Count episodes
    episode_dirs = [d for d in transcripts_dir.iterdir() if d.is_dir()]
    print(f"Found {len(episode_dirs)} episodes")

    # Extract ideas
    print("\n1. Extracting ideas from transcripts...")
    extractor = IdeaExtractor()
    ideas = list(extractor.extract_from_all_episodes(
        transcripts_dir,
        max_ideas_per_episode=8,
        progress=True,
    ))
    print(f"   Extracted {len(ideas)} ideas")

    if not ideas:
        print("No ideas extracted. Exiting.")
        return

    # Save raw ideas backup immediately
    raw_ideas_path = settings.data_dir / "ideas" / "raw_ideas_backup.json"
    save_raw_ideas(ideas, raw_ideas_path)

    # Build graph
    print("\n2. Building idea graph...")
    clusterer = IdeaClusterer(n_clusters=10)
    graph = clusterer.build_graph(ideas)

    print(f"   Created {len(graph.clusters)} clusters")
    print(f"   Found {len(graph.connections)} connections")

    # Print cluster summary
    print("\nCluster Summary:")
    for cluster in graph.clusters:
        print(f"   {cluster.name}: {len(cluster.idea_ids)} ideas")

    # Save graph
    print("\n3. Saving graph data...")
    storage = IdeaGraphStorage(settings.data_dir / "ideas")
    storage.save(graph)
    print(f"   Saved to {storage.data_dir}")

    print("\n" + "=" * 60)
    print("Done! Graph data ready for visualization.")
    print("=" * 60)


if __name__ == "__main__":
    main()
