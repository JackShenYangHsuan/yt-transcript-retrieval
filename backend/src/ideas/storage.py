"""Storage for idea graph data."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path

from .models import Idea, IdeaCluster, IdeaConnection, IdeaGraph


class IdeaGraphStorage:
    """Save and load idea graph data."""

    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.ideas_file = data_dir / "ideas.json"
        self.clusters_file = data_dir / "clusters.json"
        self.connections_file = data_dir / "connections.json"
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def save(self, graph: IdeaGraph) -> None:
        """Save graph to JSON files."""
        # Save ideas (without embeddings to reduce file size)
        ideas_data = []
        for idea in graph.ideas:
            idea_dict = asdict(idea)
            idea_dict["embedding"] = []  # Don't save embeddings
            ideas_data.append(idea_dict)

        with open(self.ideas_file, "w") as f:
            json.dump(ideas_data, f, indent=2)

        # Save clusters
        with open(self.clusters_file, "w") as f:
            json.dump([asdict(c) for c in graph.clusters], f, indent=2)

        # Save connections
        with open(self.connections_file, "w") as f:
            json.dump([asdict(c) for c in graph.connections], f, indent=2)

    def load(self) -> IdeaGraph | None:
        """Load graph from JSON files."""
        if not self.ideas_file.exists():
            return None

        try:
            with open(self.ideas_file) as f:
                ideas_data = json.load(f)

            with open(self.clusters_file) as f:
                clusters_data = json.load(f)

            with open(self.connections_file) as f:
                connections_data = json.load(f)

            ideas = [Idea(**d) for d in ideas_data]
            clusters = [IdeaCluster(**d) for d in clusters_data]
            connections = [IdeaConnection(**d) for d in connections_data]

            return IdeaGraph(ideas=ideas, connections=connections, clusters=clusters)

        except Exception as e:
            print(f"Error loading graph: {e}")
            return None

    def exists(self) -> bool:
        """Check if graph data exists."""
        return self.ideas_file.exists()
