#!/usr/bin/env python3
"""
Extract company names from podcast transcripts and update YAML frontmatter.
Handles multiple companies per guest.
"""

import re
from pathlib import Path
import yaml

# Known company name mappings (canonical names)
COMPANY_ALIASES = {
    "fb": "Facebook",
    "ig": "Instagram",
    "yt": "YouTube",
    "nyt": "New York Times",
    "the new york times": "New York Times",
    "a16z": "Andreessen Horowitz",
    "yc": "Y Combinator",
}

# Known companies (helps with extraction)
KNOWN_COMPANIES = {
    # Big Tech
    "Google", "Meta", "Facebook", "Instagram", "WhatsApp", "Apple", "Amazon",
    "Microsoft", "Netflix", "Twitter", "X", "YouTube", "LinkedIn", "Nvidia",
    "OpenAI", "Anthropic",
    # Podcast guests' companies
    "Airbnb", "Uber", "Lyft", "Stripe", "Figma", "Notion", "Slack", "Dropbox",
    "Amplitude", "SurveyMonkey", "Miro", "Duolingo", "Grammarly", "Canva",
    "Intercom", "HubSpot", "Atlassian", "Asana", "Linear", "Vercel", "Replit",
    "Calendly", "Airtable", "Coda", "Loom", "Zoom", "Shopify", "Twilio",
    "Datadog", "Snowflake", "Coinbase", "Robinhood", "DoorDash", "Instacart",
    "Pinterest", "Snap", "Snapchat", "Reddit", "Discord", "TikTok", "Spotify",
    "Patreon", "MasterClass", "Faire", "Wise", "Snyk", "Thumbtack", "Opendoor",
    "Ramp", "Brex", "Mercury", "Gusto", "Lattice", "Plaid", "Segment", "Mixpanel",
    "Rubrik", "Toast", "Retool", "Pendo", "LaunchDarkly", "Optimizely",
    "Color", "Headspace", "Quora", "Square", "Salesforce", "Adobe", "Oracle",
    "Wealthfront", "Carta", "Greenhouse", "Lever", "GitHub", "GitLab",
    "New York Times", "Disney", "Gojek", "Nubank", "Swiggy", "Flipkart",
    "Imperfect Foods", "Chess.com", "Deel", "Rippling", "ProfitWell",
    "First Round Capital", "Andreessen Horowitz", "Y Combinator", "Benchmark",
    "Sequoia", "Greylock", "Kleiner Perkins", "Index Ventures", "Accel",
    "SVPG", "Reforge", "Section4", "Maven", "On Deck",
    # Additional from podcast
    "Superhuman", "Webflow", "Framer", "Sketch", "InVision", "Abstract",
    "Typeform", "Roam", "Obsidian", "ProductBoard", "Aha", "Jira",
    "Monday", "ClickUp", "Trello", "Confluence", "Basecamp", "37signals",
    "Supabase", "PlanetScale", "Neon", "Railway", "Render", "Fly.io",
    "Clerk", "Auth0", "Okta", "WorkOS", "Stytch",
    "Jupiter", "Razorpay", "PhonePe", "Paytm", "CRED",
    "Bolt", "Grab", "GoTo", "Sea", "Shopee", "Lazada",
    "Klarna", "Affirm", "Afterpay", "Block", "Cash App",
    "Revolut", "N26", "Chime", "Monzo", "Starling",
    "Notion", "Coda", "Almanac", "Slite", "Slab",
    "Lenny's Podcast", "a][]", # Special cases to exclude
}

# Roles/titles to filter out (not companies)
ROLE_PATTERNS = [
    r"^cpo$", r"^ceo$", r"^cto$", r"^coo$", r"^cfo$", r"^cmo$", r"^cro$",
    r"^vp\b", r"^svp\b", r"^evp\b", r"^head of\b", r"^director\b",
    r"^co-?founder\b", r"^founder\b", r"^author\b", r"^professor\b",
    r"^coach\b", r"^advisor\b", r"^partner\b", r"^investor\b",
    r"^executive\b", r"^former\b", r"^ex-", r"^consultant\b",
]

