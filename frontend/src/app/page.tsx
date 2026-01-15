"use client";

import { useState } from "react";
import { SearchResult, searchPodcasts } from "@/lib/api";

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
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">
            Lenny&apos;s Podcast Search
          </h1>
          <a
            href="/explore"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <circle cx="5" cy="6" r="2" />
              <circle cx="19" cy="6" r="2" />
              <circle cx="5" cy="18" r="2" />
              <circle cx="19" cy="18" r="2" />
              <path d="M7 7l3 3M14 10l3-3M7 17l3-3M14 14l3 3" />
            </svg>
            Explore Ideas
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
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

function ResultCard({ result }: { result: SearchResult }) {
  return (
    <div className="border border-gray-100 rounded-lg p-5 hover:border-gray-200 transition-colors">
      {/* Episode Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {result.episode_guest}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {result.episode_title}
          </p>
        </div>
        <a
          href={result.youtube_deep_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium
                     text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100
                     transition-colors shrink-0"
        >
          <PlayIcon />
          {result.start_timestamp}
        </a>
      </div>

      {/* Content */}
      <p className="text-sm text-gray-700 leading-relaxed">
        {result.raw_text}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-50">
        <span className="text-xs text-gray-400">
          {result.speaker}
        </span>
        {result.topics && result.topics.length > 0 && (
          <div className="flex gap-1">
            {result.topics.slice(0, 3).map((topic) => (
              <span
                key={topic}
                className="px-1.5 py-0.5 text-xs text-gray-500 bg-gray-50 rounded"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>
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
      className="text-red-500"
    >
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
