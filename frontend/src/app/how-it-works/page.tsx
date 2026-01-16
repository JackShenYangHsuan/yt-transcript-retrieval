"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  Handle,
  Position,
  NodeProps,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Inject styles to hide ReactFlow's default node styling
function useReactFlowStyles() {
  useEffect(() => {
    const styleId = 'reactflow-custom-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .react-flow__node {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
      }
      .react-flow__handle {
        opacity: 0 !important;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);
}

// ============================================================================
// TYPES
// ============================================================================

type PipelineView = "search" | "ideas";

interface TechDetail {
  label: string;
  value: string;
  description?: string;
}

// ============================================================================
// PIPELINE NODE COMPONENT
// ============================================================================

function PipelineNode({ data }: NodeProps) {
  const nodeData = data as {
    label: string;
    description: string;
    icon: string;
    color: string;
    techDetails?: TechDetail[];
    codeSnippet?: string;
  };

  const [showDetails, setShowDetails] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showDetails && nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 12,
        left: rect.left + rect.width / 2,
      });
    }
  }, [showDetails]);

  return (
    <div
      ref={nodeRef}
      className="relative group"
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="target" position={Position.Top} id="top" className="opacity-0" />

      <div
        className="px-6 pt-4 pb-5 rounded-xl shadow-lg border-2 min-w-[220px] max-w-[280px] transition-all hover:shadow-xl hover:scale-105"
        style={{
          backgroundColor: "white",
          borderColor: nodeData.color,
        }}
      >
        {/* Icon + Label */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{nodeData.icon}</span>
          <h3 className="font-bold text-gray-900 text-sm">{nodeData.label}</h3>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-600 leading-relaxed">
          {nodeData.description}
        </p>

        {/* Expand indicator */}
        {nodeData.techDetails && (
          <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1">
            <span>Hover for details</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Tech Details Popup - rendered via Portal to escape ReactFlow's stacking context */}
      {showDetails && nodeData.techDetails && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed bg-gray-900 text-white rounded-lg shadow-2xl p-4 min-w-[320px] max-w-[400px] pointer-events-none"
          style={{
            top: popupPosition.top,
            left: popupPosition.left,
            transform: 'translateX(-50%)',
            zIndex: 99999,
          }}
        >
          {/* Arrow pointing up */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900"></div>
          <h4 className="font-bold text-sm mb-3 text-gray-100">Technical Details</h4>
          <div className="space-y-2">
            {nodeData.techDetails.map((detail, idx) => (
              <div key={idx} className="text-xs">
                <span className="text-gray-400">{detail.label}:</span>{" "}
                <span className="text-emerald-400 font-mono">{detail.value}</span>
                {detail.description && (
                  <p className="text-gray-500 mt-0.5 text-[10px]">{detail.description}</p>
                )}
              </div>
            ))}
          </div>

          {nodeData.codeSnippet && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-[10px] text-gray-500 mb-1">Key Code:</p>
              <pre className="text-[10px] text-blue-300 font-mono bg-gray-800 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                {nodeData.codeSnippet}
              </pre>
            </div>
          )}
        </div>,
        document.body
      )}

      <Handle type="source" position={Position.Right} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="opacity-0" />
    </div>
  );
}

// Data source node (starting point)
function DataSourceNode({ data }: NodeProps) {
  const nodeData = data as { label: string; icon: string; count: string };

  return (
    <div className="px-5 py-3 rounded-full bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg">
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <div className="flex items-center gap-2">
        <span className="text-xl">{nodeData.icon}</span>
        <div>
          <div className="font-bold text-sm">{nodeData.label}</div>
          <div className="text-[10px] text-gray-400">{nodeData.count}</div>
        </div>
      </div>
    </div>
  );
}

// Output node (ending point)
function OutputNode({ data }: NodeProps) {
  const nodeData = data as { label: string; icon: string; description: string };

  return (
    <div className="px-5 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="flex items-center gap-3">
        <span className="text-2xl">{nodeData.icon}</span>
        <div>
          <div className="font-bold text-sm">{nodeData.label}</div>
          <div className="text-[10px] text-emerald-100">{nodeData.description}</div>
        </div>
      </div>
    </div>
  );
}

// Section label node
function SectionLabel({ data }: NodeProps) {
  const nodeData = data as { label: string; color: string };

  return (
    <div
      className="px-4 py-1.5 rounded-full text-white text-xs font-bold uppercase tracking-wider"
      style={{ backgroundColor: nodeData.color }}
    >
      {nodeData.label}
    </div>
  );
}

const nodeTypes = {
  pipeline: PipelineNode,
  dataSource: DataSourceNode,
  output: OutputNode,
  section: SectionLabel,
};

// ============================================================================
// SEARCH PIPELINE NODES & EDGES
// ============================================================================

const searchNodes: Node[] = [
  // Data Source
  {
    id: "transcripts",
    type: "dataSource",
    position: { x: 0, y: 350 },
    data: { label: "Transcripts", icon: "📝", count: "~300 episodes" },
  },

  // Section: Indexing (offline)
  {
    id: "section-indexing",
    type: "section",
    position: { x: 200, y: 0 },
    data: { label: "Indexing (Offline)", color: "#6366f1" },
  },

  // Parser
  {
    id: "parser",
    type: "pipeline",
    position: { x: 200, y: 60 },
    data: {
      label: "Transcript Parser",
      description: "Parse transcripts into speaker turns, detect & tag sponsor content",
      icon: "📄",
      color: "#6366f1",
      techDetails: [
        { label: "Input", value: "transcript.md files" },
        { label: "Output", value: "ParsedEpisode with SpeakerTurns" },
        { label: "Extracts", value: "speaker, role (host/guest), timestamp, content" },
        { label: "Sponsor Detection", value: "30+ regex patterns" },
        { label: "Patterns", value: ".com/lenny links, $X off, known sponsors" },
        { label: "Tagged", value: "chunk_type='sponsor' for filtering" },
      ],
      codeSnippet: `SPONSOR_PATTERNS = [
  r"\\.com/lenny",   # promo links
  r"\\$\\d+.*off",   # discounts
  r"flatfile\\.com", # known sponsors
]
is_sponsor = any(re.search(p, text))`,
    },
  },

  // Chunker
  {
    id: "chunker",
    type: "pipeline",
    position: { x: 200, y: 310 },
    data: {
      label: "Speaker-Turn Chunker",
      description: "Smart chunking that preserves Q&A pairs and speaker context",
      icon: "✂️",
      color: "#6366f1",
      techDetails: [
        { label: "Tokenizer", value: "tiktoken cl100k_base" },
        { label: "Max Tokens", value: "512 tokens per chunk" },
        { label: "Overlap", value: "50 tokens between chunks" },
        { label: "Strategy", value: "Keep Q&A pairs together when < 400 tokens" },
        { label: "Chunk Types", value: "qa_pair, guest_answer, host_question, sponsor" },
      ],
      codeSnippet: `# Q&A pairs kept together
if host_q + guest_a <= 400 tokens:
    chunk = [host_turn, guest_turn]`,
    },
  },

  // Topic Extraction
  {
    id: "topics",
    type: "pipeline",
    position: { x: 200, y: 560 },
    data: {
      label: "Topic Extraction",
      description: "Regex-based topic tagging for filtering",
      icon: "🏷️",
      color: "#6366f1",
      techDetails: [
        { label: "Method", value: "Regex pattern matching" },
        { label: "Topics", value: "17 predefined patterns" },
        { label: "Examples", value: "growth, onboarding, retention, hiring, pricing, AI" },
      ],
      codeSnippet: `TOPIC_PATTERNS = {
  "growth": r"\\b(growth|scale)\\b",
  "pmf": r"\\b(product.market.fit)\\b",
  ...
}`,
    },
  },

  // Embeddings
  {
    id: "embeddings",
    type: "pipeline",
    position: { x: 550, y: 120 },
    data: {
      label: "OpenAI Embeddings",
      description: "Dense vector embeddings via OpenAI API",
      icon: "🧠",
      color: "#8b5cf6",
      techDetails: [
        { label: "Model", value: "text-embedding-3-small" },
        { label: "Dimension", value: "1536-dim vectors" },
        { label: "API", value: "OpenAI Embeddings API" },
        { label: "Cost", value: "~$0.02 per 1M tokens" },
        { label: "Latency", value: "~100-200ms per query" },
      ],
      codeSnippet: `response = openai.embeddings.create(
  model="text-embedding-3-small",
  input=query
)
embedding = response.data[0].embedding`,
    },
  },

  // Qdrant
  {
    id: "qdrant",
    type: "pipeline",
    position: { x: 550, y: 370 },
    data: {
      label: "Qdrant Vector Store",
      description: "File-based vector database with metadata filtering",
      icon: "🗄️",
      color: "#8b5cf6",
      techDetails: [
        { label: "Mode", value: "Local file-based (no server)" },
        { label: "Collection", value: "podcast_chunks" },
        { label: "Distance", value: "Cosine similarity" },
        { label: "Payload", value: "guest, speaker_role, topics, timestamps" },
        { label: "Filters", value: "Qdrant FieldCondition on metadata" },
      ],
    },
  },

  // BM25 Index
  {
    id: "bm25-index",
    type: "pipeline",
    position: { x: 550, y: 620 },
    data: {
      label: "BM25 Index",
      description: "Sparse keyword index for lexical matching",
      icon: "📚",
      color: "#8b5cf6",
      techDetails: [
        { label: "Library", value: "bm25s (fast BM25)" },
        { label: "Tokenization", value: "Whitespace + lowercasing" },
        { label: "Storage", value: "NumPy arrays + JSON metadata" },
        { label: "Retrieval", value: "Top-k with post-filtering" },
      ],
      codeSnippet: `corpus_tokens = bm25s.tokenize(texts)
retriever = bm25s.BM25()
retriever.index(corpus_tokens)`,
    },
  },

  // Section: Query Time
  {
    id: "section-query",
    type: "section",
    position: { x: 900, y: 0 },
    data: { label: "Query Time", color: "#f97316" },
  },

  // Query
  {
    id: "query",
    type: "dataSource",
    position: { x: 900, y: 50 },
    data: { label: "User Query", icon: "🔍", count: '"how to find PMF"' },
  },

  // Dense Retrieval
  {
    id: "dense-retrieval",
    type: "pipeline",
    position: { x: 900, y: 180 },
    data: {
      label: "Dense Retrieval",
      description: "Semantic search via vector similarity",
      icon: "🎯",
      color: "#f97316",
      techDetails: [
        { label: "Top-K", value: "15 candidates" },
        { label: "Method", value: "Cosine similarity in Qdrant" },
        { label: "Strength", value: "Captures semantic meaning" },
        { label: "Weakness", value: "May miss exact keywords" },
      ],
    },
  },

  // BM25 Retrieval
  {
    id: "bm25-retrieval",
    type: "pipeline",
    position: { x: 900, y: 430 },
    data: {
      label: "Sparse Retrieval",
      description: "Keyword matching via BM25",
      icon: "🔤",
      color: "#f97316",
      techDetails: [
        { label: "Top-K", value: "15 candidates" },
        { label: "Method", value: "BM25 term frequency scoring" },
        { label: "Strength", value: "Exact keyword matches" },
        { label: "Weakness", value: "Misses synonyms/paraphrases" },
      ],
    },
  },

  // RRF Fusion
  {
    id: "rrf",
    type: "pipeline",
    position: { x: 1220, y: 300 },
    data: {
      label: "RRF Fusion",
      description: "Reciprocal Rank Fusion combines both result sets",
      icon: "🔀",
      color: "#ec4899",
      techDetails: [
        { label: "Formula", value: "score(d) = Σ 1/(k + rank)" },
        { label: "k constant", value: "60 (standard)" },
        { label: "Output", value: "20 fused candidates" },
        { label: "Benefit", value: "Best of both retrieval methods" },
      ],
      codeSnippet: `for rank, result in enumerate(results):
    rrf_score = 1 / (60 + rank)
    scores[chunk_id] += rrf_score`,
    },
  },

  // Sponsor Filter
  {
    id: "sponsor-filter",
    type: "pipeline",
    position: { x: 1540, y: 300 },
    data: {
      label: "Sponsor Filter",
      description: "Remove sponsor/ad content from results (enabled by default)",
      icon: "🚫",
      color: "#ef4444",
      techDetails: [
        { label: "Filter", value: "exclude_sponsors=true (default)" },
        { label: "Removes", value: "chunk_type='sponsor' entries" },
        { label: "Detected", value: "765 sponsor chunks in index" },
        { label: "Prevents", value: "Duplicate ad reads across episodes" },
      ],
      codeSnippet: `# Default filter excludes sponsors
if exclude_sponsors:
    results = [r for r in results
               if r.chunk_type != "sponsor"]`,
    },
  },

  // Reranker (Optional - user toggle)
  {
    id: "reranker",
    type: "pipeline",
    position: { x: 1860, y: 300 },
    data: {
      label: "BGE Reranker (Optional)",
      description: "Cross-encoder reranking for precision. User-toggleable in UI.",
      icon: "🏆",
      color: "#22c55e",
      techDetails: [
        { label: "Model", value: "BAAI/bge-reranker-large" },
        { label: "Type", value: "Cross-encoder (query + doc)" },
        { label: "Input", value: "20 candidates from RRF" },
        { label: "Output", value: "Top 15 reranked results" },
        { label: "RAM", value: "~500MB (local model)" },
        { label: "Toggle", value: "User controls via UI switch" },
        { label: "Latency", value: "+2-4s when enabled" },
      ],
      codeSnippet: `# Optional: skip if user toggled off
if include_reranking and reranker:
    pairs = [[query, doc] for doc in candidates]
    scores = reranker.compute_score(pairs)
    return sorted(results, key=score)[:15]
return candidates[:15]  # bypass`,
    },
  },

  // Final Results
  {
    id: "results",
    type: "output",
    position: { x: 2180, y: 300 },
    data: {
      label: "Search Results",
      icon: "✅",
      description: "Top 15 ranked passages with deep links",
    },
  },
];

// Arrow marker for edges
const arrowMarker = (color: string) => ({
  type: "arrowclosed" as const,
  width: 15,
  height: 15,
  color: color,
});

const searchEdges: Edge[] = [
  // Indexing flow
  { id: "e1", source: "transcripts", target: "parser", type: "step", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 }, markerEnd: arrowMarker("#6366f1") },
  { id: "e2", source: "parser", target: "chunker", type: "step", style: { stroke: "#6366f1", strokeWidth: 2 }, markerEnd: arrowMarker("#6366f1") },
  { id: "e3", source: "chunker", target: "topics", type: "step", style: { stroke: "#6366f1", strokeWidth: 2 }, markerEnd: arrowMarker("#6366f1") },
  { id: "e4", source: "chunker", target: "embeddings", type: "step", style: { stroke: "#8b5cf6", strokeWidth: 2 }, markerEnd: arrowMarker("#8b5cf6") },
  { id: "e5", source: "embeddings", target: "qdrant", type: "step", style: { stroke: "#8b5cf6", strokeWidth: 2 }, markerEnd: arrowMarker("#8b5cf6") },
  { id: "e6", source: "topics", target: "bm25-index", type: "step", style: { stroke: "#8b5cf6", strokeWidth: 2 }, markerEnd: arrowMarker("#8b5cf6") },

  // Query flow
  { id: "e7", source: "query", target: "dense-retrieval", type: "step", animated: true, style: { stroke: "#f97316", strokeWidth: 2 }, markerEnd: arrowMarker("#f97316") },
  { id: "e8", source: "query", target: "bm25-retrieval", type: "step", animated: true, style: { stroke: "#f97316", strokeWidth: 2 }, markerEnd: arrowMarker("#f97316") },
  { id: "e9", source: "qdrant", target: "dense-retrieval", type: "step", style: { stroke: "#8b5cf6", strokeWidth: 2, strokeDasharray: "5,5" }, markerEnd: arrowMarker("#8b5cf6") },
  { id: "e10", source: "bm25-index", target: "bm25-retrieval", type: "step", style: { stroke: "#8b5cf6", strokeWidth: 2, strokeDasharray: "5,5" }, markerEnd: arrowMarker("#8b5cf6") },
  { id: "e11", source: "dense-retrieval", target: "rrf", type: "smoothstep", style: { stroke: "#ec4899", strokeWidth: 2 }, markerEnd: arrowMarker("#ec4899") } as Edge,
  { id: "e12", source: "bm25-retrieval", target: "rrf", type: "smoothstep", style: { stroke: "#ec4899", strokeWidth: 2 }, markerEnd: arrowMarker("#ec4899") } as Edge,
  // Sponsor filter (removes ad content)
  { id: "e13", source: "rrf", target: "sponsor-filter", type: "step", style: { stroke: "#ef4444", strokeWidth: 2 }, markerEnd: arrowMarker("#ef4444") },
  // Reranker path (optional - indicated by node label)
  { id: "e13a", source: "sponsor-filter", target: "reranker", type: "step", style: { stroke: "#22c55e", strokeWidth: 2 }, markerEnd: arrowMarker("#22c55e") },
  { id: "e14", source: "reranker", target: "results", type: "step", style: { stroke: "#22c55e", strokeWidth: 2 }, markerEnd: arrowMarker("#22c55e") },
];

