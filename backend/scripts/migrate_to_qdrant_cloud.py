"""Migrate local Qdrant data to Qdrant Cloud."""

import sys
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct


def migrate_to_cloud(
    local_path: str,
    cloud_url: str,
    cloud_api_key: str,
    collection_name: str = "podcast_chunks",
    batch_size: int = 100,
):
    """Migrate data from local Qdrant to Qdrant Cloud."""

    print(f"Connecting to local Qdrant at {local_path}...")
    local_client = QdrantClient(path=local_path)

    print(f"Connecting to Qdrant Cloud at {cloud_url}...")
    cloud_client = QdrantClient(url=cloud_url, api_key=cloud_api_key)

    # Get collection info from local
    local_info = local_client.get_collection(collection_name)
    vector_size = local_info.config.params.vectors.size
    print(f"Local collection: {local_info.points_count} points, {vector_size} dimensions")

    # Create collection in cloud (if not exists)
    collections = cloud_client.get_collections().collections
    if any(c.name == collection_name for c in collections):
        print(f"Collection {collection_name} already exists in cloud. Deleting...")
        cloud_client.delete_collection(collection_name)

    print(f"Creating collection {collection_name} in cloud...")
    cloud_client.create_collection(
        collection_name=collection_name,
        vectors_config=VectorParams(
            size=vector_size,
            distance=Distance.COSINE,
        ),
    )

    # Scroll through all points and upload in batches
    print("Migrating points...")
    offset = None
    total_migrated = 0

    while True:
        # Fetch batch from local
        results, offset = local_client.scroll(
            collection_name=collection_name,
            limit=batch_size,
            offset=offset,
            with_vectors=True,
            with_payload=True,
        )

        if not results:
            break

        # Convert to PointStruct for upload
        points = [
            PointStruct(
                id=point.id,
                vector=point.vector,
                payload=point.payload,
            )
            for point in results
        ]

        # Upload to cloud
        cloud_client.upsert(
            collection_name=collection_name,
            points=points,
        )

        total_migrated += len(points)
        print(f"  Migrated {total_migrated} / {local_info.points_count} points...")

        if offset is None:
            break

    # Verify
    cloud_info = cloud_client.get_collection(collection_name)
    print(f"\nMigration complete!")
    print(f"  Local points: {local_info.points_count}")
    print(f"  Cloud points: {cloud_info.points_count}")

    if cloud_info.points_count == local_info.points_count:
        print("  ✓ All points migrated successfully!")
    else:
        print("  ✗ Point count mismatch!")
        return False

    return True


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Migrate Qdrant data to cloud")
    parser.add_argument("--local-path", required=True, help="Path to local Qdrant storage")
    parser.add_argument("--cloud-url", required=True, help="Qdrant Cloud URL")
    parser.add_argument("--cloud-api-key", required=True, help="Qdrant Cloud API key")
    parser.add_argument("--collection", default="podcast_chunks", help="Collection name")

    args = parser.parse_args()

    success = migrate_to_cloud(
        local_path=args.local_path,
        cloud_url=args.cloud_url,
        cloud_api_key=args.cloud_api_key,
        collection_name=args.collection,
    )

    sys.exit(0 if success else 1)
