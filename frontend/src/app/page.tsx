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
import { getLogoUrlFromTitle, getFirstCompanyFromTitle, extractCompaniesFromTitle, getCompanyLogoUrl, cleanGuestName } from "@/lib/companyLogo";

// View levels - now includes connectedIdeas
type ViewLevel = "clusters" | "topIdeas" | "connectedIdeas" | "allIdeas";

// Company logo component with fallback to initials
function CompanyLogo({ episodeTitle, guest, size = "sm" }: { episodeTitle: string; guest: string; size?: "sm" | "md" | "lg" | "xl" | "2xl" }) {
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">("loading");
  const logoUrl = getLogoUrlFromTitle(episodeTitle);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-10 h-10",
    xl: "w-12 h-12",
    "2xl": "w-16 h-16",
  }[size];

  const textClasses = {
    sm: "text-[10px]",
    md: "text-sm",
    lg: "text-base",
    xl: "text-lg",
    "2xl": "text-2xl",
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
    small: "px-12 py-10 max-w-[850px] min-w-[700px]",
    medium: "px-16 py-14 max-w-[1100px] min-w-[900px]",
    large: "px-20 py-16 max-w-[1300px] min-w-[1100px]",
  }[nodeData.size];

  const textClasses = {
    small: "text-2xl",
    medium: "text-3xl",
    large: "text-5xl",
  }[nodeData.size];

  return (
    <div
      className={`rounded-lg shadow-md border-4 cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${sizeClasses} ${
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
      {/* Handles on all 4 sides for nearest-side edge connections */}
      <Handle type="target" position={Position.Top} id="top" className="opacity-0" />
      <Handle type="target" position={Position.Bottom} id="bottom" className="opacity-0" />
      <Handle type="target" position={Position.Left} id="left" className="opacity-0" />
      <Handle type="target" position={Position.Right} id="right" className="opacity-0" />
      <Handle type="source" position={Position.Top} id="top-source" className="opacity-0" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="opacity-0" />
      <Handle type="source" position={Position.Left} id="left-source" className="opacity-0" />
      <Handle type="source" position={Position.Right} id="right-source" className="opacity-0" />
      <div className={`font-medium text-gray-900 line-clamp-3 ${textClasses}`}>
        {nodeData.summary}
      </div>
      <div className={`flex items-center justify-between gap-6 mt-6 ${nodeData.size === "small" ? "text-xl" : nodeData.size === "medium" ? "text-2xl" : "text-4xl"}`}>
        <span className="text-gray-500 truncate">{cleanGuestName(nodeData.guest)}</span>
        {getFirstCompanyFromTitle(nodeData.episode_title) && (
          <div className="flex items-center gap-4">
            <CompanyLogo
              episodeTitle={nodeData.episode_title}
              guest={cleanGuestName(nodeData.guest)}
              size={nodeData.size === "small" ? "lg" : nodeData.size === "medium" ? "xl" : "2xl"}
            />
            <span className="text-gray-400 truncate max-w-[300px]">
              {getFirstCompanyFromTitle(nodeData.episode_title)}
            </span>
          </div>
        )}
      </div>
      {nodeData.isCenter && (
        <div className={`text-gray-400 mt-3 text-center ${nodeData.size === "large" ? "text-sm" : "text-xs"}`}>
          Click connections to view details
        </div>
      )}
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
        className="w-44 h-44 rounded-full flex flex-col items-center justify-center shadow-xl transition-all group-hover:scale-110 border-4 border-white"
        style={{ backgroundColor: clusterData.color }}
      >
        <div className="text-4xl font-bold text-white">{clusterData.idea_count}</div>
        <div className="text-sm text-white/80">ideas</div>
      </div>
      <div
        className="mt-4 px-6 py-4 rounded-xl shadow-lg max-w-[260px] transition-all group-hover:shadow-xl"
        style={{ backgroundColor: clusterData.color }}
      >
        <div className="text-lg font-bold text-white text-center leading-tight">
          {clusterData.name}
        </div>
        <div className="text-sm text-white/80 text-center mt-2 line-clamp-2">
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

// Cluster region background (colored zone for grouping)
function ClusterRegionNode({ data }: NodeProps) {
  const regionData = data as unknown as {
    color: string;
    width: number;
    height: number;
    label: string;
  };
  return (
    <div
      className="rounded-3xl flex items-start justify-center pt-6 pointer-events-none"
      style={{
        width: regionData.width,
        height: regionData.height,
        backgroundColor: regionData.color + "15",
        border: `3px solid ${regionData.color}40`,
      }}
    >
      <div
        className="px-4 py-2 rounded-full text-white font-semibold text-lg"
        style={{ backgroundColor: regionData.color }}
      >
        {regionData.label}
      </div>
    </div>
  );
}

const nodeTypes = {
  idea: IdeaNodeComponent,
  cluster: ClusterLabelNode,
  clusterSummary: ClusterSummaryNode,
  clusterRegion: ClusterRegionNode,
};

// Map connection strength (0.5-1.0) to stroke width (2-6px)
function getStrokeWidth(strength: number): number {
  // Normalize from ~0.5-1.0 range to 2-6px
  const normalized = Math.max(0, Math.min(1, (strength - 0.5) / 0.5));
  return 2 + normalized * 4; // 2px to 6px
}

// Determine which handles to use based on relative positions of two nodes
function getNearestHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number }
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x - sourcePos.x;
  const dy = targetPos.y - sourcePos.y;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180 degrees

  // Determine which side of source node faces the target
  // and which side of target node faces the source
  let sourceHandle: string;
  let targetHandle: string;

  if (angle >= -45 && angle < 45) {
    // Target is to the right of source
    sourceHandle = "right-source";
    targetHandle = "left";
  } else if (angle >= 45 && angle < 135) {
    // Target is below source
    sourceHandle = "bottom-source";
    targetHandle = "top";
  } else if (angle >= -135 && angle < -45) {
    // Target is above source
    sourceHandle = "top-source";
    targetHandle = "bottom";
  } else {
    // Target is to the left of source
    sourceHandle = "left-source";
    targetHandle = "right";
  }

  return { sourceHandle, targetHandle };
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
          <CompanyLogo episodeTitle={idea.episode_title} guest={cleanGuestName(idea.guest)} size="md" />
          <div>
            <div className="text-sm font-medium text-gray-900">{cleanGuestName(idea.guest)}</div>
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

// Breadcrumb navigation component
function ViewIndicator({
  level,
  clusterName,
  onBackToClusters,
  onBackToTopIdeas,
  onShowAll,
  showAllNodes,
  onToggleAllNodes,
}: {
  level: ViewLevel;
  clusterName: string | null;
  onBackToClusters: () => void;
  onBackToTopIdeas: () => void;
  onShowAll: () => void;
  showAllNodes: boolean;
  onToggleAllNodes: () => void;
}) {
  return (
    <div className="absolute top-4 left-4 z-40 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm px-3 py-2">
      <div className="flex items-center gap-2 text-xs">
        {/* Toggle for Level 1 */}
        {level === "clusters" && (
          <div className="flex items-center bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => showAllNodes && onToggleAllNodes()}
              className={`px-2 py-1 rounded transition-colors ${
                !showAllNodes
                  ? "bg-white text-gray-900 shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Bubbles
            </button>
            <button
              onClick={() => !showAllNodes && onToggleAllNodes()}
              className={`px-2 py-1 rounded transition-colors ${
                showAllNodes
                  ? "bg-white text-gray-900 shadow-sm font-medium"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              All Nodes
            </button>
          </div>
        )}

        {/* Breadcrumbs for deeper levels */}
        {level !== "clusters" && (
          <>
            <button
              onClick={onBackToClusters}
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              Clusters
            </button>

            {clusterName && (
              <>
                <span className="text-gray-300">/</span>
                <button
                  onClick={level !== "topIdeas" ? onBackToTopIdeas : undefined}
                  className={`truncate max-w-[140px] transition-colors ${
                    level === "topIdeas"
                      ? "text-gray-900 font-medium"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title={clusterName}
                >
                  {clusterName}
                </button>
              </>
            )}

            {level === "connectedIdeas" && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-gray-900 font-medium">Connections</span>
              </>
            )}

            {level === "allIdeas" && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-gray-900 font-medium">All</span>
              </>
            )}

          </>
        )}
      </div>
    </div>
  );
}

