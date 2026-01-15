"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import {
  getIdeaGraph,
  IdeaNode as IdeaNodeData,
  ClusterInfo,
  IdeaEdge as IdeaEdgeData,
} from "@/lib/api";
import { getLogoUrlFromTitle, getFirstCompanyFromTitle, extractCompaniesFromTitle } from "@/lib/companyLogo";

// View levels - now includes connectedIdeas
type ViewLevel = "clusters" | "topIdeas" | "connectedIdeas" | "allIdeas";

// Company logo component with fallback to initials
function CompanyLogo({ episodeTitle, guest, size = "sm" }: { episodeTitle: string; guest: string; size?: "sm" | "md" | "lg" }) {
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">("loading");
  const logoUrl = getLogoUrlFromTitle(episodeTitle);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }[size];

  const textClasses = {
    sm: "text-[10px]",
    md: "text-sm",
    lg: "text-base",
  }[size];

  // Fallback component
  const Fallback = () => (
    <div className={`${sizeClasses} rounded-full bg-gray-200 flex items-center justify-center ${textClasses} font-medium text-gray-600 flex-shrink-0`}>
      {guest?.charAt(0) || "?"}
    </div>
  );

  // No logo URL available
  if (!logoUrl) {
    return <Fallback />;
  }

  return (
    <div className={`${sizeClasses} flex-shrink-0 relative`}>
      {/* Show fallback while loading or on error */}
      {imgStatus !== "loaded" && <Fallback />}
      {/* Always render img to attempt loading */}
      <img
        src={logoUrl}
        alt=""
        className={`${sizeClasses} rounded object-contain bg-white absolute inset-0 ${imgStatus === "loaded" ? "opacity-100" : "opacity-0"}`}
        onLoad={() => setImgStatus("loaded")}
        onError={() => setImgStatus("error")}
      />
    </div>
  );
}

