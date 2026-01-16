"""Parser for Lenny's Podcast transcript files."""

from __future__ import annotations

import re
from pathlib import Path

import yaml

from .models import EpisodeMetadata, ParsedEpisode, SpeakerTurn

# Regex to match speaker turns: "Speaker Name (HH:MM:SS):"
# Speaker name must be on a single line (no newlines) and not start with #
SPEAKER_TURN_PATTERN = re.compile(
    r"^(?P<speaker>[A-Za-z][^(\n]+?)\s*\((?P<timestamp>\d{1,2}:\d{2}:\d{2})\):\s*(?P<content>.+)$",
    re.MULTILINE,
)

# Sponsor detection patterns - comprehensive list for Lenny's Podcast
SPONSOR_PATTERNS = [
    # Standard sponsor intros
    r"this episode is brought to you by",
    r"brought to you by",
    r"this episode is sponsored by",
    r"today's sponsor",
    r"our sponsor",

    # Discount/promo call-to-actions
    r"head over to .+\.(com|io|co|net)",
    r"use code .+ for",
    r"sign up at .+\.(com|io|co|net)",
    r"check out .+ at .+\.(com|io|co|net)",
    r"\.com/lenny",  # Sponsor discount links (flatfile.com/lenny, coda.io/lenny, etc.)
    r"\.io/lenny",
    r"\$\d+,?\d* (off|credit|in credit)",  # "$1,000 off", "$1000 in credit"
    r"free credit",
    r"special (discount|offer|limited.time offer)",
    r"(one|1) month free",
    r"free trial",
    r"\d+% off",

    # Common sponsor company domains
    r"flatfile\.com",
    r"amplitude\.com",
    r"vanta\.com",
    r"eppo\.com",
    r"coda\.io",
    r"miro\.com",
    r"superhuman\.com",
    r"lemon\.io",
    r"notion\.so",
    r"enterpret\.com",
    r"pendo\.io",
    r"statsig\.com",
    r"posthog\.com",
    r"rows\.com",
    r"linear\.app",

    # Lenny's own promotions
    r"lenny's newsletter",
    r"lennysnewsletter\.com",
    r"lennyslist\.com",

    # Common sponsor interview patterns
    r"Hey [A-Z][a-z]+, (head|director|CEO|VP|founder|co-founder)",
    r"How many B2B SaaS companies",
]
SPONSOR_REGEX = re.compile("|".join(SPONSOR_PATTERNS), re.IGNORECASE)

# Known recurring promotional text (Lenny's ad reads that appear verbatim in many episodes)
RECURRING_PROMO_PATTERNS = [
    # Flatfile ad read
    r"I am 0% surprised to hear that",
    r"I've consistently seen that improving onboarding is one of the highest leverage",
    r"Getting people to your aha moment more quickly",
    r"How many B2B SaaS companies would you estimate need to import CSV",
    r"flawless data onboarding acts like a catalyst",

    # Common sponsor guest names (these appear in ad segments)
    r"^Ashley \(",  # Ashley from Flatfile
    r"^John Cutler \(",  # John Cutler from Amplitude sponsor segments
    r"^Christina Cacioppo \(",  # Christina from Vanta
]
RECURRING_PROMO_REGEX = re.compile("|".join(RECURRING_PROMO_PATTERNS), re.IGNORECASE)


def parse_timestamp(timestamp: str) -> int:
    """Convert HH:MM:SS to seconds."""
    parts = timestamp.split(":")
    if len(parts) == 3:
        h, m, s = map(int, parts)
        return h * 3600 + m * 60 + s
    elif len(parts) == 2:
        m, s = map(int, parts)
        return m * 60 + s
    return 0


def detect_sponsor_segment(content: str) -> bool:
    """Check if content is likely a sponsor segment or recurring promo."""
    return bool(SPONSOR_REGEX.search(content) or RECURRING_PROMO_REGEX.search(content))


def parse_transcript_file(file_path: Path) -> ParsedEpisode | None:
    """Parse a single transcript markdown file."""
    try:
        content = file_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return None

    # Split YAML frontmatter from content
    if not content.startswith("---"):
        print(f"No YAML frontmatter in {file_path}")
        return None

    parts = content.split("---", 2)
    if len(parts) < 3:
        print(f"Invalid frontmatter format in {file_path}")
        return None

    yaml_content = parts[1].strip()
    transcript_content = parts[2].strip()

    # Parse YAML metadata
    try:
        metadata_dict = yaml.safe_load(yaml_content)
    except yaml.YAMLError as e:
        print(f"YAML parse error in {file_path}: {e}")
        return None

    # Build episode metadata
    metadata = EpisodeMetadata(
        guest=metadata_dict.get("guest", "Unknown"),
        title=metadata_dict.get("title", "Unknown"),
        youtube_url=metadata_dict.get("youtube_url", ""),
        video_id=metadata_dict.get("video_id", ""),
        description=metadata_dict.get("description", ""),
        duration_seconds=float(metadata_dict.get("duration_seconds", 0)),
        duration_formatted=metadata_dict.get("duration", ""),
        view_count=metadata_dict.get("view_count"),
        keywords=metadata_dict.get("keywords", []),
    )

    # Parse speaker turns
    turns: list[SpeakerTurn] = []
    guest_name = metadata.guest.lower()

    for match in SPEAKER_TURN_PATTERN.finditer(transcript_content):
        speaker = match.group("speaker").strip()
        timestamp = match.group("timestamp")
        content = match.group("content").strip()

        # Determine role (host = Lenny/any variation, guest = everyone else)
        speaker_lower = speaker.lower()
        is_host = "lenny" in speaker_lower or speaker_lower in ["host", "lenny rachitsky"]
        role = "host" if is_host else "guest"

        # Detect sponsor segments
        is_sponsor = detect_sponsor_segment(content)

        turn = SpeakerTurn(
            speaker=speaker,
            role=role,
            timestamp_raw=timestamp,
            timestamp_seconds=parse_timestamp(timestamp),
            content=content,
            is_sponsor=is_sponsor,
        )
        turns.append(turn)

    if not turns:
        print(f"No speaker turns found in {file_path}")
        return None

    return ParsedEpisode(
        metadata=metadata,
        turns=turns,
        file_path=str(file_path),
    )


def parse_all_transcripts(transcripts_dir: Path) -> list[ParsedEpisode]:
    """Parse all transcript files in the directory."""
    episodes = []

    # Each episode is in a folder named after the guest
    for episode_dir in sorted(transcripts_dir.iterdir()):
        if not episode_dir.is_dir():
            continue

        transcript_file = episode_dir / "transcript.md"
        if not transcript_file.exists():
            continue

        episode = parse_transcript_file(transcript_file)
        if episode:
            episodes.append(episode)

    print(f"Parsed {len(episodes)} episodes")
    return episodes
