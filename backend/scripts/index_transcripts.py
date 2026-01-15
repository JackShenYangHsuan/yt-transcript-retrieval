#!/usr/bin/env python3
"""Script to index all podcast transcripts."""

import argparse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.config import settings
from src.data.chunker import create_all_chunks
from src.data.contextual import enrich_all_chunks
from src.data.parser import parse_all_transcripts
from src.indexing.embeddings import BGEEmbedder
from src.indexing.qdrant_store import PodcastVectorStore
from src.retrieval.bm25 import BM25Retriever


def main():
    parser = argparse.ArgumentParser(description="Index podcast transcripts")
    parser.add_argument(
        "--skip-contextual",
        action="store_true",
        help="Skip contextual enrichment with Claude (faster, lower quality)",
    )
    parser.add_argument(
        "--recreate",
        action="store_true",
        help="Recreate collection from scratch",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit number of episodes to process (for testing)",
    )
    args = parser.parse_args()

    print("=" * 60)
    print("PODCAST TRANSCRIPT INDEXING PIPELINE")
    print("=" * 60)

    # Step 1: Parse transcripts
    print("\n[1/5] Parsing transcripts...")
    transcripts_dir = settings.transcripts_dir / "episodes"
    episodes = parse_all_transcripts(transcripts_dir)

    if args.limit:
        episodes = episodes[: args.limit]
        print(f"Limited to {len(episodes)} episodes for testing")

    # Step 2: Create chunks
    print("\n[2/5] Creating chunks...")
    chunks = create_all_chunks(
        episodes,
        min_tokens=settings.min_chunk_tokens,
        max_tokens=settings.max_chunk_tokens,
    )

    # Step 3: Contextual enrichment (optional)
    if not args.skip_contextual:
        print("\n[3/5] Enriching chunks with context (Claude Haiku)...")
        if not settings.anthropic_api_key:
            print("WARNING: ANTHROPIC_API_KEY not set. Skipping contextual enrichment.")
        else:
            chunks = enrich_all_chunks(
                chunks,
                episodes,
                api_key=settings.anthropic_api_key,
            )
    else:
        print("\n[3/5] Skipping contextual enrichment (--skip-contextual flag)")

    # Step 4: Generate embeddings and index to Qdrant
    print("\n[4/5] Generating embeddings and indexing to Qdrant...")
    embedder = BGEEmbedder(model_name=settings.embedding_model)

    # Ensure data directories exist
    settings.qdrant_path.mkdir(parents=True, exist_ok=True)
    settings.bm25_index_path.mkdir(parents=True, exist_ok=True)

    # Initialize vector store
    vector_store = PodcastVectorStore(
        collection_name=settings.collection_name,
        path=settings.qdrant_path,
        embedding_dimension=embedder.dimension,
    )
    vector_store.create_collection(recreate=args.recreate)

    # Embed and index
    texts = [chunk.text for chunk in chunks]
    embeddings = embedder.embed_documents(texts)
    vector_store.upsert_chunks(chunks, embeddings)

    # Step 5: Build BM25 index
    print("\n[5/5] Building BM25 index...")
    bm25_retriever = BM25Retriever()
    bm25_retriever.build_index(chunks)
    bm25_retriever.save(settings.bm25_index_path)

    # Summary
    print("\n" + "=" * 60)
    print("INDEXING COMPLETE")
    print("=" * 60)
    print(f"Episodes processed: {len(episodes)}")
    print(f"Chunks created: {len(chunks)}")
    print(f"Qdrant path: {settings.qdrant_path}")
    print(f"BM25 index path: {settings.bm25_index_path}")

    # Test search
    print("\n[TEST] Running a sample search...")
    from src.retrieval.hybrid import HybridRetriever, SearchFilters

    bm25 = BM25Retriever()
    bm25.load(settings.bm25_index_path)

    hybrid = HybridRetriever(
        embedder=embedder,
        vector_store=vector_store,
        bm25_retriever=bm25,
    )

    test_query = "What is the most important metric for growth?"
    results = hybrid.search(test_query, SearchFilters(exclude_sponsors=True))

    print(f"\nQuery: '{test_query}'")
    print(f"Results: {len(results)}")
    if results:
        top = results[0]
        print(f"\nTop result:")
        print(f"  Guest: {top['episode_guest']}")
        print(f"  Episode: {top['episode_title']}")
        print(f"  Text: {top['raw_text'][:200]}...")
        print(f"  YouTube: {top['youtube_deep_link']}")


if __name__ == "__main__":
    main()
