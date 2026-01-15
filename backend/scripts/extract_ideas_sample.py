#!/usr/bin/env python3
"""Quick script to extract ideas from a sample of episodes for testing."""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import settings
from src.ideas.extractor import IdeaExtractor
from src.ideas.clustering import IdeaClusterer
from src.ideas.storage import IdeaGraphStorage
from src.data.parser import parse_transcript_file


def main(num_episodes: int = 10):
    """Extract ideas from a sample of episodes."""
    print("=" * 60)
    print(f"Idea Extraction (Sample: {num_episodes} episodes)")
    print("=" * 60)

    transcripts_dir = settings.transcripts_dir / "episodes"
    if not transcripts_dir.exists():
        print(f"ERROR: Transcripts directory not found: {transcripts_dir}")
        return

    # Get sample of episode directories
    episode_dirs = sorted([d for d in transcripts_dir.iterdir() if d.is_dir()])[:num_episodes]
    print(f"Processing {len(episode_dirs)} episodes")

    # Extract ideas
    print("\n1. Extracting ideas from transcripts...")
    extractor = IdeaExtractor()

    all_ideas = []
    for i, episode_dir in enumerate(episode_dirs, 1):
        transcript_file = episode_dir / "transcript.md"
        if not transcript_file.exists():
            continue

        episode = parse_transcript_file(transcript_file)
        if not episode:
            continue

        print(f"  [{i}/{len(episode_dirs)}] {episode.metadata.guest}...", end=" ")
        ideas = extractor.extract_from_episode(episode, max_ideas=5)
        print(f"{len(ideas)} ideas")
        all_ideas.extend(ideas)

    print(f"\nExtracted {len(all_ideas)} total ideas")

    if not all_ideas:
        print("No ideas extracted. Exiting.")
        return

    # Build graph with fewer clusters for small sample
    n_clusters = min(5, len(all_ideas) // 3)
    print(f"\n2. Building idea graph ({n_clusters} clusters)...")
    clusterer = IdeaClusterer(n_clusters=n_clusters)
    graph = clusterer.build_graph(all_ideas)

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
    print("Restart the API server and visit /explore to see the graph.")
    print("=" * 60)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("-n", "--num", type=int, default=10, help="Number of episodes to process")
    args = parser.parse_args()
    main(args.num)
