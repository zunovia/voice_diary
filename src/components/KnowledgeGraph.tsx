"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

type GraphNode = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  created_at: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  similarity: number;
};

type ViewMode = "category" | "timeline" | "tag" | "connections" | "cluster";

const CATEGORY_COLORS: Record<string, string> = {
  ビジネス: "#3b82f6",
  技術: "#22c55e",
  思想: "#a855f7",
  生活: "#f97316",
  学習: "#06b6d4",
  健康: "#ec4899",
  人間関係: "#eab308",
  クリエイティブ: "#f43f5e",
  その他: "#6b7280",
};

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("category");
  const [selectedMemo, setSelectedMemo] = useState<GraphNode | null>(null);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.7);
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [graphData, setGraphData] = useState<{
    nodes: GraphNode[];
    links: GraphLink[];
  }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/memos/similar")
      .then((r) => r.json())
      .then((data) => {
        setGraphData(data);
        const cats = new Set(
          data.nodes.map((n: GraphNode) => n.category)
        ) as Set<string>;
        setCategoryFilters(cats);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredData = useCallback(() => {
    const filteredNodes = graphData.nodes.filter((n) => {
      if (categoryFilters.size > 0 && !categoryFilters.has(n.category))
        return false;
      if (
        searchQuery &&
        !n.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !n.summary.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = graphData.links.filter((l) => {
      const sourceId = typeof l.source === "string" ? l.source : l.source.id;
      const targetId = typeof l.target === "string" ? l.target : l.target.id;
      return (
        nodeIds.has(sourceId) &&
        nodeIds.has(targetId) &&
        l.similarity >= similarityThreshold
      );
    });
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, categoryFilters, searchQuery, similarityThreshold]);

  useEffect(() => {
    if (!svgRef.current || loading) return;
    const { nodes, links } = filteredData();
    if (nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const g = svg.append("g");

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Connection count for sizing
    const connectionCount: Record<string, number> = {};
    links.forEach((l) => {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      connectionCount[s] = (connectionCount[s] || 0) + 1;
      connectionCount[t] = (connectionCount[t] || 0) + 1;
    });

    const getNodeColor = (d: GraphNode) => {
      if (viewMode === "timeline") {
        const now = Date.now();
        const created = new Date(d.created_at).getTime();
        const age = (now - created) / (1000 * 60 * 60 * 24 * 30); // months
        const opacity = Math.max(0.2, 1 - age * 0.1);
        return `rgba(99, 102, 241, ${opacity})`;
      }
      return CATEGORY_COLORS[d.category] || CATEGORY_COLORS["その他"];
    };

    const getNodeSize = (d: GraphNode) => {
      if (viewMode === "connections") {
        return 8 + (connectionCount[d.id] || 0) * 3;
      }
      return 10 + (connectionCount[d.id] || 0) * 1.5;
    };

    // Force simulation
    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[] as GraphNode[])
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => (d as GraphNode).id)
          .distance(100)
          .strength((l) => (l as GraphLink).similarity * 0.5)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(20));

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#374151")
      .attr("stroke-opacity", (d) => d.similarity * 0.8)
      .attr("stroke-width", (d) => d.similarity * 2);

    // Nodes
    const node = g
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", getNodeSize)
      .attr("fill", getNodeColor)
      .attr("stroke", "#1f2937")
      .attr("stroke-width", 1.5)
      .attr("cursor", "pointer")
      .on("click", (_, d) => setSelectedMemo(d));

    // Apply drag behavior
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).call(
      d3
        .drag<SVGCircleElement, GraphNode>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    // Labels
    const label = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.title || "")
      .attr("font-size", "10px")
      .attr("fill", "#9ca3af")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => getNodeSize(d) + 14)
      .attr("pointer-events", "none");

    // Tooltip on hover
    node
      .on("mouseenter", function (_, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", getNodeSize(d) * 1.5);
      })
      .on("mouseleave", function (_, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", getNodeSize(d));
      });

    // Highlight search results
    if (searchQuery) {
      node.attr("opacity", (d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0.2
      );
      label.attr("opacity", (d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ? 1 : 0.2
      );
    }

    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x || 0)
        .attr("y1", (d) => (d.source as GraphNode).y || 0)
        .attr("x2", (d) => (d.target as GraphNode).x || 0)
        .attr("y2", (d) => (d.target as GraphNode).y || 0);

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);

      label.attr("x", (d) => d.x || 0).attr("y", (d) => d.y || 0);
    });

    return () => {
      simulation.stop();
    };
  }, [filteredData, viewMode, searchQuery, loading]);

  const allCategories = [
    ...new Set(graphData.nodes.map((n) => n.category)),
  ];

  const toggleCategory = (cat: string) => {
    setCategoryFilters((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-950">
      {/* Top Controls */}
      <div className="flex items-center gap-2 p-3 bg-gray-900/80 border-b border-gray-800 overflow-x-auto">
        {/* View Mode Tabs */}
        {(
          [
            ["category", "カテゴリ"],
            ["timeline", "時系列"],
            ["connections", "接続数"],
            ["cluster", "クラスター"],
          ] as [ViewMode, string][]
        ).map(([mode, label]) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors ${
              viewMode === mode
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        {/* Search */}
        <input
          type="text"
          placeholder="検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 w-32 focus:w-48 transition-all focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Graph Area */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 text-sm">読み込み中...</div>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <svg
                className="w-16 h-16 text-gray-700"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"
                />
              </svg>
              <p className="text-gray-500">メモがありません</p>
              <a
                href="/record"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                最初のメモを録音する
              </a>
            </div>
          ) : (
            <svg ref={svgRef} className="w-full h-full" />
          )}

          {/* Legend */}
          {viewMode === "category" && (
            <div className="absolute bottom-4 left-4 bg-gray-900/90 rounded-lg p-3 text-xs space-y-1.5">
              {allCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`flex items-center gap-2 w-full text-left transition-opacity ${
                    categoryFilters.has(cat) ? "opacity-100" : "opacity-30"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor:
                        CATEGORY_COLORS[cat] || CATEGORY_COLORS["その他"],
                    }}
                  />
                  <span className="text-gray-300">{cat}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Controls or Detail */}
        {selectedMemo ? (
          <div className="w-72 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-sm font-bold text-white">
                {selectedMemo.title}
              </h3>
              <button
                onClick={() => setSelectedMemo(null)}
                className="text-gray-500 hover:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <span
              className="inline-block px-2 py-0.5 rounded-full text-[10px] mb-3"
              style={{
                backgroundColor: `${CATEGORY_COLORS[selectedMemo.category] || CATEGORY_COLORS["その他"]}20`,
                color: CATEGORY_COLORS[selectedMemo.category] || CATEGORY_COLORS["その他"],
              }}
            >
              {selectedMemo.category}
            </span>
            <p className="text-gray-300 text-xs mb-3">{selectedMemo.summary}</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {selectedMemo.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 bg-indigo-500/10 text-indigo-300 rounded text-[10px]"
                >
                  #{tag}
                </span>
              ))}
            </div>
            <p className="text-gray-500 text-[10px]">
              {new Date(selectedMemo.created_at).toLocaleString("ja-JP")}
            </p>
            <a
              href={`/memo/${selectedMemo.id}`}
              className="block mt-4 text-center bg-indigo-600/20 text-indigo-400 py-2 rounded text-xs hover:bg-indigo-600/30 transition-colors"
            >
              詳細を見る
            </a>
          </div>
        ) : (
          <div className="w-56 bg-gray-900 border-l border-gray-800 p-4 space-y-5 hidden md:block">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">
                類似度しきい値
              </label>
              <input
                type="range"
                min={0.3}
                max={0.95}
                step={0.05}
                value={similarityThreshold}
                onChange={(e) =>
                  setSimilarityThreshold(parseFloat(e.target.value))
                }
                className="w-full mt-1 accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>緩い</span>
                <span>{similarityThreshold}</span>
                <span>厳密</span>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">
                カテゴリフィルター
              </label>
              <div className="space-y-1 mt-2">
                {allCategories.map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={categoryFilters.has(cat)}
                      onChange={() => toggleCategory(cat)}
                      className="accent-indigo-500 w-3 h-3"
                    />
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor:
                          CATEGORY_COLORS[cat] || CATEGORY_COLORS["その他"],
                      }}
                    />
                    <span className="text-gray-300">{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-gray-600 pt-2 border-t border-gray-800">
              <p>ノード: {graphData.nodes.length}</p>
              <p>
                接続:{" "}
                {
                  graphData.links.filter(
                    (l) => l.similarity >= similarityThreshold
                  ).length
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