// Legend
function Legend({ clusters }: { clusters: ClusterInfo[] }) {
  return (
    <div className="absolute bottom-4 right-4 z-40 bg-white rounded-lg shadow-lg p-3 max-w-[280px]">
      <div className="text-xs font-medium text-gray-700 mb-2">Connections</div>
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

      {clusters.length > 0 && (
        <>
          <div className="text-xs font-medium text-gray-700 mt-3 mb-2 pt-2 border-t border-gray-100">
            Clusters
          </div>
          <div className="space-y-1">
            {clusters.map((cluster) => (
              <div key={cluster.id} className="flex items-center gap-2 text-xs text-gray-600">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0 border-2"
                  style={{ borderColor: cluster.color, backgroundColor: cluster.color + "20" }}
                />
                <span className="truncate">{cluster.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
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
                <img
                  src={getCompanyLogoUrl(company)}
                  alt=""
                  className="w-4 h-4 rounded object-contain bg-white"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
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
  const [showAllNodes, setShowAllNodes] = useState(false); // Toggle for bubbles vs all nodes view

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
    const innerRingRadius = 790;
    const outerRingRadius = 1430;
    const innerRingCount = Math.min(6, n - 1);
    const outerRingCount = Math.max(0, n - 1 - innerRingCount);

    sortedIdeas.forEach((idea, i) => {
      let x = 0, y = 0;
      const size: "small" | "medium" | "large" = "large"; // All nodes same size

      if (i === 0) {
        // Most connected idea in center
        x = 0;
        y = 0;
      } else if (i <= innerRingCount) {
        // Inner ring (top 6 by connections)
        const angle = (2 * Math.PI * (i - 1)) / innerRingCount - Math.PI / 2;
        x = innerRingRadius * Math.cos(angle);
        y = innerRingRadius * Math.sin(angle);
      } else {
        // Outer ring (remaining)
        const outerIdx = i - 1 - innerRingCount;
        const angle = (2 * Math.PI * outerIdx) / outerRingCount - Math.PI / 2;
        x = outerRingRadius * Math.cos(angle);
        y = outerRingRadius * Math.sin(angle);
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

    return ideaNodes;
  }, [handleExpandIdea]);

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
    const positions = forceDirectedLayout(n, 605, 275, 60);

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
    const pushDistance = 530;
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
          size: "large",
        } as unknown as Record<string, unknown>,
      });
    });

    return nodes;
  }, []);

  const layoutAllIdeas = useCallback((
    ideas: IdeaNodeData[],
    cluster: ClusterInfo,
    colorMap: Map<string, string>
  ): Node[] => {
    const ideaNodes: Node[] = [];
    // Fewer items per ring to prevent overlap with large nodes
    const ideasPerRing = [1, 4, 6, 8, 10, 12, 14];
    let ideaIndex = 0;
    let ring = 0;
    const baseRadius = 0; // Start from center
    const ringSpacing = 800; // Large spacing between rings

    while (ideaIndex < ideas.length) {
      const itemsInRing = ideasPerRing[Math.min(ring, ideasPerRing.length - 1)];
      const ringRadius = baseRadius + ring * ringSpacing;

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
            onClick: () => handleExpandIdea(idea),
            size: "large",
          } as unknown as Record<string, unknown>,
        });
        ideaIndex++;
      }
      ring++;
    }

    return ideaNodes;
  }, [handleExpandIdea]);

  // Layout top ideas grouped by cluster (for "All Nodes" toggle view)
  const layoutAllNodesGrouped = useCallback((
    ideas: IdeaNodeData[],
    clusters: ClusterInfo[],
    colorMap: Map<string, string>
  ): Node[] => {
    const allNodes: Node[] = [];
    const maxIdeasPerCluster = 8; // Only show top 8 ideas per cluster
    const nodeWidth = 1000;
    const nodeHeight = 400;
    const nodesPerRow = 2; // 2 ideas per row within a cluster
    const clusterGapX = 4800; // Horizontal gap between clusters
    const clusterGapY = 3800; // Vertical gap between cluster rows
    const regionPadding = 80; // Padding around the region

    // Create a map of ideas by ID for quick lookup
    const ideasById = new Map<string, IdeaNodeData>();
    ideas.forEach(idea => ideasById.set(idea.id, idea));

    // Layout clusters in 2 columns
    const cols = 2;
    clusters.forEach((cluster, clusterIdx) => {
      const clusterCol = clusterIdx % cols;
      const clusterRow = Math.floor(clusterIdx / cols);
      const clusterX = clusterCol * clusterGapX;
      const clusterY = clusterRow * clusterGapY;

      // Get top ideas for this cluster (using top_idea_ids)
      const topIdeaIds = cluster.top_idea_ids || [];
      const topIdeas = topIdeaIds
        .map(id => ideasById.get(id))
        .filter((idea): idea is IdeaNodeData => idea !== undefined)
        .slice(0, maxIdeasPerCluster);

      // Calculate region dimensions based on ideas layout
      const rowCount = Math.ceil(topIdeas.length / nodesPerRow);
      const regionWidth = nodesPerRow * (nodeWidth + 100) + regionPadding * 2;
      const regionHeight = 350 + rowCount * (nodeHeight + 100) + regionPadding * 2;

      // Add background region (z-index handled by order - add first so it's behind)
      allNodes.push({
        id: `region-${cluster.id}`,
        type: "clusterRegion",
        position: {
          x: clusterX - regionPadding,
          y: clusterY - regionPadding - 50,
        },
        data: {
          color: cluster.color,
          width: regionWidth,
          height: regionHeight,
          label: cluster.name,
        } as unknown as Record<string, unknown>,
        draggable: false,
        selectable: false,
        zIndex: -1, // Ensure it's behind other nodes
      });

      // Layout top ideas in a 2-column grid below the header
      topIdeas.forEach((idea, ideaIdx) => {
        const col = ideaIdx % nodesPerRow;
        const row = Math.floor(ideaIdx / nodesPerRow);
        const x = clusterX + col * (nodeWidth + 100);
        const y = clusterY + 300 + row * (nodeHeight + 100);

        allNodes.push({
          id: idea.id,
          type: "idea",
          position: { x, y },
          data: {
            ...idea,
            color: colorMap.get(idea.cluster_id || "") || cluster.color,
            onClick: () => handleExpandIdea(idea),
            size: "large",
          } as unknown as Record<string, unknown>,
        });
      });
    });

    return allNodes;
  }, [handleExpandIdea]);

  // Build nodes and edges based on current view
  useEffect(() => {
    if (!graphData) return;

    const colorMap = new Map<string, string>();
    graphData.clusters.forEach((c) => colorMap.set(c.id, c.color));

    let newNodes: Node[] = [];
    let newEdges: Edge[] = [];

    if (viewLevel === "clusters") {
      if (showAllNodes) {
        // All nodes grouped by cluster view
        const ideasToUse = selectedCompanies.length > 0 ? filteredIdeas : graphData.ideas;
        newNodes = layoutAllNodesGrouped(ideasToUse, filteredClusters, colorMap);

        // Add edges between connected ideas in the All Nodes view
        // Get all visible idea IDs (excluding region nodes)
        const visibleIdeaIds = new Set(
          newNodes
            .filter(n => n.type === "idea")
            .map(n => n.id)
        );

        // Build position map for calculating nearest handles
        const positionMap = new Map(newNodes.map((n) => [n.id, n.position]));

        // Create edges for all connections between visible ideas
        newEdges = graphData.connections
          .filter((conn) => visibleIdeaIds.has(conn.source) && visibleIdeaIds.has(conn.target))
          .map((conn, idx) => {
            const sourcePos = positionMap.get(conn.source);
            const targetPos = positionMap.get(conn.target);
            const handles = sourcePos && targetPos
              ? getNearestHandles(sourcePos, targetPos)
              : { sourceHandle: "bottom-source", targetHandle: "top" };

            return {
              id: `edge-${idx}`,
              source: conn.source,
              target: conn.target,
              sourceHandle: handles.sourceHandle,
              targetHandle: handles.targetHandle,
              type: "default",
              animated: conn.connection_type === "contradictory",
              style: {
                stroke: conn.connection_type === "contradictory" ? "#dc2626" : "#1f2937",
                strokeWidth: conn.connection_type === "contradictory" ? 3 : getStrokeWidth(conn.strength),
                strokeDasharray: conn.connection_type === "contradictory" ? "6,6" : undefined,
                opacity: 0.5,
              },
            };
          });
      } else {
        // Use filtered clusters with correct idea counts - no edges between clusters
        newNodes = layoutClusters(filteredClusters);
      }
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

      // Build position map for calculating nearest handles
      const positionMap = new Map(newNodes.map((n) => [n.id, n.position]));

      newEdges = relevantConnections
        .map((conn, idx) => {
          const sourcePos = positionMap.get(conn.source);
          const targetPos = positionMap.get(conn.target);
          const handles = sourcePos && targetPos
            ? getNearestHandles(sourcePos, targetPos)
            : { sourceHandle: "bottom-source", targetHandle: "top" };

          return {
            id: `edge-${idx}`,
            source: conn.source,
            target: conn.target,
            sourceHandle: handles.sourceHandle,
            targetHandle: handles.targetHandle,
            type: "default",
            animated: conn.connection_type === "contradictory",
            style: {
              stroke: conn.connection_type === "contradictory" ? "#dc2626" : "#1f2937",
              strokeWidth: conn.connection_type === "contradictory" ? 3 : getStrokeWidth(conn.strength),
              strokeDasharray: conn.connection_type === "contradictory" ? "6,6" : undefined,
              opacity: 0.6,
            },
          };
        });
    } else if (viewLevel === "connectedIdeas" && focusedIdea && focusedCluster) {
      let connectedIdeas = getConnectedIdeas(focusedIdea.id);

      // Apply company filter
      if (selectedCompanies.length > 0) {
        connectedIdeas = connectedIdeas.filter((i) => filteredIdeaIds.has(i.id));
      }

      newNodes = layoutConnectedIdeas(focusedIdea, connectedIdeas, focusedCluster, colorMap);

      // Build position map for calculating nearest handles
      const positionMap = new Map(newNodes.map((n) => [n.id, n.position]));

      // Edges from center to connected ideas
      newEdges = connectedIdeas.map((idea, idx) => {
        const conn = graphData.connections.find(
          (c) =>
            (c.source === focusedIdea.id && c.target === idea.id) ||
            (c.target === focusedIdea.id && c.source === idea.id)
        );
        const sourcePos = positionMap.get(focusedIdea.id);
        const targetPos = positionMap.get(idea.id);
        const handles = sourcePos && targetPos
          ? getNearestHandles(sourcePos, targetPos)
          : { sourceHandle: "bottom-source", targetHandle: "top" };

        return {
          id: `edge-${idx}`,
          source: focusedIdea.id,
          target: idea.id,
          sourceHandle: handles.sourceHandle,
          targetHandle: handles.targetHandle,
          type: "default",
          animated: conn?.connection_type === "contradictory",
          style: {
            stroke: conn?.connection_type === "contradictory" ? "#dc2626" : "#1f2937",
            strokeWidth: conn?.connection_type === "contradictory" ? 3 : getStrokeWidth(conn?.strength || 0.5),
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

      // Build position map for calculating nearest handles
      const positionMap = new Map(newNodes.map((n) => [n.id, n.position]));

      const visibleIds = new Set(allClusterIdeas.map((i) => i.id));
      newEdges = graphData.connections
        .filter((conn) => visibleIds.has(conn.source) && visibleIds.has(conn.target))
        .map((conn, idx) => {
          const sourcePos = positionMap.get(conn.source);
          const targetPos = positionMap.get(conn.target);
          const handles = sourcePos && targetPos
            ? getNearestHandles(sourcePos, targetPos)
            : { sourceHandle: "bottom-source", targetHandle: "top" };

          return {
            id: `edge-${idx}`,
            source: conn.source,
            target: conn.target,
            sourceHandle: handles.sourceHandle,
            targetHandle: handles.targetHandle,
            type: "default",
            animated: conn.connection_type === "contradictory",
            style: {
              stroke: conn.connection_type === "contradictory" ? "#dc2626" : "#1f2937",
              strokeWidth: conn.connection_type === "contradictory" ? 3 : getStrokeWidth(conn.strength),
              strokeDasharray: conn.connection_type === "contradictory" ? "6,6" : undefined,
              opacity: 0.4,
            },
          };
        });
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [graphData, viewLevel, focusedCluster, focusedIdea, showAllNodes, layoutClusters, layoutTopIdeas, layoutConnectedIdeas, layoutAllIdeas, layoutAllNodesGrouped, getConnectedIdeas, setNodes, setEdges, selectedCompanies, filteredIdeaIds, filteredClusters, filteredIdeas]);

  // Fit view when nodes change - zoom level varies by view
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        if (viewLevel === "topIdeas" || viewLevel === "allIdeas") {
          // Zoom in to focus on core ~10 ideas, user can zoom out to see more
          fitView({ padding: 0.08, duration: 500, maxZoom: 0.25 });
        } else {
          // Other views fit all content
          fitView({ padding: 0.08, duration: 500 });
        }
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
          <span className="text-sm font-semibold text-gray-900">Idea Constellation</span>
          <span className="text-gray-300">|</span>
          <Link href="/search" className="text-sm text-gray-600 hover:text-gray-900">Search</Link>
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
        onBackToClusters={handleBackToClusters}
        onBackToTopIdeas={handleBackToTopIdeas}
        onShowAll={handleShowAllIdeas}
        showAllNodes={showAllNodes}
        onToggleAllNodes={() => setShowAllNodes(!showAllNodes)}
      />

      {/* Legend */}
      <Legend clusters={graphData?.clusters || []} />

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.08 }}
        minZoom={0.02}
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
