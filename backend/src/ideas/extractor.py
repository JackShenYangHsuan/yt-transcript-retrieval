"""Extract ideas from podcast transcripts using LLM API."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Generator

import openai
from tqdm import tqdm

from ..config import settings
from ..data.parser import parse_transcript_file, ParsedEpisode
from .models import Idea


class IdeaExtractor:
    """Extract key ideas from podcast transcripts using OpenRouter GPT-4o."""

    def __init__(self, model: str = "openai/gpt-4o"):
        self.client = openai.OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )
        self.model = model

    def _generate_idea_id(self, video_id: str, timestamp: str, summary: str) -> str:
        """Generate unique ID for an idea."""
        content = f"{video_id}_{timestamp}_{summary[:50]}"
        return hashlib.md5(content.encode()).hexdigest()

    def _extract_guest_segments(self, episode: ParsedEpisode) -> list[dict]:
        """Get substantial guest segments from an episode."""
        segments = []
        for turn in episode.turns:
            if turn.role == "guest" and not turn.is_sponsor and len(turn.content) > 200:
                segments.append({
                    "content": turn.content,
                    "timestamp": turn.timestamp_raw,
                    "timestamp_seconds": turn.timestamp_seconds,
                    "speaker": turn.speaker,
                })
        return segments

    def extract_from_episode(self, episode: ParsedEpisode, max_ideas: int = 10) -> list[Idea]:
        """Extract key ideas from a single episode."""
        guest_segments = self._extract_guest_segments(episode)

        if not guest_segments:
            return []

        # Combine segments for context (limit to avoid token limits)
        transcript_sample = "\n\n".join(
            f"[{s['timestamp']}] {s['speaker']}: {s['content']}"
            for s in guest_segments[:30]  # Limit segments
        )

        prompt = f"""Analyze this podcast transcript featuring {episode.metadata.guest} and extract the {max_ideas} most valuable ideas.

Episode: {episode.metadata.title}
Guest: {episode.metadata.guest}

Transcript:
{transcript_sample}

For each idea, provide:
1. A concise summary (1-2 sentences max)
2. Whether it's "strategic" (high-level theme/framework) or "tactical" (specific actionable advice)
3. The approximate timestamp where this idea is discussed
4. A 1-2 sentence context quote from the transcript

Return a JSON array with this exact structure:
[
  {{
    "summary": "Concise idea summary",
    "idea_type": "strategic" or "tactical",
    "timestamp": "HH:MM:SS",
    "context_quote": "Relevant quote from transcript"
  }}
]

Focus on unique, valuable insights - not generic advice. Extract ideas that someone could act on or learn from."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )

            # Parse JSON from response
            response_text = response.choices[0].message.content
            # Find JSON array in response
            json_match = re.search(r'\[[\s\S]*\]', response_text)
            if not json_match:
                print(f"No JSON found in response for {episode.metadata.guest}")
                return []

            raw_ideas = json.loads(json_match.group())

        except Exception as e:
            print(f"Error extracting ideas from {episode.metadata.guest}: {e}")
            return []

        # Convert to Idea objects
        ideas = []
        for raw in raw_ideas:
            # Find matching segment for timestamp
            timestamp = raw.get("timestamp", "00:00:00")
            timestamp_seconds = self._parse_timestamp(timestamp)

            idea = Idea(
                id=self._generate_idea_id(
                    episode.metadata.video_id,
                    timestamp,
                    raw.get("summary", "")
                ),
                summary=raw.get("summary", ""),
                full_context=raw.get("context_quote", ""),
                guest=episode.metadata.guest,
                episode_title=episode.metadata.title,
                video_id=episode.metadata.video_id,
                timestamp=timestamp,
                timestamp_seconds=timestamp_seconds,
                youtube_deep_link=f"https://youtube.com/watch?v={episode.metadata.video_id}&t={timestamp_seconds}",
                idea_type=raw.get("idea_type", "tactical"),
            )
            ideas.append(idea)

        return ideas

    def _parse_timestamp(self, timestamp: str) -> int:
        """Convert HH:MM:SS to seconds."""
        parts = timestamp.split(":")
        try:
            if len(parts) == 3:
                h, m, s = map(int, parts)
                return h * 3600 + m * 60 + s
            elif len(parts) == 2:
                m, s = map(int, parts)
                return m * 60 + s
        except ValueError:
            pass
        return 0

    def extract_from_all_episodes(
        self,
        transcripts_dir: Path,
        max_ideas_per_episode: int = 8,
        progress: bool = True,
    ) -> Generator[Idea, None, None]:
        """Extract ideas from all episodes in the transcripts directory."""
        episode_dirs = sorted(
            d for d in transcripts_dir.iterdir()
            if d.is_dir() and (d / "transcript.md").exists()
        )

        iterator = tqdm(episode_dirs, desc="Extracting ideas") if progress else episode_dirs

        for episode_dir in iterator:
            transcript_file = episode_dir / "transcript.md"
            episode = parse_transcript_file(transcript_file)

            if not episode:
                continue

            ideas = self.extract_from_episode(episode, max_ideas=max_ideas_per_episode)
            for idea in ideas:
                yield idea