# Book titles and non-company strings to exclude
EXCLUDE_PATTERNS = {
    # Books
    "touchy feely", "working backwards", "thinking in bets", "obviously awesome",
    "play bigger", "sales pitch", "make time", "storyworthy", "niche down",
    "monetizing innovation", "dynamic reteaming", "founding sales",
    "strong product people", "the beautiful mess", "the pathless path",
    "the pragmatic engineer", "good strategy", "playing", "the challenger",
    "hacking growth", "never search", "strong product", "shape up",
    "radical focus", "escaping", "the manager's path", "the manager",
    "7 powers", "job moves", "the re", "the", "jobs-to-be-done co-creator",
    "forget the funnel", "enjoy the work", "enjoy the", "enjoy",
    "accomplishment", "nervous systems mastery", "ultraspeaking",
    # Roles and generic terms
    "product management", "growth", "product", "growth marketing", "marketing",
    "silicon valley product group", "executive coach", "author", "speaker",
    "ceo and co-founder", "ceo and founder", "ceo", "cpo", "cto", "coo", "cfo",
    "silicon valley", "companies", "look", "one", "more", "the", "three",
    "both", "two", "writer", "designer", "scaling", "working", "fortune",
    "business", "strategy", "business strategy", "design", "experience design",
    "enterprise", "core product", "marketplaces", "principal strategist",
    "serial entrepreneur", "group pm", "retention team", "first gtm hire",
    "first pm @slack", "exec coach", "product lead", "product at",
    "analytics and data science at doordash", "growth at airtable",
    "analytics", "rent", "art", "cis", "southeast asia",
    # Partial matches and noise
    "cmo and vp product strategy", "linkedin cpo", "stanford gsb professor",
    "stanford professor", "evidence", "marketing technology", "business operations",
    "podcast product", "new product", "fan monetization", "core sciences", "core",
    "state affairs", "tiny", "living", "copilot",
    # More noise
    "the framework", "clay christensen", "the lean startup methodology",
    "thinking", "product at snyk", "product at opendoor", "product at github",
    "microsoft deputy cto", "waze co-founder", "seo advisor", "developer relations",
    "eng", "mochary method", "mochary", "simon-kucher", "simon", "character vc",
    "modern sales", "modern", "thrive digital", "daversa partners", "six eastern", "six",
    "surge ai", "surge", "irrational labs", "irrational", "produx labs", "produx",
    "product institute", "mind the product", "jjellyfish", "entrepreneur magazine",
    "entrepreneur", "fast company", "culture amp", "pitchfork", "numfocus",
    "stanford university", "business insider", "google search", "google docs",
    "facebook marketplace", "linkedin talent", "jira product discovery",
    "figma config", "chatgpt", "chatprd", "all the hacks", "the browser",
    "reality labs", "saas", "saastr", "ceos",
}


def normalize_company(name: str) -> str:
    """Normalize company name to canonical form."""
    name = name.strip()
    # Remove quotes
    name = re.sub(r'^["\'\u2018\u2019\u201C\u201D]+|["\'\u2018\u2019\u201C\u201D]+$', '', name)
    # Remove "ex-" prefix
    name = re.sub(r'^ex-', '', name, flags=re.IGNORECASE)
    # Remove Inc, LLC, etc.
    name = re.sub(r'\s*(Inc|LLC|Ltd|Co|Corp)\.?$', '', name, flags=re.IGNORECASE)
    name = name.strip()

    # Check aliases
    lower = name.lower()
    if lower in COMPANY_ALIASES:
        return COMPANY_ALIASES[lower]

    return name


def is_role_or_title(text: str) -> bool:
    """Check if text is a role/title rather than a company."""
    lower = text.lower().strip()
    for pattern in ROLE_PATTERNS:
        if re.match(pattern, lower):
            return True
    return False


def is_excluded(text: str) -> bool:
    """Check if text should be excluded."""
    lower = text.lower().strip()
    return lower in EXCLUDE_PATTERNS or len(lower) <= 2


def extract_from_parentheses(title: str) -> list[str]:
    """Extract companies from parentheses in title: 'Guest Name (Company1, Company2)'"""
    companies = []

    # Match content in parentheses after pipe
    match = re.search(r'\|\s*[^(]+\(([^)]+)\)?', title)
    if not match:
        # Try without pipe
        match = re.search(r'\(([^)]+)\)\s*$', title)

    if match:
        content = match.group(1)
        parts = re.split(r',\s*', content)

        for part in parts:
            part = part.strip()

            # Extract company from "role at/of Company" pattern
            role_match = re.search(r'(?:at|of)\s+(.+?)(?:,|$)', part, re.IGNORECASE)
            if role_match:
                company = normalize_company(role_match.group(1))
                if not is_excluded(company):
                    companies.append(company)
                continue

            # Skip if it's a role/title
            if is_role_or_title(part):
                continue

            # Handle "ex-Company" pattern
            if part.lower().startswith('ex-'):
                company = normalize_company(part[3:])
                if not is_excluded(company):
                    companies.append(company)
                continue

            # Otherwise it might be a company
            company = normalize_company(part)
            if not is_excluded(company) and len(company) > 2:
                companies.append(company)

    return companies


