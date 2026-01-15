// Company name to domain mapping for logo fetching
const COMPANY_DOMAINS: Record<string, string> = {
  // Big Tech
  "google": "google.com",
  "meta": "meta.com",
  "facebook": "facebook.com",
  "fb": "facebook.com",
  "instagram": "instagram.com",
  "ig": "instagram.com",
  "whatsapp": "whatsapp.com",
  "apple": "apple.com",
  "amazon": "amazon.com",
  "microsoft": "microsoft.com",
  "netflix": "netflix.com",
  "twitter": "twitter.com",
  "x": "x.com",
  "youtube": "youtube.com",
  "yt": "youtube.com",
  "linkedin": "linkedin.com",
  "nvidia": "nvidia.com",

  // Podcast guests' companies
  "patreon": "patreon.com",
  "lyft": "lyft.com",
  "uber": "uber.com",
  "airbnb": "airbnb.com",
  "stripe": "stripe.com",
  "figma": "figma.com",
  "miro": "miro.com",
  "notion": "notion.so",
  "slack": "slack.com",
  "dropbox": "dropbox.com",
  "amplitude": "amplitude.com",
  "surveymonkey": "surveymonkey.com",
  "duolingo": "duolingo.com",
  "grammarly": "grammarly.com",
  "chess.com": "chess.com",
  "masterclass": "masterclass.com",
  "faire": "faire.com",
  "wise": "wise.com",
  "snyk": "snyk.io",
  "thumbtack": "thumbtack.com",
  "opendoor": "opendoor.com",
  "calendly": "calendly.com",
  "replit": "replit.com",
  "ramp": "ramp.com",
  "runway": "runway.com",
  "launchdarkly": "launchdarkly.com",
  "color": "color.com",
  "optimizely": "optimizely.com",
  "nubank": "nubank.com.br",
  "swiggy": "swiggy.com",
  "flipkart": "flipkart.com",
  "square": "squareup.com",
  "first round capital": "firstround.com",
  "first round": "firstround.com",
  "a16z": "a16z.com",
  "andreessen horowitz": "a16z.com",
  "reforge": "reforge.com",
  "quora": "quora.com",
  "deel": "deel.com",
  "rippling": "rippling.com",
  "profitwell": "profitwell.com",
  "pinterest": "pinterest.com",
  "disney": "disney.com",
  "new york times": "nytimes.com",
  "the new york times": "nytimes.com",
  "nyt": "nytimes.com",
  "gojek": "gojek.com",
  "anthropic": "anthropic.com",
  "imperfect foods": "imperfectfoods.com",
  "headspace": "headspace.com",
  "vrchat": "vrchat.com",
  "gmail": "gmail.com",
  "stanford": "stanford.edu",
};

/**
 * Extract company names from episode title
 * Pattern: "Title | Guest Name (Company1, Company2, ...)"
 */
export function extractCompaniesFromTitle(episodeTitle: string): string[] {
  // Match text in parentheses after a pipe
  const match = episodeTitle.match(/\|\s*[^(]+\(([^)]+)\)/);
  if (!match) return [];

  const companiesStr = match[1];

  // Split by comma and clean up
  return companiesStr
    .split(",")
    .map(c => c.trim())
    .filter(c => {
      // Filter out roles/titles
      const lowerC = c.toLowerCase();
      const isRole = ["cpo", "ceo", "cto", "vp", "head of", "co-founder", "founder",
                      "author", "professor", "coach", "speaker", "advisor", "creator",
                      "pro poker", "former"].some(role => lowerC.includes(role));
      return !isRole && c.length > 0;
    });
}

/**
 * Get domain for a company name
 */
export function getCompanyDomain(companyName: string): string | null {
  const normalized = companyName.toLowerCase().trim();

  // Direct match
  if (COMPANY_DOMAINS[normalized]) {
    return COMPANY_DOMAINS[normalized];
  }

  // Try removing common suffixes
  const withoutSuffix = normalized.replace(/\s*(inc|llc|ltd|co|corp)\.?$/i, "").trim();
  if (COMPANY_DOMAINS[withoutSuffix]) {
    return COMPANY_DOMAINS[withoutSuffix];
  }

  // Fallback: assume company name is the domain (works for many tech companies)
  const guessedDomain = normalized.replace(/\s+/g, "") + ".com";
  return guessedDomain;
}

/**
 * Get logo URL for a company using Google's favicon service
 * (Clearbit logo API was deprecated)
 */
export function getCompanyLogoUrl(companyName: string): string {
  const domain = getCompanyDomain(companyName);
  if (!domain) return "";
  // Google favicon service - reliable and free, supports sizes up to 256
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

/**
 * Get the first company from an episode title
 */
export function getFirstCompanyFromTitle(episodeTitle: string): string | null {
  const companies = extractCompaniesFromTitle(episodeTitle);
  return companies.length > 0 ? companies[0] : null;
}

/**
 * Get logo URL from episode title
 */
export function getLogoUrlFromTitle(episodeTitle: string): string | null {
  const company = getFirstCompanyFromTitle(episodeTitle);
  if (!company) return null;
  return getCompanyLogoUrl(company);
}