// Custom node component for individual ideas
function IdeaNodeComponent({ data }: NodeProps) {
  const nodeData = data as unknown as IdeaNodeData & {
    color: string;
    onClick: () => void;
    size: "small" | "medium" | "large";
    isCenter?: boolean;
  };

  const sizeClasses = {
    small: "px-6 py-5 max-w-[468px] min-w-[390px]",
    medium: "px-8 py-6 max-w-[593px] min-w-[499px]",
    large: "px-9 py-8 max-w-[702px] min-w-[593px]",
  }[nodeData.size];

  const textClasses = {
    small: "text-base",
    medium: "text-lg",
    large: "text-xl",
  }[nodeData.size];

  return (
    <div
      className={`rounded-lg shadow-md border-2 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${sizeClasses} ${
        nodeData.isCenter ? "ring-4 ring-offset-2" : ""
      }`}
      style={{
        backgroundColor: nodeData.isCenter ? nodeData.color + "15" : "white",
        borderColor: nodeData.color,
        // @ts-expect-error Tailwind CSS variable for ring color
        "--tw-ring-color": nodeData.isCenter ? nodeData.color : undefined,
      }}
      onClick={nodeData.onClick}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className={`font-medium text-gray-900 line-clamp-3 ${textClasses}`}>
        {nodeData.summary}
      </div>
      <div className={`flex items-center justify-between gap-2 mt-1 ${nodeData.size === "small" ? "text-[10px]" : "text-xs"}`}>
        <span className="text-gray-500 truncate">{nodeData.guest}</span>
        {getFirstCompanyFromTitle(nodeData.episode_title) && (
          <div className="flex items-center gap-1">
            <CompanyLogo
              episodeTitle={nodeData.episode_title}
              guest={nodeData.guest}
              size="sm"
            />
            <span className="text-gray-400 truncate max-w-[80px]">
              {getFirstCompanyFromTitle(nodeData.episode_title)}
            </span>
          </div>
        )}
      </div>
      {nodeData.isCenter && (
        <div className="text-[10px] text-gray-400 mt-2 text-center">
          Click connections to view details
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

// Cluster summary node (shown at Level 1)
function ClusterSummaryNode({ data }: NodeProps) {
  const clusterData = data as unknown as ClusterInfo & { onExpand: () => void };
  return (
    <div
      className="flex flex-col items-center cursor-pointer group"
      onClick={clusterData.onExpand}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div
        className="w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-xl transition-all group-hover:scale-110 border-4 border-white"
        style={{ backgroundColor: clusterData.color }}
      >
        <div className="text-3xl font-bold text-white">{clusterData.idea_count}</div>
        <div className="text-sm text-white/80">ideas</div>
      </div>
      <div className="mt-4 px-5 py-3 bg-white rounded-xl shadow-lg max-w-[220px]">
        <div className="text-base font-semibold text-gray-900 text-center">
          {clusterData.name}
        </div>
        <div className="text-xs text-gray-500 text-center mt-1 line-clamp-2">
          {clusterData.description}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

// Small cluster label (shown at Level 2+)
function ClusterLabelNode({ data }: NodeProps) {
  const clusterData = data as unknown as ClusterInfo & { onBack?: () => void; label?: string };
  return (
    <div
      className="px-5 py-2.5 rounded-full font-semibold text-white text-base shadow-lg cursor-pointer hover:scale-105 transition-all"
      style={{ backgroundColor: clusterData.color }}
      onClick={clusterData.onBack}
    >
      ← {clusterData.label || clusterData.name}
      {!clusterData.label && (
        <span className="ml-2 opacity-75">({clusterData.idea_count})</span>
      )}
    </div>
  );
}

const nodeTypes = {
  idea: IdeaNodeComponent,
  cluster: ClusterLabelNode,
  clusterSummary: ClusterSummaryNode,
};

// Map connection strength (0.5-1.0) to stroke width (1-4px)
function getStrokeWidth(strength: number): number {
  // Normalize from ~0.5-1.0 range to 1-4px
  const normalized = Math.max(0, Math.min(1, (strength - 0.5) / 0.5));
  return 1 + normalized * 3; // 1px to 4px
}

// Simple force-directed layout algorithm
function forceDirectedLayout(
  count: number,
  nodeWidth: number = 300,
  nodeHeight: number = 120,
  iterations: number = 50
): { x: number; y: number }[] {
  // Initialize positions in a grid-like pattern
  const cols = Math.ceil(Math.sqrt(count));
  const spacing = Math.max(nodeWidth, nodeHeight) * 1.8;

  const positions = Array.from({ length: count }, (_, i) => ({
    x: (i % cols) * spacing - (cols * spacing) / 2,
    y: Math.floor(i / cols) * spacing - (Math.ceil(count / cols) * spacing) / 2,
  }));

  // Run force simulation
  const repulsionStrength = spacing * spacing * 2;
  const centerPull = 0.01;

  for (let iter = 0; iter < iterations; iter++) {
    const forces = positions.map(() => ({ x: 0, y: 0 }));

    // Repulsion between all nodes
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[j].x - positions[i].x;
        const dy = positions[j].y - positions[i].y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 1;

        // Stronger repulsion when nodes are close
        const minDist = spacing * 0.9;
        if (dist < minDist) {
          const force = repulsionStrength / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          forces[i].x -= fx;
          forces[i].y -= fy;
          forces[j].x += fx;
          forces[j].y += fy;
        }
      }

      // Pull toward center
      forces[i].x -= positions[i].x * centerPull;
      forces[i].y -= positions[i].y * centerPull;
    }

    // Apply forces with damping
    const damping = 0.3;
    for (let i = 0; i < count; i++) {
      positions[i].x += forces[i].x * damping;
      positions[i].y += forces[i].y * damping;
    }
  }

  return positions;
}

// Detail panel for selected idea
function IdeaDetailPanel({
  idea,
  onClose,
}: {
  idea: IdeaNodeData | null;
  onClose: () => void;
}) {
  if (!idea) return null;

  return (
    <div className="absolute top-4 right-4 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-start">
        <div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              idea.idea_type === "strategic"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {idea.idea_type}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 ml-2">
            {idea.cluster_name}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{idea.summary}</h3>

        <div className="text-sm text-gray-600 mb-4 italic border-l-2 border-gray-200 pl-3">
          &quot;{idea.full_context}&quot;
        </div>

        <div className="flex items-center gap-2 mb-4">
          <CompanyLogo episodeTitle={idea.episode_title} guest={idea.guest} size="md" />
          <div>
            <div className="text-sm font-medium text-gray-900">{idea.guest}</div>
            <div className="text-xs text-gray-500 truncate max-w-[280px]">
              {idea.episode_title}
            </div>
          </div>
        </div>

        <a
          href={idea.youtube_deep_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
        >
          <PlayIcon />
          Watch at {idea.timestamp}
        </a>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

// View level indicator with navigation
function ViewIndicator({
  level,
  clusterName,
  focusedIdeaSummary,
  connectionCount,
  onBackToClusters,
  onBackToTopIdeas,
  onShowAll,
}: {
  level: ViewLevel;
  clusterName: string | null;
  focusedIdeaSummary: string | null;
  connectionCount: number;
  onBackToClusters: () => void;
  onBackToTopIdeas: () => void;
  onShowAll: () => void;
}) {
  const levelLabels = {
    clusters: "All Clusters",
    topIdeas: "Top Ideas",
    connectedIdeas: "Connected Ideas",
    allIdeas: "All Ideas",
  };

  return (
    <div className="absolute bottom-4 left-4 z-40 bg-white rounded-lg shadow-lg p-4 min-w-[220px] max-w-[280px]">
      <div className="text-xs text-gray-500 mb-2">Current View</div>
      <div className="text-sm font-semibold text-gray-900">
        {levelLabels[level]}
        {clusterName && level !== "clusters" && (
          <span className="font-normal text-gray-600"> • {clusterName}</span>
        )}
      </div>

      {level === "connectedIdeas" && focusedIdeaSummary && (
        <div className="mt-2 text-xs text-gray-600 line-clamp-2 italic">
          "{focusedIdeaSummary}"
          <div className="not-italic text-gray-500 mt-1">
            {connectionCount} connected idea{connectionCount !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {level !== "clusters" && (
          <button
            onClick={onBackToClusters}
            className="text-xs text-blue-600 hover:text-blue-800 text-left"
          >
            ← Back to all clusters
          </button>
        )}
        {level === "connectedIdeas" && (
          <button
            onClick={onBackToTopIdeas}
            className="text-xs text-blue-600 hover:text-blue-800 text-left"
          >
            ← Back to top ideas
          </button>
        )}
        {(level === "topIdeas" || level === "connectedIdeas") && (
          <button
            onClick={onShowAll}
            className="text-xs text-gray-600 hover:text-gray-800 text-left"
          >
            Show all cluster ideas →
          </button>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-[10px] text-gray-400">
          {level === "clusters" && "Click a cluster to explore"}
          {level === "topIdeas" && "Click an idea to see its connections"}
          {level === "connectedIdeas" && "Click an idea to view details"}
          {level === "allIdeas" && "Click an idea to view details"}
        </div>
      </div>
    </div>
  );
}

// Legend
function Legend() {
  return (
    <div className="absolute bottom-4 right-4 z-40 bg-white rounded-lg shadow-lg p-3">
      <div className="text-xs font-medium text-gray-700 mb-2">Legend</div>
      <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
        <div className="w-8 flex items-center">
          <div className="w-4 h-[1px] bg-gray-800"></div>
          <div className="w-4 h-[4px] bg-gray-800"></div>
        </div>
        <span>Similar (thin=weak, thick=strong)</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <div
          className="w-8 h-0.5"
          style={{ background: "repeating-linear-gradient(90deg, #dc2626 0, #dc2626 4px, transparent 4px, transparent 8px)" }}
        ></div>
        <span>Contradicting</span>
      </div>
    </div>
  );
}

// Company filter dropdown
function CompanyFilter({
  companies,
  selected,
  onChange,
  isOpen,
  setIsOpen,
}: {
  companies: string[];
  selected: string[];
  onChange: (companies: string[]) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const toggleCompany = (company: string) => {
    if (selected.includes(company)) {
      onChange(selected.filter((c) => c !== company));
    } else {
      onChange([...selected, company]);
    }
  };

  // Filter companies based on search term
  const filteredCompanies = companies.filter((company) =>
    company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort: selected first, then alphabetically
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    const aSelected = selected.includes(a);
    const bSelected = selected.includes(b);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full transition-colors ${
          selected.length > 0
            ? "bg-blue-100 text-blue-700"
            : "text-gray-600 hover:bg-gray-100"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {selected.length > 0 ? `${selected.length} companies` : "Filter"}
        <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-2 border-b border-gray-100 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">Filter by company</span>
            {selected.length > 0 && (
              <button
                onClick={() => onChange([])}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div className="p-2 max-h-60 overflow-y-auto">
            {sortedCompanies.map((company) => (
              <label
                key={company}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(company)}
                  onChange={() => toggleCompany(company)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 truncate">{company}</span>
              </label>
            ))}
            {sortedCompanies.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                {searchTerm ? "No matching companies" : "No companies found"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Main graph component
function IdeaGraphInner() {
  const [graphData, setGraphData] = useState<{
    ideas: IdeaNodeData[];
    connections: IdeaEdgeData[];
    clusters: ClusterInfo[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<IdeaNodeData | null>(null);

  // View state
  const [viewLevel, setViewLevel] = useState<ViewLevel>("clusters");
  const [focusedCluster, setFocusedCluster] = useState<ClusterInfo | null>(null);
  const [focusedIdea, setFocusedIdea] = useState<IdeaNodeData | null>(null);

  // Company filter state
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const { fitView } = useReactFlow();

  // Fetch graph data
  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getIdeaGraph();
        setGraphData({
          ideas: data.nodes,
          connections: data.edges,
          clusters: data.clusters,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load graph");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  // Extract all unique companies from the data
  const availableCompanies = useMemo(() => {
    if (!graphData) return [];
    const companiesSet = new Set<string>();
    graphData.ideas.forEach((idea) => {
      const companies = extractCompaniesFromTitle(idea.episode_title);
      companies.forEach((c) => companiesSet.add(c));
    });
    return Array.from(companiesSet).sort();
  }, [graphData]);

  // Filter ideas by selected companies
  const filteredIdeas = useMemo(() => {
    if (!graphData) return [];
    if (selectedCompanies.length === 0) return graphData.ideas;
    return graphData.ideas.filter((idea) => {
      const companies = extractCompaniesFromTitle(idea.episode_title);
      return companies.some((c) => selectedCompanies.includes(c));
    });
  }, [graphData, selectedCompanies]);

  // Get filtered idea IDs for quick lookup
  const filteredIdeaIds = useMemo(() => new Set(filteredIdeas.map((i) => i.id)), [filteredIdeas]);

  // Get filtered cluster info with correct idea counts
  const filteredClusters = useMemo(() => {
    if (!graphData) return [];
    if (selectedCompanies.length === 0) return graphData.clusters;

    // Count filtered ideas per cluster
    const clusterCounts = new Map<string, number>();
    filteredIdeas.forEach((idea) => {
      const clusterId = idea.cluster_id || "";
      clusterCounts.set(clusterId, (clusterCounts.get(clusterId) || 0) + 1);
    });

    // Update cluster info with filtered counts
    return graphData.clusters.map((cluster) => ({
      ...cluster,
      idea_count: clusterCounts.get(cluster.id) || 0,
    }));
  }, [graphData, selectedCompanies, filteredIdeas]);

  // Navigation handlers
  const handleExpandCluster = useCallback((cluster: ClusterInfo) => {
    setFocusedCluster(cluster);
    setFocusedIdea(null);
    setViewLevel("topIdeas");
    setSelectedIdea(null);
  }, []);

  const handleBackToClusters = useCallback(() => {
    setFocusedCluster(null);
    setFocusedIdea(null);
    setViewLevel("clusters");
    setSelectedIdea(null);
  }, []);

  const handleBackToTopIdeas = useCallback(() => {
    setFocusedIdea(null);
    setViewLevel("topIdeas");
    setSelectedIdea(null);
  }, []);

  const handleShowAllIdeas = useCallback(() => {
    setFocusedIdea(null);
    setViewLevel("allIdeas");
    setSelectedIdea(null);
  }, []);

  const handleExpandIdea = useCallback((idea: IdeaNodeData) => {
    setFocusedIdea(idea);
    setViewLevel("connectedIdeas");
    setSelectedIdea(null);
  }, []);

  // Get connected ideas for a given idea
  const getConnectedIdeas = useCallback((ideaId: string): IdeaNodeData[] => {
    if (!graphData) return [];

    const connectedIds = new Set<string>();
    graphData.connections.forEach((conn) => {
      if (conn.source === ideaId) connectedIds.add(conn.target);
      if (conn.target === ideaId) connectedIds.add(conn.source);
    });

    return graphData.ideas.filter((i) => connectedIds.has(i.id));
  }, [graphData]);

  // Layout helpers
  const layoutClusters = useCallback((clusters: ClusterInfo[]): Node[] => {
    const cols = Math.ceil(clusters.length / 2);
    const spacing = 400;

    return clusters.map((cluster, i) => {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const offsetX = -((cols - 1) * spacing) / 2;
      const offsetY = -spacing / 2;

      return {
        id: `cluster-${cluster.id}`,
        type: "clusterSummary",
        position: { x: col * spacing + offsetX, y: row * spacing + offsetY },
        data: {
          ...cluster,
          onExpand: () => handleExpandCluster(cluster),
        } as unknown as Record<string, unknown>,
        draggable: false,
      };
    });
  }, [handleExpandCluster]);

  const layoutTopIdeas = useCallback((
    ideas: IdeaNodeData[],
    cluster: ClusterInfo,
    colorMap: Map<string, string>,
    connections: IdeaEdgeData[]
  ): Node[] => {
    const ideaNodes: Node[] = [];
    const n = ideas.length;
    if (n === 0) return [];

    // Count connections per idea
    const connectionCounts = new Map<string, number>();
    ideas.forEach(idea => connectionCounts.set(idea.id, 0));
    connections.forEach(conn => {
      if (connectionCounts.has(conn.source)) {
        connectionCounts.set(conn.source, (connectionCounts.get(conn.source) || 0) + 1);
      }
      if (connectionCounts.has(conn.target)) {
        connectionCounts.set(conn.target, (connectionCounts.get(conn.target) || 0) + 1);
      }
    });

    // Sort ideas by connection count (descending)
    const sortedIdeas = [...ideas].sort((a, b) => {
      return (connectionCounts.get(b.id) || 0) - (connectionCounts.get(a.id) || 0);
    });

    // Tiered layout: 1 center + 6 inner ring + rest outer ring
    // Radii increased to accommodate larger nodes (30% bump)
    const innerRingRadius = 860;
    const outerRingRadius = 1480;
    const innerRingCount = Math.min(6, n - 1);
    const outerRingCount = Math.max(0, n - 1 - innerRingCount);

    sortedIdeas.forEach((idea, i) => {
      let x = 0, y = 0;
      let size: "small" | "medium" | "large" = "medium";

      if (i === 0) {
        // Most connected idea in center (large)
        x = 0;
        y = 0;
        size = "large";
      } else if (i <= innerRingCount) {
        // Inner ring (top 6 by connections)
        const angle = (2 * Math.PI * (i - 1)) / innerRingCount - Math.PI / 2;
        x = innerRingRadius * Math.cos(angle);
        y = innerRingRadius * Math.sin(angle);
        size = "medium";
      } else {
        // Outer ring (remaining)
        const outerIdx = i - 1 - innerRingCount;
        const angle = (2 * Math.PI * outerIdx) / outerRingCount - Math.PI / 2;
        x = outerRingRadius * Math.cos(angle);
        y = outerRingRadius * Math.sin(angle);
        size = "medium";
      }

      ideaNodes.push({
        id: idea.id,
        type: "idea",
        position: { x, y },
        data: {
          ...idea,
          color: colorMap.get(idea.cluster_id || "") || cluster.color,
          onClick: () => handleExpandIdea(idea),
          size,
          isCenter: i === 0,
        } as unknown as Record<string, unknown>,
      });
    });

    const labelNode: Node = {
      id: `cluster-label-${cluster.id}`,
      type: "cluster",
      position: { x: -100, y: -outerRingRadius - 120 },
      data: {
        ...cluster,
        onBack: handleBackToClusters,
      } as unknown as Record<string, unknown>,
      draggable: false,
    };

    return [labelNode, ...ideaNodes];
  }, [handleBackToClusters, handleExpandIdea]);

  const layoutConnectedIdeas = useCallback((
    centerIdea: IdeaNodeData,
    connectedIdeas: IdeaNodeData[],
    cluster: ClusterInfo,
    colorMap: Map<string, string>
  ): Node[] => {
    const nodes: Node[] = [];
    const n = connectedIdeas.length;

    // Center idea (larger, highlighted) - positioned at center
    nodes.push({
      id: centerIdea.id,
      type: "idea",
      position: { x: 0, y: 0 },
      data: {
        ...centerIdea,
        color: colorMap.get(centerIdea.cluster_id || "") || cluster.color,
        onClick: () => setSelectedIdea(centerIdea),
        size: "large",
        isCenter: true,
      } as unknown as Record<string, unknown>,
    });

    // Use force-directed layout for surrounding nodes, then offset from center
    const positions = forceDirectedLayout(n, 320, 140, 60);

    // Find the centroid and bounds
    let sumX = 0, sumY = 0, minY = 0;
    positions.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      if (p.y < minY) minY = p.y;
    });
    const centroidX = sumX / n;
    const centroidY = sumY / n;

    // Offset positions so they're centered around (0,0), then push outward
    const pushDistance = 450; // Push nodes away from center
    connectedIdeas.forEach((idea, i) => {
      // Center the layout
      let x = positions[i].x - centroidX;
      let y = positions[i].y - centroidY;

      // Push outward from center
      const dist = Math.sqrt(x * x + y * y) || 1;
      const scale = (dist + pushDistance) / dist;
      x *= scale;
      y *= scale;

      nodes.push({
        id: idea.id,
        type: "idea",
        position: { x, y },
        data: {
          ...idea,
          color: colorMap.get(idea.cluster_id || "") || "#6366f1",
          onClick: () => setSelectedIdea(idea),
          size: "medium",
        } as unknown as Record<string, unknown>,
      });
    });

    // Find actual bounds after positioning
    let maxY = -Infinity;
    nodes.forEach(node => {
      if (node.position.y < minY) minY = node.position.y;
      if (node.position.y > maxY) maxY = node.position.y;
    });

    // Back button label
    const labelNode: Node = {
      id: `back-label`,
      type: "cluster",
      position: { x: -120, y: minY - 150 },
      data: {
        ...cluster,
        label: "Back to top ideas",
        onBack: handleBackToTopIdeas,
      } as unknown as Record<string, unknown>,
      draggable: false,
    };

    return [labelNode, ...nodes];
  }, [handleBackToTopIdeas]);

  const layoutAllIdeas = useCallback((
    ideas: IdeaNodeData[],
    cluster: ClusterInfo,
    colorMap: Map<string, string>
  ): Node[] => {
    const ideaNodes: Node[] = [];
    const ideasPerRing = [8, 16, 24, 32, 40];
    let ideaIndex = 0;
    let ring = 0;
    const baseRadius = 200;

    while (ideaIndex < ideas.length) {
      const itemsInRing = ideasPerRing[Math.min(ring, ideasPerRing.length - 1)];
      const ringRadius = baseRadius + ring * 150;

      for (let j = 0; j < itemsInRing && ideaIndex < ideas.length; j++) {
        const angle = (2 * Math.PI * j) / itemsInRing - Math.PI / 2;
        const idea = ideas[ideaIndex];

        ideaNodes.push({
          id: idea.id,
          type: "idea",
          position: { x: ringRadius * Math.cos(angle), y: ringRadius * Math.sin(angle) },
          data: {
            ...idea,
            color: colorMap.get(idea.cluster_id || "") || cluster.color,
            onClick: () => setSelectedIdea(idea),
            size: "small",
          } as unknown as Record<string, unknown>,
        });
        ideaIndex++;
      }
      ring++;
    }

    const maxRadius = baseRadius + (ring - 1) * 150;
    const labelNode: Node = {
      id: `cluster-label-${cluster.id}`,
      type: "cluster",
      position: { x: -100, y: -maxRadius - 80 },
      data: {
        ...cluster,
        onBack: handleBackToClusters,
      } as unknown as Record<string, unknown>,
      draggable: false,
    };

    return [labelNode, ...ideaNodes];
  }, [handleBackToClusters]);

  // Build nodes and edges based on current view
  useEffect(() => {
    if (!graphData) return;

    const colorMap = new Map<string, string>();
    graphData.clusters.forEach((c) => colorMap.set(c.id, c.color));

    let newNodes: Node[] = [];
    let newEdges: Edge[] = [];

    if (viewLevel === "clusters") {
      // Use filtered clusters with correct idea counts
      newNodes = layoutClusters(filteredClusters);

      // Cross-cluster edges (only between filtered ideas)
      const clusterConnections = new Map<string, { similar: number }>();
      graphData.connections.forEach((conn) => {
        // Only consider connections where both ideas are in filtered set
        if (selectedCompanies.length > 0) {
          if (!filteredIdeaIds.has(conn.source) || !filteredIdeaIds.has(conn.target)) {
            return;
          }
        }
        const sourceIdea = graphData.ideas.find((i) => i.id === conn.source);
        const targetIdea = graphData.ideas.find((i) => i.id === conn.target);
        if (sourceIdea && targetIdea && sourceIdea.cluster_id !== targetIdea.cluster_id) {
          const key = [sourceIdea.cluster_id, targetIdea.cluster_id].sort().join("-");
          const existing = clusterConnections.get(key) || { similar: 0 };
          if (conn.connection_type === "similar") existing.similar++;
          clusterConnections.set(key, existing);
        }
      });

      clusterConnections.forEach((counts, key) => {
        const [c1, c2] = key.split("-");
        if (counts.similar > 5) {
          newEdges.push({
            id: `cluster-edge-${key}`,
            source: `cluster-${c1}`,
            target: `cluster-${c2}`,
            type: "default",
            style: { stroke: "#1f2937", strokeWidth: Math.min(4, 1 + counts.similar / 10), opacity: 0.3 },
          });
        }
      });
    } else if (viewLevel === "topIdeas" && focusedCluster) {
      // Get ideas for this cluster
      const clusterIdeas = selectedCompanies.length > 0
        ? filteredIdeas.filter((i) => i.cluster_id === focusedCluster.id)
        : graphData.ideas.filter((i) => i.cluster_id === focusedCluster.id);

      // Try to show top ideas first, then fall back to any cluster ideas
      const topIdeaIds = new Set(focusedCluster.top_idea_ids);
      const topIdeas = clusterIdeas.filter((i) => topIdeaIds.has(i.id));

      const ideasToShow = topIdeas.length > 0
        ? topIdeas
        : clusterIdeas.slice(0, 8);

      // Filter connections to only those between visible ideas
      const visibleIds = new Set(ideasToShow.map((i) => i.id));
      const relevantConnections = graphData.connections.filter(
        (conn) => visibleIds.has(conn.source) && visibleIds.has(conn.target)
      );
      newNodes = layoutTopIdeas(ideasToShow, focusedCluster, colorMap, relevantConnections);

      newEdges = relevantConnections
        .map((conn, idx) => ({
          id: `edge-${idx}`,
          source: conn.source,
          target: conn.target,
          type: "default",
          animated: conn.connection_type === "contradictory",
          style: {
            stroke: conn.connection_type === "contradictory" ? "#dc2626" : "#1f2937",
            strokeWidth: conn.connection_type === "contradictory" ? 2 : getStrokeWidth(conn.strength),
            strokeDasharray: conn.connection_type === "contradictory" ? "6,6" : undefined,
            opacity: 0.6,
          },
        }));
    } else if (viewLevel === "connectedIdeas" && focusedIdea && focusedCluster) {
      let connectedIdeas = getConnectedIdeas(focusedIdea.id);

      // Apply company filter
      if (selectedCompanies.length > 0) {
        connectedIdeas = connectedIdeas.filter((i) => filteredIdeaIds.has(i.id));
      }

      newNodes = layoutConnectedIdeas(focusedIdea, connectedIdeas, focusedCluster, colorMap);

      // Edges from center to connected ideas
      newEdges = connectedIdeas.map((idea, idx) => {
        const conn = graphData.connections.find(
          (c) =>
            (c.source === focusedIdea.id && c.target === idea.id) ||
            (c.target === focusedIdea.id && c.source === idea.id)
        );
        return {
          id: `edge-${idx}`,
          source: focusedIdea.id,
          target: idea.id,
          type: "default",
          animated: conn?.connection_type === "contradictory",
          style: {
            stroke: conn?.connection_type === "contradictory" ? "#dc2626" : "#1f2937",
            strokeWidth: conn?.connection_type === "contradictory" ? 2 : getStrokeWidth(conn?.strength || 0.5),
            strokeDasharray: conn?.connection_type === "contradictory" ? "6,6" : undefined,
            opacity: 0.7,
          },
        };
      });
    } else if (viewLevel === "allIdeas" && focusedCluster) {
      let allClusterIdeas = graphData.ideas.filter((i) => i.cluster_id === focusedCluster.id);

      // Apply company filter
      if (selectedCompanies.length > 0) {
        allClusterIdeas = allClusterIdeas.filter((i) => filteredIdeaIds.has(i.id));
      }

      newNodes = layoutAllIdeas(allClusterIdeas, focusedCluster, colorMap);

      const visibleIds = new Set(allClusterIdeas.map((i) => i.id));
      newEdges = graphData.connections
        .filter((conn) => visibleIds.has(conn.source) && visibleIds.has(conn.target))
        .map((conn, idx) => ({
          id: `edge-${idx}`,
          source: conn.source,
          target: conn.target,
          type: "default",
          animated: conn.connection_type === "contradictory",
          style: {
            stroke: conn.connection_type === "contradictory" ? "#dc2626" : "#1f2937",
            strokeWidth: conn.connection_type === "contradictory" ? 2 : getStrokeWidth(conn.strength),
            strokeDasharray: conn.connection_type === "contradictory" ? "6,6" : undefined,
            opacity: 0.4,
          },
        }));
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [graphData, viewLevel, focusedCluster, focusedIdea, layoutClusters, layoutTopIdeas, layoutConnectedIdeas, layoutAllIdeas, getConnectedIdeas, setNodes, setEdges, selectedCompanies, filteredIdeaIds, filteredClusters, filteredIdeas]);

  // Fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.15, duration: 500 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes, fitView, viewLevel]);

  // Get connection count for focused idea
  const connectionCount = focusedIdea ? getConnectedIdeas(focusedIdea.id).length : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading idea constellation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🌌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Graph Not Available</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative">
      {/* Navigation */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <div className="bg-white rounded-full shadow-lg px-6 py-2 flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Search</Link>
          <span className="text-gray-300">|</span>
          <span className="text-sm font-semibold text-gray-900">Idea Constellation</span>
          {graphData && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-xs text-gray-500">
                {selectedCompanies.length > 0 ? filteredIdeas.length : graphData.ideas.length} ideas • {graphData.clusters.length} clusters
              </span>
              <span className="text-gray-300">|</span>
              <CompanyFilter
                companies={availableCompanies}
                selected={selectedCompanies}
                onChange={setSelectedCompanies}
                isOpen={isFilterOpen}
                setIsOpen={setIsFilterOpen}
              />
            </>
          )}
        </div>
      </div>

      {/* Selected Idea Panel */}
      <IdeaDetailPanel idea={selectedIdea} onClose={() => setSelectedIdea(null)} />

      {/* View Indicator */}
      <ViewIndicator
        level={viewLevel}
        clusterName={focusedCluster?.name || null}
        focusedIdeaSummary={focusedIdea?.summary || null}
        connectionCount={connectionCount}
        onBackToClusters={handleBackToClusters}
        onBackToTopIdeas={handleBackToTopIdeas}
        onShowAll={handleShowAllIdeas}
      />

      {/* Legend */}
      <Legend />

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === "cluster" || node.type === "clusterSummary") return "#374151";
            const data = node.data as { color?: string };
            return data?.color || "#6366f1";
          }}
          maskColor="rgba(0,0,0,0.1)"
        />
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}

// Wrapper with ReactFlowProvider
export default function ExplorePage() {
  return (
    <ReactFlowProvider>
      <IdeaGraphInner />
    </ReactFlowProvider>
  );
}
