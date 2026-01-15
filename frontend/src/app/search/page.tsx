"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchResult, searchPodcasts } from "@/lib/api";
import { cleanGuestName, getLogoUrlFromTitle, getFirstCompanyFromTitle } from "@/lib/companyLogo";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const data = await searchPodcasts(query);
      setResults(data.results);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white rounded-full shadow-lg px-6 py-2 flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            Idea Constellation
          </Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold text-gray-900">Search</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 pt-20 pb-12">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-12">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about product, growth, leadership..."
              className="w-full px-4 py-3 text-base border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                         placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5
                         bg-gray-900 text-white text-sm font-medium rounded-md
                         hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed
                         transition-colors"
            >
              {isLoading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Results */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No results found. Try a different query.
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              {results.length} results found
            </p>

            {results.map((result, index) => (
              <ResultCard key={result.chunk_id || index} result={result} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!hasSearched && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              Search 300+ episodes of Lenny&apos;s Podcast
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                "onboarding best practices",
                "how to find product-market fit",
                "building a growth team",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setQuery(example);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50
                             rounded-full hover:bg-gray-100 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Company logo with fallback to initials
function CompanyLogo({ episodeTitle, guest }: { episodeTitle: string; guest: string }) {
  const [imgError, setImgError] = useState(false);
  const logoUrl = getLogoUrlFromTitle(episodeTitle);

  if (!logoUrl || imgError) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500 flex-shrink-0">
        {guest?.charAt(0) || "?"}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt=""
      className="w-8 h-8 rounded object-contain bg-white flex-shrink-0"
      onError={() => setImgError(true)}
    />
  );
}

// Extract key point (first 1-2 sentences) from text
function extractKeyPoint(text: string): { keyPoint: string; rest: string } {
  // Split by sentence-ending punctuation followed by space
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  if (sentences.length <= 2) {
    return { keyPoint: text.trim(), rest: "" };
  }

  // Take first 1-2 sentences as key point (aim for ~100-150 chars)
  let keyPoint = sentences[0].trim();
  let restStart = 1;

  if (keyPoint.length < 80 && sentences.length > 1) {
    keyPoint += " " + sentences[1].trim();
    restStart = 2;
  }

  const rest = sentences.slice(restStart).join(" ").trim();

  return { keyPoint, rest };
}

function ResultCard({ result }: { result: SearchResult }) {
  const company = getFirstCompanyFromTitle(result.episode_title);
  const guestName = cleanGuestName(result.episode_guest);
  const { keyPoint, rest } = extractKeyPoint(result.raw_text);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-100 rounded-lg p-5 hover:border-gray-200 hover:shadow-sm transition-all">
      {/* Header: Logo + Guest + Company + Watch Button */}
      <div className="flex items-center gap-3 mb-4">
        <CompanyLogo episodeTitle={result.episode_title} guest={guestName} />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-gray-900">{guestName}</span>
            {company && (
              <span className="text-sm text-gray-400">{company}</span>
            )}
          </div>
        </div>

        <a
          href={result.youtube_deep_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                     text-white bg-red-500 rounded-md hover:bg-red-600
                     transition-colors shrink-0"
        >
          <PlayIcon />
          {result.start_timestamp}
        </a>
      </div>

      {/* Key Point Summary */}
      <p className="text-sm text-gray-900 leading-relaxed font-medium">
        {keyPoint}
      </p>

      {/* Full Transcript (collapsible) */}
      {rest && (
        <div className="mt-3">
          {expanded ? (
            <p className="text-sm text-gray-500 italic leading-relaxed">
              {rest}
            </p>
          ) : (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Show more...
            </button>
          )}
          {expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2 block"
            >
              Show less
            </button>
          )}
        </div>
      )}

      {/* Speaker indicator (subtle) */}
      {result.speaker && (
        <p className="text-xs text-gray-400 mt-3">
          — {result.speaker}
        </p>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
