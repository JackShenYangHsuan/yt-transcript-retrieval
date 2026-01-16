"""Speaker-turn aware chunking for podcast transcripts."""

from __future__ import annotations

import hashlib
import re

import tiktoken

from .models import Chunk, ParsedEpisode, SpeakerTurn

# Use cl100k_base tokenizer (same as GPT-4, good approximation for BGE-M3)
TOKENIZER = tiktoken.get_encoding("cl100k_base")

# Common podcast/business topics for extraction
TOPIC_PATTERNS = {
    "growth": r"\b(growth|growing|scale|scaling)\b",
    "onboarding": r"\b(onboarding|onboard|activation)\b",
    "retention": r"\b(retention|retaining|churn)\b",
    "product-market-fit": r"\b(product.market.fit|pmf)\b",
    "metrics": r"\b(metrics?|kpis?|okrs?|north.star)\b",
    "hiring": r"\b(hiring|recruit|talent|interview)\b",
    "leadership": r"\b(leadership|leading|management|manager)\b",
    "strategy": r"\b(strategy|strategic|roadmap)\b",
    "pricing": r"\b(pricing|monetization|revenue)\b",
    "experimentation": r"\b(experiment|a/b.test|testing)\b",
    "user-research": r"\b(user.research|customer.research|interviews?)\b",
    "fundraising": r"\b(fundrais|raising|investors?|vc|venture)\b",
    "culture": r"\b(culture|values|team.building)\b",
    "ai": r"\b(ai|artificial.intelligence|machine.learning|llm|gpt)\b",
    "productivity": r"\b(productivity|efficient|workflow)\b",
    "communication": r"\b(communicat|storytelling|presentation)\b",
    "career": r"\b(career|promotion|job|role)\b",
}


def count_tokens(text: str) -> int:
    """Count tokens in text."""
    return len(TOKENIZER.encode(text))


def generate_chunk_id(video_id: str, start_seconds: int, text: str) -> str:
    """Generate a unique chunk ID (UUID format for Qdrant)."""
    content = f"{video_id}_{start_seconds}_{text[:100]}"
    # Use full MD5 hash formatted as UUID
    return hashlib.md5(content.encode()).hexdigest()


def extract_topics(text: str) -> list[str]:
    """Extract topics from text using pattern matching."""
    text_lower = text.lower()
    topics = []
    for topic, pattern in TOPIC_PATTERNS.items():
        if re.search(pattern, text_lower, re.IGNORECASE):
            topics.append(topic)
    return topics


def create_qa_pairs(turns: list[SpeakerTurn], max_qa_tokens: int = 400) -> list[list[SpeakerTurn]]:
    """
    Group turns into Q&A pairs where appropriate.

    Rules:
    - Keep host question + guest answer together if combined < max_qa_tokens
    - Merge short consecutive turns from same speaker
    - Split long monologues
    """
    if not turns:
        return []

    groups: list[list[SpeakerTurn]] = []
    i = 0

    while i < len(turns):
        current_turn = turns[i]
        current_tokens = count_tokens(current_turn.content)

        # Check if this is a host turn followed by guest turn (Q&A pair)
        if (
            current_turn.role == "host"
            and i + 1 < len(turns)
            and turns[i + 1].role == "guest"
        ):
            next_turn = turns[i + 1]
            combined_tokens = current_tokens + count_tokens(next_turn.content)

            # Keep as Q&A pair if under threshold
            if combined_tokens <= max_qa_tokens:
                groups.append([current_turn, next_turn])
                i += 2
                continue

        # Check for short consecutive turns from same speaker to merge
        group = [current_turn]
        group_tokens = current_tokens

        while (
            i + len(group) < len(turns)
            and turns[i + len(group)].speaker == current_turn.speaker
            and group_tokens < 100  # Merge if current group is short
        ):
            next_turn = turns[i + len(group)]
            next_tokens = count_tokens(next_turn.content)
            if group_tokens + next_tokens <= 512:  # Don't exceed max
                group.append(next_turn)
                group_tokens += next_tokens
            else:
                break

        groups.append(group)
        i += len(group)

    return groups


def split_long_text_with_overlap(
    text: str,
    max_tokens: int = 512,
    overlap_tokens: int = 50,
) -> list[str]:
    """Split long text at sentence boundaries with overlap."""
    if count_tokens(text) <= max_tokens:
        return [text]

    # Split by sentence endings
    sentences = []
    current = ""
    for char in text:
        current += char
        if char in ".!?" and len(current) > 20:
            sentences.append(current.strip())
            current = ""
    if current.strip():
        sentences.append(current.strip())

    if not sentences:
        return [text]

    # Build chunks with overlap
    chunks = []
    current_chunk_sentences: list[str] = []
    current_tokens = 0

    for sentence in sentences:
        sentence_tokens = count_tokens(sentence)

        if current_tokens + sentence_tokens <= max_tokens:
            current_chunk_sentences.append(sentence)
            current_tokens += sentence_tokens
        else:
            # Save current chunk
            if current_chunk_sentences:
                chunks.append(" ".join(current_chunk_sentences))

            # Start new chunk with overlap from end of previous
            overlap_sentences = []
            overlap_count = 0
            for s in reversed(current_chunk_sentences):
                s_tokens = count_tokens(s)
                if overlap_count + s_tokens <= overlap_tokens:
                    overlap_sentences.insert(0, s)
                    overlap_count += s_tokens
                else:
                    break

            current_chunk_sentences = overlap_sentences + [sentence]
            current_tokens = overlap_count + sentence_tokens

    # Don't forget last chunk
    if current_chunk_sentences:
        chunks.append(" ".join(current_chunk_sentences))

    return chunks if chunks else [text]