// ============================================================================
// IDEA GRAPH PIPELINE NODES & EDGES
// ============================================================================

const ideaNodes: Node[] = [
  // Data Source
  {
    id: "transcripts-ideas",
    type: "dataSource",
    position: { x: 0, y: 250 },
    data: { label: "Transcripts", icon: "📝", count: "~300 episodes" },
  },

  // Section: Extraction
  {
    id: "section-extraction",
    type: "section",
    position: { x: 200, y: 0 },
    data: { label: "Idea Extraction", color: "#6366f1" },
  },

  // Guest Segment Filter
  {
    id: "segment-filter",
    type: "pipeline",
    position: { x: 200, y: 60 },
    data: {
      label: "Guest Segment Filter",
      description: "Extract substantial guest segments (>200 chars, non-sponsor)",
      icon: "🎙️",
      color: "#6366f1",
      techDetails: [
        { label: "Filter", value: "role='guest', len > 200, !sponsor" },
        { label: "Limit", value: "Top 30 segments per episode" },
        { label: "Output", value: "Transcript sample for LLM" },
      ],
    },
  },

  // LLM Extraction
  {
    id: "llm-extraction",
    type: "pipeline",
    position: { x: 200, y: 310 },
    data: {
      label: "GPT-4o Idea Extraction",
      description: "LLM extracts key ideas with context and type classification",
      icon: "🤖",
      color: "#6366f1",
      techDetails: [
        { label: "Model", value: "openai/gpt-4o (via OpenRouter)" },
        { label: "Per Episode", value: "8-10 ideas extracted" },
        { label: "Output", value: "summary, type, timestamp, context_quote" },
        { label: "Types", value: "strategic (frameworks) vs tactical (actionable)" },
      ],
      codeSnippet: `prompt = f"""Extract {max_ideas}
most valuable ideas from
{guest}'s interview...

Return JSON:
[{"summary": "...",
  "idea_type": "strategic|tactical",
  "timestamp": "HH:MM:SS",
  "context_quote": "..."}]"""`,
    },
  },

  // Section: Clustering
  {
    id: "section-clustering",
    type: "section",
    position: { x: 580, y: 0 },
    data: { label: "Clustering & Connections", color: "#8b5cf6" },
  },

  // Idea Embeddings
  {
    id: "idea-embeddings",
    type: "pipeline",
    position: { x: 580, y: 60 },
    data: {
      label: "Idea Embeddings",
      description: "Embed summary + context via OpenAI API",
      icon: "🧠",
      color: "#8b5cf6",
      techDetails: [
        { label: "Model", value: "text-embedding-3-small" },
        { label: "Input", value: "summary + full_context concatenated" },
        { label: "Dimension", value: "1536-dim vectors" },
        { label: "Batch Size", value: "50 ideas per API call" },
      ],
    },
  },

  // K-Means Clustering
  {
    id: "kmeans",
    type: "pipeline",
    position: { x: 580, y: 310 },
    data: {
      label: "K-Means Clustering",
      description: "Group ideas into thematic clusters",
      icon: "🎯",
      color: "#8b5cf6",
      techDetails: [
        { label: "Algorithm", value: "sklearn KMeans" },
        { label: "K", value: "10 clusters" },
        { label: "n_init", value: "10 random starts" },
        { label: "Random State", value: "42 (reproducible)" },
      ],
      codeSnippet: `kmeans = KMeans(n_clusters=10)
labels = kmeans.fit_predict(embeddings)`,
    },
  },

  // Cluster Naming
  {
    id: "cluster-naming",
    type: "pipeline",
    position: { x: 580, y: 560 },
    data: {
      label: "LLM Cluster Naming",
      description: "GPT-4o names each cluster based on sample ideas",
      icon: "🏷️",
      color: "#8b5cf6",
      techDetails: [
        { label: "Input", value: "Top 10 idea summaries per cluster" },
        { label: "Output", value: "2-4 word name + description" },
        { label: "Examples", value: "Growth Tactics, Leadership Philosophy" },
      ],
    },
  },

  // Section: Connections
  {
    id: "section-connections",
    type: "section",
    position: { x: 980, y: 0 },
    data: { label: "Connection Detection", color: "#f97316" },
  },

  // Similar Connections
  {
    id: "similar-connections",
    type: "pipeline",
    position: { x: 980, y: 100 },
    data: {
      label: "Similar Connections",
      description: "Find semantically similar ideas across guests",
      icon: "🔗",
      color: "#f97316",
      techDetails: [
        { label: "Method", value: "Cosine similarity matrix" },
        { label: "Filter", value: "Different guests only" },
        { label: "Max per idea", value: "5 connections" },
        { label: "Strength", value: "cosine_similarity score" },
      ],
      codeSnippet: `similarity_matrix = cosine_similarity(embeddings)
# Connect top-5 per idea (different guests)`,
    },
  },

  // Contradiction Detection
  {
    id: "contradictions",
    type: "pipeline",
    position: { x: 980, y: 350 },
    data: {
      label: "Contradiction Detection",
      description: "LLM identifies opposing viewpoints between guests",
      icon: "⚔️",
      color: "#f97316",
      techDetails: [
        { label: "Candidates", value: "Ideas with 0.4-0.7 similarity" },
        { label: "Method", value: "GPT-4o batch analysis" },
        { label: "Batch Size", value: "20 pairs per API call" },
        { label: "Output", value: "contradiction + explanation" },
      ],
      codeSnippet: `prompt = """Identify pairs with
CONTRADICTORY viewpoints:

0. Idea A: "Move fast"
   Idea B: "Quality over speed"

Return: {"contradictions":
  [{"pair_index": 0,
    "explanation": "..."}]}"""`,
    },
  },

  // Section: Layout
  {
    id: "section-layout",
    type: "section",
    position: { x: 1350, y: 0 },
    data: { label: "Graph Layout", color: "#22c55e" },
  },

  // Layout Algorithm
  {
    id: "layout",
    type: "pipeline",
    position: { x: 1350, y: 100 },
    data: {
      label: "Force-Directed Layout",
      description: "Position ideas in 2D with cluster grouping",
      icon: "📐",
      color: "#22c55e",
      techDetails: [
        { label: "Cluster Layout", value: "Circle with radius 1500" },
        { label: "Idea Layout", value: "Spiral within cluster" },
        { label: "Ring Spacing", value: "120px between rings" },
        { label: "Jitter", value: "±20px for organic feel" },
      ],
    },
  },

  // Top Ideas
  {
    id: "top-ideas",
    type: "pipeline",
    position: { x: 1350, y: 350 },
    data: {
      label: "Top Ideas Selection",
      description: "Rank ideas by connection count for cluster preview",
      icon: "⭐",
      color: "#22c55e",
      techDetails: [
        { label: "Metric", value: "Connection count per idea" },
        { label: "Top N", value: "20 per cluster" },
        { label: "Diversity", value: "Prefer unique guests" },
        { label: "Tiebreaker", value: "Strategic > Tactical" },
      ],
    },
  },

  // Output
  {
    id: "idea-graph",
    type: "output",
    position: { x: 1680, y: 230 },
    data: {
      label: "Idea Constellation",
      icon: "🌌",
      description: "Interactive graph with clusters, connections, YouTube links",
    },
  },
];

