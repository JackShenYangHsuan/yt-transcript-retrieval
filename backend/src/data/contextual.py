"""Contextual enrichment using Claude Haiku."""

from __future__ import annotations

import asyncio
from typing import Callable

import anthropic
from tenacity import retry, stop_after_attempt, wait_exponential
from tqdm import tqdm

from .models import Chunk, ParsedEpisode

CONTEXT_PROMPT = """<episode>
Title: {episode_title}
Guest: {episode_guest}
Description: {episode_description}
</episode>

<previous_context>
{previous_context}
</previous_context>

<current_chunk>
{speaker} ({timestamp}): {chunk_content}
</current_chunk>

Generate a brief context (2-3 sentences) that situates this chunk within the episode. Include:
1. What topic/question is being discussed
2. Any specific companies, frameworks, or concepts referenced
3. The speaker's role and expertise if relevant

Output only the context, nothing else."""


def get_previous_context(chunks: list[Chunk], current_idx: int, num_previous: int = 2) -> str:
    """Get the previous N chunks as context."""
    if current_idx == 0:
        return "This is the beginning of the episode."

    start_idx = max(0, current_idx - num_previous)
    previous_chunks = chunks[start_idx:current_idx]

    context_parts = []
    for chunk in previous_chunks:
        context_parts.append(f"{chunk.speaker}: {chunk.raw_text[:200]}...")

    return "\n".join(context_parts) if context_parts else "No previous context."


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
async def generate_context_async(
    client: anthropic.AsyncAnthropic,
    chunk: Chunk,
    previous_context: str,
    episode_description: str,
) -> str:
    """Generate contextual prefix for a chunk using Claude Haiku."""
    prompt = CONTEXT_PROMPT.format(
        episode_title=chunk.episode_title,
        episode_guest=chunk.episode_guest,
        episode_description=episode_description[:500],
        previous_context=previous_context,
        speaker=chunk.speaker,
        timestamp=chunk.start_timestamp,
        chunk_content=chunk.raw_text[:1000],
    )

    response = await client.messages.create(
        model="claude-haiku-4-20250514",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )

    return response.content[0].text


async def enrich_chunks_batch(
    chunks: list[Chunk],
    episode_description: str,
    api_key: str,
    batch_size: int = 10,
    progress_callback: Callable[[int], None] | None = None,
) -> list[Chunk]:
    """Enrich a batch of chunks with contextual prefixes."""
    client = anthropic.AsyncAnthropic(api_key=api_key)

    async def process_chunk(idx: int, chunk: Chunk) -> Chunk:
        previous_context = get_previous_context(chunks, idx)
        context = await generate_context_async(
            client, chunk, previous_context, episode_description
        )
        # Prepend context to the chunk text
        chunk.text = f"{context} {chunk.raw_text}"
        return chunk

    # Process in batches to avoid rate limits
    enriched_chunks = []
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        tasks = [process_chunk(i + j, chunk) for j, chunk in enumerate(batch)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                print(f"Error enriching chunk: {result}")
            else:
                enriched_chunks.append(result)

        if progress_callback:
            progress_callback(len(enriched_chunks))

    return enriched_chunks


def enrich_all_chunks(
    chunks: list[Chunk],
    episodes: list[ParsedEpisode],
    api_key: str,
    batch_size: int = 10,
) -> list[Chunk]:
    """Enrich all chunks with contextual prefixes."""
    # Build episode description lookup
    episode_descriptions = {
        ep.metadata.video_id: ep.metadata.description for ep in episodes
    }

    # Group chunks by episode
    chunks_by_episode: dict[str, list[Chunk]] = {}
    for chunk in chunks:
        video_id = chunk.video_id
        if video_id not in chunks_by_episode:
            chunks_by_episode[video_id] = []
        chunks_by_episode[video_id].append(chunk)

    # Sort chunks within each episode by timestamp
    for video_id in chunks_by_episode:
        chunks_by_episode[video_id].sort(key=lambda c: c.start_seconds)

    # Process each episode
    all_enriched: list[Chunk] = []

    with tqdm(total=len(chunks), desc="Enriching chunks") as pbar:
        for video_id, episode_chunks in chunks_by_episode.items():
            description = episode_descriptions.get(video_id, "")

            def update_progress(count: int):
                pbar.update(count - pbar.n + len(all_enriched))

            enriched = asyncio.run(
                enrich_chunks_batch(
                    episode_chunks,
                    description,
                    api_key,
                    batch_size,
                    progress_callback=update_progress,
                )
            )
            all_enriched.extend(enriched)

    print(f"Enriched {len(all_enriched)} chunks")
    return all_enriched
