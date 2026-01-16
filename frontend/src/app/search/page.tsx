"use client";

import { useState } from "react";
import { SearchResult, searchPodcasts } from "@/lib/api";
import { cleanGuestName, getBestLogoUrl, getBestCompany } from "@/lib/companyLogo";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [useReranker, setUseReranker] = useState(false);

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setSearchTime(null);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setSearchTime(null);

    try {
      const data = await searchPodcasts(query, undefined, 15, useReranker);
      setResults(data.results);
      setSearchTime(data.query_time_ms);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12">
        {/* Mobile note about desktop features */}
        <div className="md:hidden mb-4 px-3 py-2 bg-pink-50 border border-pink-200 rounded-lg text-center">
          <p className="text-xs text-pink-700">
            For <span className="font-medium">Idea Constellation</span> and <span className="font-medium">How It Works</span>, please use desktop for better experience.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about product, growth, leadership..."
              className="w-full px-4 py-3 pr-24 sm:pr-32 text-base border border-gray-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent
                         placeholder:text-gray-400"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-20 sm:right-24 top-1/2 -translate-y-1/2 p-1.5
                           text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
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

        {/* Search Options */}
        <div className="flex items-center justify-start gap-3 mb-4">
          <button
            type="button"
            onClick={() => setUseReranker(!useReranker)}
            className={`w-11 h-6 rounded-full relative transition-colors duration-200 ${
              useReranker ? "bg-green-500" : "bg-gray-300"
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${
                useReranker ? "right-0.5" : "left-0.5"
              }`}
            />
          </button>
          <span className="text-sm text-gray-600">
            {useReranker ? "More accurate (rerank on)" : "Faster (rerank off)"}
          </span>
        </div>

        {/* Search Time */}
        {searchTime !== null && (
          <div className="flex justify-end mb-4">
            <span className="text-xs text-gray-400">
              {searchTime.toFixed(0)}ms
            </span>
          </div>
        )}

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
          <div>
            <p className="text-sm text-gray-500 mb-4">
              {results.length} results found
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result, index) => (
                <ResultCard key={result.chunk_id || index} result={result} />
              ))}
            </div>
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
                "hiring your first PM",
                "pricing strategies",
                "user retention tactics",
                "running effective meetings",
                "giving feedback to your team",
                "when to pivot your startup",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setQuery(example);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 bg-gray-50
                             rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
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
  const logoUrl = getBestLogoUrl(episodeTitle, guest);

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

function ResultCard({ result }: { result: SearchResult }) {
  const guestName = cleanGuestName(result.episode_guest);
  const company = getBestCompany(result.episode_title, guestName);
  const [expanded, setExpanded] = useState(false);
  const transcript = result.raw_text;
  const isLong = transcript.length > 300;

  return (
    <div className="border border-gray-100 rounded-lg p-5 hover:border-gray-200 hover:shadow-sm transition-all flex flex-col h-full">
      {/* Header: Logo + Guest + Company */}
      <div className="flex items-center gap-3 mb-3">
        <CompanyLogo episodeTitle={result.episode_title} guest={guestName} />
        <div className="flex-1 min-w-0">
          <span className="font-medium text-gray-900 block">{guestName}</span>
          {company && (
            <span className="text-sm text-gray-400">{company}</span>
          )}
        </div>
      </div>

      {/* Transcript */}
      <p className={`text-sm text-gray-700 leading-relaxed flex-1 ${!expanded && isLong ? "line-clamp-4" : ""}`}>
        {transcript}
      </p>

      {/* Show more/less toggle */}
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-2 text-left"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      {/* YouTube Button - at bottom */}
      <a
        href={result.youtube_deep_link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 mt-4 text-sm font-medium
                   text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200
                   transition-colors"
      >
        <YouTubeIcon />
        <span className="hidden sm:inline">Play in YouTube</span>
        <span className="sm:hidden">Watch</span>
        <span className="text-gray-400">@ {result.start_timestamp}</span>
      </a>
    </div>
  );
}

function YouTubeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="#FF0000"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