const ideaEdges: Edge[] = [
  // Extraction flow
  { id: "i1", source: "transcripts-ideas", target: "segment-filter", type: "step", animated: true, style: { stroke: "#6366f1", strokeWidth: 2 }, markerEnd: arrowMarker("#6366f1") },
  { id: "i2", source: "segment-filter", target: "llm-extraction", type: "step", style: { stroke: "#6366f1", strokeWidth: 2 }, markerEnd: arrowMarker("#6366f1") },
  { id: "i3", source: "llm-extraction", target: "idea-embeddings", type: "step", style: { stroke: "#8b5cf6", strokeWidth: 2 }, markerEnd: arrowMarker("#8b5cf6") },
  { id: "i4", source: "idea-embeddings", target: "kmeans", type: "step", style: { stroke: "#8b5cf6", strokeWidth: 2 }, markerEnd: arrowMarker("#8b5cf6") },
  { id: "i5", source: "kmeans", target: "cluster-naming", type: "step", style: { stroke: "#8b5cf6", strokeWidth: 2 }, markerEnd: arrowMarker("#8b5cf6") },

  // Connection flow
  { id: "i6", source: "idea-embeddings", target: "similar-connections", type: "step", style: { stroke: "#f97316", strokeWidth: 2 }, markerEnd: arrowMarker("#f97316") },
  { id: "i7", source: "idea-embeddings", target: "contradictions", type: "step", style: { stroke: "#f97316", strokeWidth: 2 }, markerEnd: arrowMarker("#f97316") },

  // Layout flow
  { id: "i8", source: "cluster-naming", target: "layout", type: "step", style: { stroke: "#22c55e", strokeWidth: 2 }, markerEnd: arrowMarker("#22c55e") },
  { id: "i9", source: "similar-connections", target: "top-ideas", type: "step", style: { stroke: "#22c55e", strokeWidth: 2 }, markerEnd: arrowMarker("#22c55e") },
  { id: "i10", source: "contradictions", target: "top-ideas", type: "step", style: { stroke: "#22c55e", strokeWidth: 2 }, markerEnd: arrowMarker("#22c55e") },
  { id: "i11", source: "layout", target: "idea-graph", type: "step", style: { stroke: "#22c55e", strokeWidth: 2 }, markerEnd: arrowMarker("#22c55e") },
  { id: "i12", source: "top-ideas", target: "idea-graph", type: "step", style: { stroke: "#22c55e", strokeWidth: 2 }, markerEnd: arrowMarker("#22c55e") },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function HowItWorksInner() {
  const [view, setView] = useState<PipelineView>("search");
  const { fitView } = useReactFlow();
  useReactFlowStyles(); // Inject custom styles to hide default node styling

  const handleViewChange = useCallback(
    (newView: PipelineView) => {
      setView(newView);
      setTimeout(() => fitView({ padding: 0.1, duration: 500 }), 100);
    },
    [fitView]
  );

  const nodes = view === "search" ? searchNodes : ideaNodes;
  const edges = view === "search" ? searchEdges : ideaEdges;

  return (
    <div className="h-screen w-screen relative bg-gray-50">
      {/* Mobile: Message to view on desktop */}
      <div className="md:hidden fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-6">🖥️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">
          Best Viewed on Desktop
        </h2>
        <p className="text-gray-600 mb-6 max-w-sm">
          This interactive pipeline diagram requires a larger screen to explore properly.
          Hover over nodes to see technical details.
        </p>
        <div className="flex gap-3">
          <a
            href="/"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            View Ideas
          </a>
          <a
            href="/search"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Search
          </a>
        </div>
      </div>

      {/* Desktop: Pipeline Toggle - positioned next to shared navigation */}
      <div className="hidden md:block fixed top-4 left-[640px] z-50">
        <div className="bg-white rounded-full shadow-lg px-2 h-12 flex items-center gap-1">
          <button
            onClick={() => handleViewChange("search")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
              view === "search"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Search Pipeline
          </button>
          <button
            onClick={() => handleViewChange("ideas")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
              view === "ideas"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Idea Graph Pipeline
          </button>
        </div>
      </div>

      {/* Desktop: Legend + Stats - side by side */}
      <div className="hidden md:flex absolute top-20 right-4 z-50 gap-3">
        {/* Legend */}
        <div className="bg-white rounded-lg shadow-lg px-4 py-3 h-fit">
          <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Legend</h4>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-800"></div>
              <span>Data Source</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded border-2 border-indigo-500"></div>
              <span>Processing Step</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gradient-to-r from-emerald-500 to-teal-600"></div>
              <span>Output</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-0.5 bg-gray-400"></div>
              <span>Data Flow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-8 h-0.5" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #8b5cf6 0, #8b5cf6 4px, transparent 4px, transparent 8px)' }}></div>
              <span>Index Lookup</span>
            </div>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Hover over nodes for details
          </p>
        </div>

        {/* Stats Panel */}
        <div className="bg-white rounded-lg shadow-lg px-4 py-3 h-fit">
          <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
            {view === "search" ? "Search Stats" : "Graph Stats"}
          </h4>
          {view === "search" ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-gray-500">Episodes:</div>
              <div className="font-mono text-gray-900">~300</div>
              <div className="text-gray-500">Chunks:</div>
              <div className="font-mono text-gray-900">~28k</div>
              <div className="text-gray-500">Embedding:</div>
              <div className="font-mono text-gray-900">OpenAI API</div>
              <div className="text-gray-500">Dimension:</div>
              <div className="font-mono text-gray-900">1536</div>
              <div className="text-gray-500">Reranker:</div>
              <div className="font-mono text-gray-900">Optional</div>
              <div className="text-gray-500">Latency:</div>
              <div className="font-mono text-gray-900">~1s / ~4s</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-gray-500">Ideas:</div>
              <div className="font-mono text-gray-900">~2,400</div>
              <div className="text-gray-500">Clusters:</div>
              <div className="font-mono text-gray-900">10</div>
              <div className="text-gray-500">Connections:</div>
              <div className="font-mono text-gray-900">~5k</div>
              <div className="text-gray-500">LLM Calls:</div>
              <div className="font-mono text-gray-900">~350</div>
            </div>
          )}
        </div>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
      </ReactFlow>
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <ReactFlowProvider>
      <HowItWorksInner />
    </ReactFlowProvider>
  );
}
