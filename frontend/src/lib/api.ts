const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface SearchResult {
  chunk_id: string;
  text: string;
  raw_text: string;
  episode_title: string;
  episode_guest: string;
  youtube_url: string;
  video_id: string;
  speaker: string;
  speaker_role: string;
  start_timestamp: string;
  start_seconds: number;
  youtube_deep_link: string;
  is_sponsor_segment: boolean;
  chunk_type: string;
  topics: string[];
  score: number | null;
  rrf_score: number | null;
  rerank_score: number | null;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  filters_applied: {
    guest: string | null;
    speaker_role: string | null;
    topic: string | null;
    exclude_sponsors: boolean;
  };
  total_results: number;
  query_time_ms: number;
}

export interface SearchFilters {
  guest?: string;
  speaker_role?: "host" | "guest";
  topic?: string;
  exclude_sponsors?: boolean;
}

export async function searchPodcasts(
  query: string,
  filters?: SearchFilters,
  topK: number = 15,
  includeReranking: boolean = true
): Promise<SearchResponse> {
  const response = await fetch(`${API_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      filters: filters || {},
      top_k: topK,
      include_reranking: includeReranking,
    }),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getGuests(): Promise<{ guests: string[]; total: number }> {
  const response = await fetch(`${API_URL}/guests`);

  if (!response.ok) {
    throw new Error(`Failed to fetch guests: ${response.statusText}`);
  }

  return response.json();
}

export async function getTopics(): Promise<{ topics: string[]; total: number }> {
  const response = await fetch(`${API_URL}/topics`);

  if (!response.ok) {
    throw new Error(`Failed to fetch topics: ${response.statusText}`);
  }

  return response.json();
}

// Idea Graph types
export interface IdeaNode {
  id: string;
  summary: string;
  full_context: string;
  guest: string;
  episode_title: string;
  video_id: string;
  timestamp: string;
  youtube_deep_link: string;
  idea_type: "strategic" | "tactical";
  cluster_id: string | null;
  cluster_name: string | null;
  x: number;
  y: number;
}

export interface IdeaEdge {
  source: string;
  target: string;
  connection_type: "similar" | "contradictory";
  strength: number;
  explanation: string | null;
}

export interface ClusterInfo {
  id: string;
  name: string;
  description: string;
  color: string;
  idea_count: number;
  top_idea_ids: string[];  // Most connected/representative ideas
  center_x: number;
  center_y: number;
}

export interface IdeaGraphResponse {
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  clusters: ClusterInfo[];
  total_ideas: number;
  total_connections: number;
}

// Cache for idea graph data
let ideaGraphCache: IdeaGraphResponse | null = null;
let ideaGraphCacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getIdeaGraph(): Promise<IdeaGraphResponse> {
  // Return cached data if still valid
  if (ideaGraphCache && Date.now() - ideaGraphCacheTime < CACHE_DURATION) {
    return ideaGraphCache;
  }

  const response = await fetch(`${API_URL}/ideas/graph`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Graph not generated yet. Please run the extraction script first.");
    }
    throw new Error(`Failed to fetch idea graph: ${response.statusText}`);
  }

  const data = await response.json();

  // Cache the response
  ideaGraphCache = data;
  ideaGraphCacheTime = Date.now();

  return data;
}