def extract_from_title_patterns(title: str) -> list[str]:
    """Extract companies from common title patterns."""
    companies = []

    # "Behind the product: Company"
    match = re.search(r'Behind the (?:product|scenes)[:\s]+([A-Z][A-Za-z0-9]+)', title, re.IGNORECASE)
    if match:
        companies.append(normalize_company(match.group(1)))

    # "How Company built/grew/scaled..."
    match = re.search(r'How\s+([A-Z][A-Za-z0-9]+)\s+(?:built|builds|created|scaled|grew|rose|transformed|became|is|does)', title, re.IGNORECASE)
    if match and match.group(1).lower() not in {'to', 'i', 'we', 'you', 'they'}:
        companies.append(normalize_company(match.group(1)))

    # "Inside Company:"
    match = re.search(r'Inside\s+([A-Z][A-Za-z0-9]+)[:\s]', title, re.IGNORECASE)
    if match:
        companies.append(normalize_company(match.group(1)))

    # "Company's growth/journey/story"
    match = re.search(r"([A-Z][A-Za-z0-9]+)'s\s+(?:rapid|growth|unique|journey|story|culture|approach)", title, re.IGNORECASE)
    if match:
        companies.append(normalize_company(match.group(1)))

    # "Lessons from scaling Company"
    match = re.search(r'(?:scaling|Lessons from)\s+([A-Z][A-Za-z0-9]+)', title, re.IGNORECASE)
    if match and match.group(1).lower() not in {'your', 'the', 'a'}:
        companies.append(normalize_company(match.group(1)))

    return companies


def extract_from_description(description: str) -> list[str]:
    """Extract companies from episode description."""
    companies = []

    if not description:
        return companies

    # Pattern: "at Company" or "of Company" (for roles)
    matches = re.findall(r'(?:at|of)\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)', description)
    for match in matches:
        company = normalize_company(match)
        if not is_excluded(company) and not is_role_or_title(company):
            companies.append(company)

    # Pattern: "CEO/founder of Company"
    matches = re.findall(r'(?:CEO|CTO|CPO|COO|CFO|founder|co-founder)\s+(?:of|at)\s+([A-Z][A-Za-z0-9]+)', description, re.IGNORECASE)
    for match in matches:
        company = normalize_company(match)
        if not is_excluded(company):
            companies.append(company)

    # Pattern: "led growth at Company"
    matches = re.findall(r'led\s+(?:growth|product|engineering|design)\s+at\s+([A-Z][A-Za-z0-9]+)', description, re.IGNORECASE)
    for match in matches:
        company = normalize_company(match)
        if not is_excluded(company):
            companies.append(company)

    # Check for known company names
    desc_lower = description.lower()
    for company in KNOWN_COMPANIES:
        if company.lower() in desc_lower:
            # Verify it's a word boundary match
            pattern = r'\b' + re.escape(company) + r'\b'
            if re.search(pattern, description, re.IGNORECASE):
                companies.append(company)

    return companies


def extract_companies(title: str, description: str) -> list[str]:
    """Extract all companies from title and description."""
    companies = []
    seen_lower = set()

    def add_company(name: str):
        if not name:
            return
        name = normalize_company(name)
        lower = name.lower()
        if lower not in seen_lower and not is_excluded(name) and len(name) > 2:
            seen_lower.add(lower)
            companies.append(name)

    # Extract from parentheses (highest priority)
    for c in extract_from_parentheses(title):
        add_company(c)

    # Extract from title patterns
    for c in extract_from_title_patterns(title):
        add_company(c)

    # Extract from description
    for c in extract_from_description(description):
        add_company(c)

    return companies


def parse_transcript(filepath: Path) -> tuple[dict, str]:
    """Parse YAML frontmatter and content from transcript file."""
    content = filepath.read_text(encoding='utf-8')

    if not content.startswith('---'):
        return {}, content

    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content

    try:
        frontmatter = yaml.safe_load(parts[1])
    except yaml.YAMLError:
        return {}, content

    body = '---'.join(parts[2:])
    return frontmatter or {}, body


def update_transcript(filepath: Path, frontmatter: dict, body: str):
    """Write updated frontmatter back to transcript file."""
    yaml_str = yaml.dump(frontmatter, default_flow_style=False, allow_unicode=True, sort_keys=False)
    content = f"---\n{yaml_str}---{body}"
    filepath.write_text(content, encoding='utf-8')


def main():
    transcripts_dir = Path(__file__).parent.parent.parent / "data" / "transcripts" / "episodes"

    if not transcripts_dir.exists():
        print(f"Transcripts directory not found: {transcripts_dir}")
        return

    # Process all transcripts
    updated = 0
    total = 0

    for episode_dir in sorted(transcripts_dir.iterdir()):
        if not episode_dir.is_dir():
            continue

        transcript_path = episode_dir / "transcript.md"
        if not transcript_path.exists():
            continue

        total += 1
        frontmatter, body = parse_transcript(transcript_path)

        if not frontmatter:
            print(f"  Skipping {episode_dir.name}: No frontmatter")
            continue

        title = frontmatter.get('title', '')
        description = frontmatter.get('description', '')
        guest = frontmatter.get('guest', '')

        # Extract companies
        companies = extract_companies(title, description)

        if companies:
            frontmatter['companies'] = companies
            update_transcript(transcript_path, frontmatter, body)
            updated += 1
            print(f"✓ {guest}: {', '.join(companies)}")
        else:
            print(f"  {guest}: No companies found")

    print(f"\nUpdated {updated}/{total} transcripts with company data")


if __name__ == "__main__":
    main()
