"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// --- Types ---
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
  connectionCount?: number;
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  similarity: number;
};

type InsightLink = {
  id: string;
  source: string;
  target: string;
  insight: string;
  domain: string;
  created_at: string;
};

type ColorGroup = {
  query: string;
  color: string;
};

const DOMAIN_COLORS: Record<string, string> = {
  ビジネス: "#3b82f6",
  技術: "#22c55e",
  思想: "#a855f7",
  アクション: "#f97316",
};

// --- Constants ---
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

const DEFAULT_FORCES = {
  centerStrength: 0.48,
  repelStrength: 16.41,
  linkStrength: 0.44,
  linkDistance: 198,
};

const DEFAULT_DISPLAY = {
  showArrows: false,
  showTags: true,
  showOrphans: true,
  textFadeThreshold: 1.0,
  nodeSize: 4,
  linkThickness: 1,
};

export default function KnowledgeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // Data
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[]; insightLinks: InsightLink[] }>({ nodes: [], links: [], insightLinks: [] });
  const [loading, setLoading] = useState(true);

  // Insight display
  const [showInsights, setShowInsights] = useState(true);
  const [insightAnimating, setInsightAnimating] = useState(false);
  const [hoveredInsight, setHoveredInsight] = useState<InsightLink | null>(null);

  // Selected node detail
  const [selectedMemo, setSelectedMemo] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Settings panel
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [showTags, setShowTags] = useState(DEFAULT_DISPLAY.showTags);
  const [showOrphans, setShowOrphans] = useState(DEFAULT_DISPLAY.showOrphans);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Display
  const [showArrows, setShowArrows] = useState(DEFAULT_DISPLAY.showArrows);
  const [textFadeThreshold, setTextFadeThreshold] = useState(DEFAULT_DISPLAY.textFadeThreshold);
  const [nodeSize, setNodeSize] = useState(DEFAULT_DISPLAY.nodeSize);
  const [linkThickness, setLinkThickness] = useState(DEFAULT_DISPLAY.linkThickness);

  // Forces (Obsidian-style physics)
  const [centerStrength, setCenterStrength] = useState(DEFAULT_FORCES.centerStrength);
  const [repelStrength, setRepelStrength] = useState(DEFAULT_FORCES.repelStrength);
  const [linkStrength, setLinkStrength] = useState(DEFAULT_FORCES.linkStrength);
  const [linkDistance, setLinkDistance] = useState(DEFAULT_FORCES.linkDistance);

  // Color groups
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>([
    { query: "ビジネス", color: "#3b82f6" },
    { query: "技術", color: "#22c55e" },
    { query: "思想", color: "#a855f7" },
    { query: "生活", color: "#f97316" },
  ]);

  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  // --- Data fetching ---
  const prevInsightCountRef = useRef(0);
  useEffect(() => {
    fetch("/api/memos/similar")
      .then((r) => r.json())
      .then((data) => {
        const newInsightCount = data.insightLinks?.length || 0;
        // Trigger discovery animation if new insights appeared
        if (prevInsightCountRef.current > 0 && newInsightCount > prevInsightCountRef.current) {
          setInsightAnimating(true);
          setTimeout(() => setInsightAnimating(false), 3000);
        }
        prevInsightCountRef.current = newInsightCount;
        setGraphData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // --- Filtering ---
  const filteredData = useCallback(() => {
    // Count connections per node
    const connCount: Record<string, number> = {};
    graphData.links.forEach((l) => {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      connCount[s] = (connCount[s] || 0) + 1;
      connCount[t] = (connCount[t] || 0) + 1;
    });

    let nodes = graphData.nodes.map((n) => ({
      ...n,
      connectionCount: connCount[n.id] || 0,
    }));

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (q.startsWith("tag:")) {
        const tag = q.slice(4).replace("#", "").trim();
        nodes = nodes.filter((n) => n.tags.some((t) => t.toLowerCase().includes(tag)));
      } else if (q.startsWith("category:")) {
        const cat = q.slice(9).trim();
        nodes = nodes.filter((n) => n.category.toLowerCase().includes(cat));
      } else {
        nodes = nodes.filter(
          (n) =>
            n.title.toLowerCase().includes(q) ||
            n.summary.toLowerCase().includes(q) ||
            n.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
    }

    // Category/group filter
    if (selectedGroups.length > 0) {
      nodes = nodes.filter((n) =>
        selectedGroups.some(
          (g) =>
            n.category === g ||
            n.tags.some((t) => t === g) ||
            n.title.includes(g)
        )
      );
    }

    // Orphans filter
    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = graphData.links.filter((l) => {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      return nodeIds.has(s) && nodeIds.has(t);
    });

    if (!showOrphans) {
      const linkedIds = new Set<string>();
      links.forEach((l) => {
        linkedIds.add(typeof l.source === "string" ? l.source : l.source.id);
        linkedIds.add(typeof l.target === "string" ? l.target : l.target.id);
      });
      nodes = nodes.filter((n) => linkedIds.has(n.id));
    }

    return { nodes, links };
  }, [graphData, searchQuery, showOrphans, selectedGroups]);

  // --- Get node color based on color groups ---
  const getNodeColor = useCallback(
    (node: GraphNode) => {
      for (const group of colorGroups) {
        if (
          node.category === group.query ||
          node.tags.some((t) => t === group.query) ||
          node.title.includes(group.query)
        ) {
          return group.color;
        }
      }
      return CATEGORY_COLORS[node.category] || CATEGORY_COLORS["その他"];
    },
    [colorGroups]
  );

  // --- D3 Graph Rendering ---
  useEffect(() => {
    if (!svgRef.current || loading) return;
    const { nodes, links } = filteredData();
    if (nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Arrow marker
    if (showArrows) {
      svg
        .append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#4b5563");
    }

    const g = svg.append("g");

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
        // Text fade based on zoom level
        const scale = event.transform.k;
        g.selectAll<SVGTextElement, GraphNode>(".node-label").attr("opacity", () =>
          scale > textFadeThreshold ? 1 : Math.max(0, (scale - textFadeThreshold * 0.5) / (textFadeThreshold * 0.5))
        );
      });
    svg.call(zoom);

    // Simulation
    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[] as GraphNode[])
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d) => (d as GraphNode).id)
          .distance(linkDistance)
          .strength(linkStrength)
      )
      .force("charge", d3.forceManyBody().strength(-repelStrength * 10))
      .force("center", d3.forceCenter(width / 2, height / 2).strength(centerStrength))
      .force("collision", d3.forceCollide().radius((d) => getNodeRadius(d as GraphNode) + 2))
      .alphaDecay(0.01)
      .velocityDecay(0.3);

    simulationRef.current = simulation as unknown as d3.Simulation<GraphNode, GraphLink>;

    function getNodeRadius(d: GraphNode) {
      return nodeSize + (d.connectionCount || 0) * 1.5;
    }

    // Links
    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#374151")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", linkThickness)
      .attr("marker-end", showArrows ? "url(#arrowhead)" : null);

    // Nodes
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", getNodeRadius)
      .attr("fill", getNodeColor)
      .attr("stroke", "transparent")
      .attr("stroke-width", 2)
      .attr("cursor", "pointer")
      .on("click", (_, d) => setSelectedMemo(d))
      .on("mouseenter", function (_, d) {
        setHoveredNode(d.id);
        // Highlight connected
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        links.forEach((l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          if (s === d.id) connectedIds.add(t);
          if (t === d.id) connectedIds.add(s);
        });

        node.attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.1));
        link.attr("stroke-opacity", (l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          return s === d.id || t === d.id ? 0.8 : 0.03;
        });
        label.attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.05));

        d3.select(this)
          .transition()
          .duration(150)
          .attr("r", getNodeRadius(d) * 1.4)
          .attr("stroke", "#fff")
          .attr("stroke-width", 2);
      })
      .on("mouseleave", function (_, d) {
        setHoveredNode(null);
        node.attr("opacity", 1);
        link.attr("stroke-opacity", 0.4);
        label.attr("opacity", 1);
        d3.select(this)
          .transition()
          .duration(150)
          .attr("r", getNodeRadius(d))
          .attr("stroke", "transparent");
      });

    // Drag
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
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("class", "node-label")
      .text((d) => d.title || "")
      .attr("font-size", "9px")
      .attr("fill", "#9ca3af")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => getNodeRadius(d) + 12)
      .attr("pointer-events", "none");

    // Tag labels
    if (showTags) {
      g.append("g")
        .attr("class", "tag-labels")
        .selectAll("text")
        .data(nodes.filter((n) => n.tags.length > 0))
        .join("text")
        .text((d) => d.tags.slice(0, 2).map((t) => `#${t}`).join(" "))
        .attr("font-size", "7px")
        .attr("fill", "#6b7280")
        .attr("text-anchor", "middle")
        .attr("dy", (d) => getNodeRadius(d) + 22)
        .attr("pointer-events", "none")
        .attr("class", "node-label");
    }

    // === INSIGHT LINKS (glowing connections) ===
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const visibleInsightLinks = showInsights
      ? graphData.insightLinks.filter(
          (il) => nodeMap.has(il.source) && nodeMap.has(il.target)
        )
      : [];

    // SVG gradient definitions for insight links
    const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");

    // Glow filter
    const filter = defs.append("filter").attr("id", "glow");
    filter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Animated dash pattern
    const insightLinkGroup = g.append("g").attr("class", "insight-links");

    const insightLine = insightLinkGroup
      .selectAll("line")
      .data(visibleInsightLinks)
      .join("line")
      .attr("stroke", (d) => DOMAIN_COLORS[d.domain] || "#a855f7")
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", "8,4")
      .attr("filter", "url(#glow)")
      .attr("cursor", "pointer")
      .on("mouseenter", (_, d) => setHoveredInsight(d))
      .on("mouseleave", () => setHoveredInsight(null));

    // Discovery animation: lines appear with electric effect
    if (insightAnimating) {
      insightLine
        .attr("stroke-opacity", 0)
        .transition()
        .delay((_, i) => i * 400)
        .duration(800)
        .attr("stroke-opacity", 0.9)
        .on("start", function () {
          d3.select(this)
            .attr("stroke-width", 5)
            .transition()
            .duration(400)
            .attr("stroke-width", 2.5);
        });
    } else {
      insightLine.attr("stroke-opacity", 0.7);
    }

    // Animate dash offset for flowing effect
    let dashOffset = 0;
    const animateDash = () => {
      dashOffset -= 0.5;
      insightLine.attr("stroke-dashoffset", dashOffset);
      requestAnimationFrame(animateDash);
    };
    const dashAnimFrame = requestAnimationFrame(animateDash);

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as GraphNode).x || 0)
        .attr("y1", (d) => (d.source as GraphNode).y || 0)
        .attr("x2", (d) => (d.target as GraphNode).x || 0)
        .attr("y2", (d) => (d.target as GraphNode).y || 0);

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);

      g.selectAll<SVGTextElement, GraphNode>(".node-label")
        .attr("x", (d) => d.x || 0)
        .attr("y", (d) => d.y || 0);

      // Update insight links positions
      insightLine
        .attr("x1", (d) => nodeMap.get(d.source)?.x || 0)
        .attr("y1", (d) => nodeMap.get(d.source)?.y || 0)
        .attr("x2", (d) => nodeMap.get(d.target)?.x || 0)
        .attr("y2", (d) => nodeMap.get(d.target)?.y || 0);
    });

    return () => {
      simulation.stop();
      cancelAnimationFrame(dashAnimFrame);
    };
  }, [
    filteredData,
    loading,
    showArrows,
    showTags,
    showInsights,
    insightAnimating,
    textFadeThreshold,
    nodeSize,
    linkThickness,
    centerStrength,
    repelStrength,
    linkStrength,
    linkDistance,
    getNodeColor,
    graphData.insightLinks,
  ]);

  // --- Animation (time-lapse) ---
  const startAnimation = () => {
    if (graphData.nodes.length === 0) return;
    setIsAnimating(true);

    const sorted = [...graphData.nodes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let i = 0;
    setGraphData({ nodes: [], links: [], insightLinks: [] });

    animationRef.current = setInterval(() => {
      if (i >= sorted.length) {
        if (animationRef.current) clearInterval(animationRef.current);
        setIsAnimating(false);
        // Restore full data
        fetch("/api/memos/similar")
          .then((r) => r.json())
          .then(setGraphData);
        return;
      }
      const visibleIds = new Set(sorted.slice(0, i + 1).map((n) => n.id));
      setGraphData((prev) => ({
        nodes: sorted.slice(0, i + 1),
        links: prev.links.filter((l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          return visibleIds.has(s) && visibleIds.has(t);
        }),
        insightLinks: prev.insightLinks.filter(
          (il) => visibleIds.has(il.source) && visibleIds.has(il.target)
        ),
      }));
      i++;
    }, 800);
  };

  const stopAnimation = () => {
    if (animationRef.current) clearInterval(animationRef.current);
    setIsAnimating(false);
    fetch("/api/memos/similar")
      .then((r) => r.json())
      .then(setGraphData);
  };

  // --- Reset forces to defaults ---
  const resetForces = () => {
    setCenterStrength(DEFAULT_FORCES.centerStrength);
    setRepelStrength(DEFAULT_FORCES.repelStrength);
    setLinkStrength(DEFAULT_FORCES.linkStrength);
    setLinkDistance(DEFAULT_FORCES.linkDistance);
    setNodeSize(DEFAULT_DISPLAY.nodeSize);
    setLinkThickness(DEFAULT_DISPLAY.linkThickness);
    setTextFadeThreshold(DEFAULT_DISPLAY.textFadeThreshold);
    setShowArrows(DEFAULT_DISPLAY.showArrows);
    setShowTags(DEFAULT_DISPLAY.showTags);
    setShowOrphans(DEFAULT_DISPLAY.showOrphans);
  };

  // Color group management
  const addColorGroup = () => {
    setColorGroups((prev) => [...prev, { query: "", color: "#888888" }]);
  };
  const removeColorGroup = (i: number) => {
    setColorGroups((prev) => prev.filter((_, idx) => idx !== i));
  };
  const updateColorGroup = (i: number, field: "query" | "color", value: string) => {
    setColorGroups((prev) =>
      prev.map((g, idx) => (idx === i ? { ...g, [field]: value } : g))
    );
  };

  const allCategories = [...new Set(graphData.nodes.map((n) => n.category))];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* === GRAPH AREA === */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground text-sm">読み込み中...</div>
          </div>
        ) : graphData.nodes.length === 0 && !isAnimating ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <svg className="w-16 h-16 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            <p className="text-muted-foreground">メモがありません</p>
            <a href="/record">
              <Button>最初のメモを録音する</Button>
            </a>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}

        {/* Top-left: search + quick filters */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 max-w-[240px]">
          <Input
            placeholder="検索... (tag: category:)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card/90 backdrop-blur text-xs h-8"
          />
          <div className="flex flex-wrap gap-1">
            {allCategories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedGroups.includes(cat) ? "default" : "outline"}
                className="text-[10px] cursor-pointer"
                onClick={() =>
                  setSelectedGroups((prev) =>
                    prev.includes(cat) ? prev.filter((g) => g !== cat) : [...prev, cat]
                  )
                }
              >
                <span
                  className="w-2 h-2 rounded-full mr-1 inline-block"
                  style={{ backgroundColor: CATEGORY_COLORS[cat] || "#6b7280" }}
                />
                {cat}
              </Badge>
            ))}
            {selectedGroups.length > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] cursor-pointer text-red-400"
                onClick={() => setSelectedGroups([])}
              >
                クリア
              </Badge>
            )}
          </div>
        </div>

        {/* Top-right: settings gear + animate */}
        <div className="absolute top-3 right-3 flex gap-2">
          {isAnimating ? (
            <Button size="sm" variant="outline" onClick={stopAnimation} className="h-8 text-xs">
              停止
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={startAnimation} className="h-8 text-xs">
              アニメーション
            </Button>
          )}
          <Button
            size="sm"
            variant={settingsOpen ? "default" : "outline"}
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="h-8 w-8 p-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Button>
        </div>

        {/* Bottom-left: stats */}
        <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground bg-card/80 backdrop-blur rounded px-2 py-1">
          {filteredData().nodes.length} ノード / {filteredData().links.length} 接続
          {graphData.insightLinks.length > 0 && (
            <span className="text-violet-400"> / {graphData.insightLinks.length} インサイト</span>
          )}
        </div>

        {/* Hovered node tooltip */}
        {/* Node tooltip */}
        {hoveredNode && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur border border-border rounded-lg px-3 py-2 pointer-events-none max-w-xs">
            <p className="text-xs font-medium">
              {graphData.nodes.find((n) => n.id === hoveredNode)?.title}
            </p>
            <p className="text-[10px] text-muted-foreground line-clamp-2">
              {graphData.nodes.find((n) => n.id === hoveredNode)?.summary}
            </p>
          </div>
        )}

        {/* Insight link tooltip */}
        {hoveredInsight && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur border rounded-lg px-4 py-3 pointer-events-none max-w-sm shadow-lg"
            style={{ borderColor: `${DOMAIN_COLORS[hoveredInsight.domain] || "#a855f7"}60` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: DOMAIN_COLORS[hoveredInsight.domain] || "#a855f7" }} />
              <span className="text-[10px] font-medium" style={{ color: DOMAIN_COLORS[hoveredInsight.domain] || "#a855f7" }}>
                {hoveredInsight.domain} インサイト
              </span>
            </div>
            <p className="text-xs">{hoveredInsight.insight}</p>
          </div>
        )}

        {/* Insight discovery banner */}
        {insightAnimating && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-violet-500/20 backdrop-blur border border-violet-500/40 rounded-lg px-4 py-2 animate-pulse">
            <p className="text-xs text-violet-300 font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              新しいインサイト接続を発見しました
            </p>
          </div>
        )}
      </div>

      {/* === SETTINGS PANEL (Obsidian-style) === */}
      {settingsOpen && !selectedMemo && (
        <div className="w-64 bg-card border-l border-border overflow-y-auto p-4 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">設定</h3>
            <Button size="sm" variant="ghost" onClick={resetForces} className="h-6 text-[10px]">
              リセット
            </Button>
          </div>

          {/* FILTERS */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">フィルター</h4>
            <label className="flex items-center justify-between text-xs">
              <span>タグ表示</span>
              <input type="checkbox" checked={showTags} onChange={(e) => setShowTags(e.target.checked)} className="accent-primary" />
            </label>
            <label className="flex items-center justify-between text-xs">
              <span>孤立ノード</span>
              <input type="checkbox" checked={showOrphans} onChange={(e) => setShowOrphans(e.target.checked)} className="accent-primary" />
            </label>
            <label className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                インサイト接続
                <span className="text-[9px] text-violet-400">({graphData.insightLinks.length})</span>
              </span>
              <input type="checkbox" checked={showInsights} onChange={(e) => setShowInsights(e.target.checked)} className="accent-violet-500" />
            </label>
          </div>

          <Separator />

          {/* DISPLAY */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">表示</h4>
            <label className="flex items-center justify-between text-xs">
              <span>矢印</span>
              <input type="checkbox" checked={showArrows} onChange={(e) => setShowArrows(e.target.checked)} className="accent-primary" />
            </label>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>テキスト表示閾値</span>
                <span>{textFadeThreshold.toFixed(2)}</span>
              </div>
              <Slider value={[textFadeThreshold]} onValueChange={(v) => setTextFadeThreshold(Array.isArray(v) ? v[0] : v)} min={0.1} max={3} step={0.1} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>ノードサイズ</span>
                <span>{nodeSize}</span>
              </div>
              <Slider value={[nodeSize]} onValueChange={(v) => setNodeSize(Array.isArray(v) ? v[0] : v)} min={1} max={15} step={0.5} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>リンクの太さ</span>
                <span>{linkThickness}</span>
              </div>
              <Slider value={[linkThickness]} onValueChange={(v) => setLinkThickness(Array.isArray(v) ? v[0] : v)} min={0.2} max={5} step={0.2} />
            </div>
          </div>

          <Separator />

          {/* FORCES */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">フォース</h4>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>中心引力</span>
                <span>{centerStrength.toFixed(2)}</span>
              </div>
              <Slider value={[centerStrength]} onValueChange={(v) => setCenterStrength(Array.isArray(v) ? v[0] : v)} min={0} max={1} step={0.02} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>反発力</span>
                <span>{repelStrength.toFixed(1)}</span>
              </div>
              <Slider value={[repelStrength]} onValueChange={(v) => setRepelStrength(Array.isArray(v) ? v[0] : v)} min={0} max={50} step={0.5} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>リンク引力</span>
                <span>{linkStrength.toFixed(2)}</span>
              </div>
              <Slider value={[linkStrength]} onValueChange={(v) => setLinkStrength(Array.isArray(v) ? v[0] : v)} min={0} max={1} step={0.02} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>リンク距離</span>
                <span>{linkDistance}</span>
              </div>
              <Slider value={[linkDistance]} onValueChange={(v) => setLinkDistance(Array.isArray(v) ? v[0] : v)} min={10} max={500} step={5} />
            </div>
          </div>

          <Separator />

          {/* COLOR GROUPS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">グループ</h4>
              <Button size="sm" variant="ghost" onClick={addColorGroup} className="h-5 text-[10px] px-1">
                + 追加
              </Button>
            </div>
            {colorGroups.map((group, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  type="color"
                  value={group.color}
                  onChange={(e) => updateColorGroup(i, "color", e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                />
                <Input
                  value={group.query}
                  onChange={(e) => updateColorGroup(i, "query", e.target.value)}
                  placeholder="検索クエリ"
                  className="h-6 text-[10px] flex-1"
                />
                <button
                  onClick={() => removeColorGroup(i)}
                  className="text-muted-foreground hover:text-destructive text-xs px-1"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === DETAIL PANEL === */}
      {selectedMemo && (
        <div className="w-72 bg-card border-l border-border overflow-y-auto">
          <Card className="border-0 rounded-none">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm">{selectedMemo.title}</CardTitle>
                <button
                  onClick={() => setSelectedMemo(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge style={{ backgroundColor: getNodeColor(selectedMemo) + "20", color: getNodeColor(selectedMemo) }}>
                  {selectedMemo.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {selectedMemo.connectionCount || 0} 接続
                </span>
              </div>

              <p className="text-xs text-muted-foreground">{selectedMemo.summary}</p>

              <div className="flex flex-wrap gap-1">
                {selectedMemo.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">
                    #{tag}
                  </Badge>
                ))}
              </div>

              <Separator />

              <p className="text-[10px] text-muted-foreground">
                {new Date(selectedMemo.created_at).toLocaleString("ja-JP")}
              </p>

              <a href={`/memo/${selectedMemo.id}`}>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  詳細を見る
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
