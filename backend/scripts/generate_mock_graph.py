#!/usr/bin/env python3
"""Generate mock idea graph data for UI testing."""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import settings
from src.data.parser import parse_all_transcripts

# Mock ideas by cluster theme
MOCK_IDEAS = {
    "Growth Strategy": [
        ("Focus on activation before acquisition", "strategic"),
        ("Identify your North Star metric early", "tactical"),
        ("Growth is about experimentation velocity", "strategic"),
        ("Track cohort retention, not just DAU", "tactical"),
        ("Viral loops compound over time", "strategic"),
    ],
    "Product-Market Fit": [
        ("PMF feels like pull, not push", "strategic"),
        ("Survey your churned users regularly", "tactical"),
        ("The 40% rule: users who'd be disappointed without you", "strategic"),
        ("Build for power users first", "tactical"),
        ("Retention is the true signal of PMF", "strategic"),
    ],
    "Team Building": [
        ("Hire missionaries, not mercenaries", "strategic"),
        ("First PM hire should be a generalist", "tactical"),
        ("Culture is what you tolerate", "strategic"),
        ("Promote from within when possible", "tactical"),
        ("Small teams move faster", "strategic"),
    ],
    "User Research": [
        ("Watch users, don't just ask them", "tactical"),
        ("Jobs-to-be-done reveals true motivation", "strategic"),
        ("Five user interviews is enough to start", "tactical"),
        ("Prototype before building", "tactical"),
        ("Quantitative validates qualitative", "strategic"),
    ],
    "Pricing Strategy": [
        ("Price based on value, not cost", "strategic"),
        ("Freemium works for viral products", "tactical"),
        ("Test pricing with new users only", "tactical"),
        ("Annual plans reduce churn", "tactical"),
        ("Price increases are underutilized", "strategic"),
    ],
}

CLUSTER_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
]


def main():
    """Generate mock graph data."""
    print("=" * 60)
    print("Generating Mock Idea Graph")
    print("=" * 60)

    # Get real guest names from transcripts
    transcripts_dir = settings.transcripts_dir / "episodes"
    guests = []

    if transcripts_dir.exists():
        for episode_dir in sorted(transcripts_dir.iterdir())[:50]:
            if episode_dir.is_dir():
                name = episode_dir.name.replace("-", " ").title()
                guests.append({
                    "name": name,
                    "episode_title": f"Episode with {name}",
                    "video_id": f"mock_{episode_dir.name[:8]}",
                })

    if len(guests) < 25:
        # Add some mock guests
        for i in range(25 - len(guests)):
            guests.append({
                "name": f"Guest {i+1}",
                "episode_title": f"Episode {i+1}",
                "video_id": f"mock_video_{i}",
            })

    # Generate ideas
    ideas = []
    clusters = []
    idea_id = 0

    for cluster_idx, (cluster_name, cluster_ideas) in enumerate(MOCK_IDEAS.items()):
        cluster = {
            "id": str(cluster_idx),
            "name": cluster_name,
            "description": f"Ideas related to {cluster_name.lower()}",
            "color": CLUSTER_COLORS[cluster_idx],
            "idea_ids": [],
            "center_x": 400 * (cluster_idx % 3) - 400,
            "center_y": 350 * (cluster_idx // 3) - 175,
        }

        for idea_idx, (summary, idea_type) in enumerate(cluster_ideas):
            guest = random.choice(guests)

            # Position in a circle around cluster center
            angle = 2 * 3.14159 * idea_idx / len(cluster_ideas)
            radius = 120 + random.uniform(-20, 20)

            idea = {
                "id": f"idea_{idea_id}",
                "summary": summary,
                "full_context": f'"{summary}" - This insight came from discussing the importance of {cluster_name.lower()} in building successful products.',
                "guest": guest["name"],
                "episode_title": guest["episode_title"],
                "video_id": guest["video_id"],
                "timestamp": f"0:{random.randint(5, 55):02d}:{random.randint(0, 59):02d}",
                "timestamp_seconds": random.randint(300, 3600),
                "youtube_deep_link": f"https://youtube.com/watch?v={guest['video_id']}&t={random.randint(300, 3600)}",
                "idea_type": idea_type,
                "cluster_id": str(cluster_idx),
                "cluster_name": cluster_name,
                "embedding": [],
                "x": cluster["center_x"] + radius * (0.866 * idea_idx - 0.5 * len(cluster_ideas) / 2),
                "y": cluster["center_y"] + radius * (0.5 * idea_idx - 0.866 * len(cluster_ideas) / 2),
            }

            ideas.append(idea)
            cluster["idea_ids"].append(f"idea_{idea_id}")
            idea_id += 1

        clusters.append(cluster)

    # Generate connections (similar ideas)
    connections = []

    # Connect ideas within clusters (similar)
    for cluster in clusters:
        cluster_idea_ids = cluster["idea_ids"]
        for i in range(len(cluster_idea_ids)):
            for j in range(i + 1, len(cluster_idea_ids)):
                if random.random() < 0.3:  # 30% chance of connection
                    connections.append({
                        "source_id": cluster_idea_ids[i],
                        "target_id": cluster_idea_ids[j],
                        "connection_type": "similar",
                        "strength": random.uniform(0.75, 0.95),
                        "explanation": None,
                    })

    # Add some cross-cluster connections
    for _ in range(8):
        cluster1, cluster2 = random.sample(clusters, 2)
        idea1 = random.choice(cluster1["idea_ids"])
        idea2 = random.choice(cluster2["idea_ids"])
        connections.append({
            "source_id": idea1,
            "target_id": idea2,
            "connection_type": "similar",
            "strength": random.uniform(0.75, 0.85),
            "explanation": None,
        })

    # Add a few contradictions
    contradiction_pairs = [
        ("idea_0", "idea_5"),   # Growth vs PMF focus
        ("idea_10", "idea_15"), # Team building disagreement
    ]
    for source, target in contradiction_pairs:
        connections.append({
            "source_id": source,
            "target_id": target,
            "connection_type": "contradictory",
            "strength": 0.8,
            "explanation": "These viewpoints represent different philosophies",
        })

    # Save to data directory
    ideas_dir = settings.data_dir / "ideas"
    ideas_dir.mkdir(parents=True, exist_ok=True)

    with open(ideas_dir / "ideas.json", "w") as f:
        json.dump(ideas, f, indent=2)

    with open(ideas_dir / "clusters.json", "w") as f:
        json.dump(clusters, f, indent=2)

    with open(ideas_dir / "connections.json", "w") as f:
        json.dump(connections, f, indent=2)

    print(f"Generated {len(ideas)} ideas in {len(clusters)} clusters")
    print(f"Generated {len(connections)} connections")
    print(f"Saved to {ideas_dir}")
    print("\nRestart the API server and visit /explore to see the graph!")


if __name__ == "__main__":
    main()