def create_chunks_from_episode(
    episode: ParsedEpisode,
    min_tokens: int = 100,
    max_tokens: int = 512,
    overlap_tokens: int = 50,
    max_qa_tokens: int = 400,
) -> list[Chunk]:
    """Create chunks from a parsed episode using speaker-turn aware chunking."""
    chunks: list[Chunk] = []
    metadata = episode.metadata

    # Create Q&A pairs and merge short turns
    turn_groups = create_qa_pairs(episode.turns, max_qa_tokens)

    for group in turn_groups:
        # Combine text from all turns in the group
        combined_text = " ".join(turn.content for turn in group)
        start_turn = group[0]
        end_turn = group[-1]

        # Determine chunk type
        if start_turn.is_sponsor or any(t.is_sponsor for t in group):
            chunk_type = "sponsor"
        elif len(group) == 2 and group[0].role == "host" and group[1].role == "guest":
            chunk_type = "qa_pair"
        elif start_turn.role == "host":
            chunk_type = "host_question"
        else:
            chunk_type = "guest_answer"

        # Extract topics from the combined text
        topics = extract_topics(combined_text)

        # Split if too long (with overlap)
        text_parts = split_long_text_with_overlap(combined_text, max_tokens, overlap_tokens)

        for i, text_part in enumerate(text_parts):
            # Calculate timestamps for split chunks
            if len(text_parts) > 1:
                total_seconds = max(1, end_turn.timestamp_seconds - start_turn.timestamp_seconds)
                part_start = start_turn.timestamp_seconds + int(
                    total_seconds * (i / len(text_parts))
                )
                part_end = start_turn.timestamp_seconds + int(
                    total_seconds * ((i + 1) / len(text_parts))
                )
            else:
                part_start = start_turn.timestamp_seconds
                part_end = end_turn.timestamp_seconds

            chunk_id = generate_chunk_id(metadata.video_id, part_start, text_part)

            # Format timestamps back to HH:MM:SS
            start_ts = f"{part_start // 3600:02d}:{(part_start % 3600) // 60:02d}:{part_start % 60:02d}"
            end_ts = f"{part_end // 3600:02d}:{(part_end % 3600) // 60:02d}:{part_end % 60:02d}"

            # For Q&A pairs, use the guest as the primary speaker for filtering
            primary_speaker = group[-1].speaker if chunk_type == "qa_pair" else start_turn.speaker
            primary_role = group[-1].role if chunk_type == "qa_pair" else start_turn.role

            chunk = Chunk(
                chunk_id=chunk_id,
                text=text_part,  # Will be replaced with contextualized text later
                raw_text=text_part,
                episode_title=metadata.title,
                episode_guest=metadata.guest,
                youtube_url=metadata.youtube_url,
                video_id=metadata.video_id,
                episode_duration_seconds=metadata.duration_seconds,
                speaker=primary_speaker,
                speaker_role=primary_role,
                start_timestamp=start_ts,
                start_seconds=part_start,
                end_timestamp=end_ts,
                end_seconds=part_end,
                youtube_deep_link=f"https://www.youtube.com/watch?v={metadata.video_id}&t={part_start}s",
                is_sponsor_segment=chunk_type == "sponsor",
                chunk_type=chunk_type,
                token_count=count_tokens(text_part),
                topics=topics,
            )
            chunks.append(chunk)

    return chunks


def create_all_chunks(
    episodes: list[ParsedEpisode],
    min_tokens: int = 100,
    max_tokens: int = 512,
    overlap_tokens: int = 50,
    max_qa_tokens: int = 400,
) -> list[Chunk]:
    """Create chunks from all episodes."""
    all_chunks: list[Chunk] = []

    for episode in episodes:
        episode_chunks = create_chunks_from_episode(
            episode, min_tokens, max_tokens, overlap_tokens, max_qa_tokens
        )
        all_chunks.extend(episode_chunks)

    # Print stats
    chunk_types = {}
    topic_counts = {}
    for chunk in all_chunks:
        chunk_types[chunk.chunk_type] = chunk_types.get(chunk.chunk_type, 0) + 1
        for topic in chunk.topics:
            topic_counts[topic] = topic_counts.get(topic, 0) + 1

    print(f"Created {len(all_chunks)} chunks from {len(episodes)} episodes")
    print(f"Chunk types: {chunk_types}")
    print(f"Top topics: {dict(sorted(topic_counts.items(), key=lambda x: -x[1])[:10])}")

    return all_chunks
