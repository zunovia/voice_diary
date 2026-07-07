"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useI18n } from "@/lib/i18n";

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
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  _drift?: number; // 無軌道ドリフト(遊泳)用の進行方向(ラジアン)
  connectionCount?: number;
  // Fusion node fields
  isFusion?: boolean;
  shape?: "star" | "triangle" | "diamond";
  parentMemoIds?: string[];
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  similarity: number;
  isFusionLink?: boolean;
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
  centerStrength: 1.2,
  repelStrength: 11, // ノード同士を広げて文字が読める余白を作る（旧6は密集しがち）
  linkStrength: 0.4,
  linkDistance: 150,
};

const DEFAULT_DISPLAY = {
  showArrows: false,
  showTags: true,
  showOrphans: true,
  textFadeThreshold: 1.0,
  nodeSize: 4,
  linkThickness: 1,
  labelSize: 9,
};

export default function KnowledgeGraph() {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);

  // Data
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[]; insightLinks: InsightLink[] }>({ nodes: [], links: [], insightLinks: [] });
  const [loading, setLoading] = useState(true);

  // Insight display
  const [showInsights, setShowInsights] = useState(true);
  const [insightAnimating, setInsightAnimating] = useState(false);
  const [hoveredInsight, setHoveredInsight] = useState<InsightLink | null>(null);

  // Ignition (意味の自己増殖)
  type Ignition = {
    id: string;
    memoIds: string[];
    memoTitles: string[];
    density: number;
    question: string;
    spark: string;
    direction: string;
    temperature: number;
  };
  const [ignitions, setIgnitions] = useState<Ignition[]>([]);
  const [selectedIgnition, setSelectedIgnition] = useState<Ignition | null>(null);
  const [showIgnitions, setShowIgnitions] = useState(true);

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
  const [labelSize, setLabelSize] = useState(DEFAULT_DISPLAY.labelSize);

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

  // Rotation (use refs to avoid full re-render on toggle)
  const [rotationSpeed, setRotationSpeed] = useState(0.45);
  const [isRotating, setIsRotating] = useState(true);
  const isRotatingRef = useRef(true);
  const rotationSpeedRef = useRef(0.45);
  useEffect(() => { isRotatingRef.current = isRotating; }, [isRotating]);
  useEffect(() => { rotationSpeedRef.current = rotationSpeed; }, [rotationSpeed]);

  // Fusion (ノード融合)
  const [fusionPreview, setFusionPreview] = useState<{ nodeA: GraphNode; nodeB: GraphNode } | null>(null);
  const [fusionLoading, setFusionLoading] = useState(false);
  const fusionTargetRef = useRef<GraphNode | null>(null);

  // Animation
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<NodeJS.Timeout | null>(null);
  const fullDataRef = useRef<{ nodes: GraphNode[]; links: GraphLink[]; insightLinks: InsightLink[] }>({ nodes: [], links: [], insightLinks: [] });

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
        fullDataRef.current = data;
        setGraphData(data);
        setLoading(false);
        // Fetch ignition points
        if (data.insightLinks?.length > 0) {
          fetch("/api/ignite")
            .then((r) => r.json())
            .then((d) => setIgnitions(d.ignitions || []))
            .catch(() => {});
        }
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
    // Fully clear all previous SVG content (including leaked elements)
    svg.selectAll("*").remove();
    svg.html("");

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

    // Build combined links: regular + insight (for force calculation)
    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const insightForceLinks = showInsights
      ? graphData.insightLinks
          .filter((il) => nodeIdSet.has(il.source) && nodeIdSet.has(il.target))
          .map((il) => ({ source: il.source, target: il.target, similarity: 0.8 }))
      : [];
    const allForceLinks = [...links, ...insightForceLinks];

    // Simulation — Obsidian風の「ゆっくり無軌道に遊泳」する物理。
    // ・中心へは forceX/forceY で弱く引くだけ（ハードな recenter はしない＝画面全体に広がる）
    // ・境界は tick 側のソフトな壁＋クランプで画面外へ出さない
    // ・alphaTarget を少しだけ温め続けて永続的に微動（遊泳の素）。実際の漂いは animateLoop の drift が与える
    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[] as GraphNode[])
      .force(
        "link",
        d3
          .forceLink(allForceLinks)
          .id((d) => (d as GraphNode).id)
          .distance(linkDistance)
          .strength(linkStrength)
      )
      .force(
        "charge",
        d3
          .forceManyBody()
          .strength(-repelStrength * 10)
          .distanceMax(Math.min(width, height) * 0.7)
      )
      .force("x", d3.forceX(width / 2).strength(0.02 * centerStrength))
      .force("y", d3.forceY(height / 2).strength(0.02 * centerStrength))
      .force(
        "collision",
        d3
          .forceCollide()
          // ラベル(ノードの下に出る文字)ぶんの余白を衝突半径に含めて、文字が重ならない間隔を確保する
          .radius((d) => getNodeRadius(d as GraphNode) + (labelSize > 0 ? labelSize * 1.8 + 10 : 6))
          .strength(1)
          .iterations(2)
      )
      .alphaDecay(0.02)
      .velocityDecay(0.4)
      .alphaTarget(0.06);

    // If nodes already have positions (e.g. after stopping animation), start with low alpha
    // so they don't jump around - just gently float
    const hasPositions = nodes.some((n) => n.x != null && n.y != null);
    if (hasPositions) {
      simulation.alpha(0.1);
    }

    // Keep simulation always alive (Obsidian-like constant micro-movement)
    simulation.alphaMin(0);

    simulationRef.current = simulation as unknown as d3.Simulation<GraphNode, GraphLink>;

    function getNodeRadius(d: GraphNode) {
      return nodeSize + (d.connectionCount || 0) * 1.5;
    }

    // Links (regular + fusion parent links)
    const regularLinks = links.filter((l) => !(l as GraphLink).isFusionLink);
    const fusionParentLinks = links.filter((l) => (l as GraphLink).isFusionLink);

    const link = g
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(regularLinks)
      .join("line")
      .attr("stroke", "#374151")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", linkThickness)
      .attr("marker-end", showArrows ? "url(#arrowhead)" : null);

    // Fusion parent links (very subtle, like insight links)
    const fusionLink = g
      .append("g")
      .attr("class", "fusion-links")
      .selectAll("line")
      .data(fusionParentLinks)
      .join("line")
      .attr("stroke", "#f59e0b")
      .attr("stroke-opacity", 0.25)
      .attr("stroke-width", 0.4)
      .attr("stroke-dasharray", "3,3");

    // Split nodes into regular and fusion
    const regularNodes = nodes.filter((n) => !n.isFusion);
    const fusionNodes = nodes.filter((n) => n.isFusion);

    // D3 symbol generators for fusion shapes
    const shapeMap: Record<string, d3.SymbolType> = {
      star: d3.symbolStar,
      triangle: d3.symbolTriangle,
      diamond: d3.symbolDiamond,
    };

    // Regular Nodes (circles)
    const node = g
      .append("g")
      .attr("class", "nodes")
      .selectAll("circle")
      .data(regularNodes)
      .join("circle")
      .attr("r", getNodeRadius)
      .attr("fill", getNodeColor)
      .attr("stroke", "transparent")
      .attr("stroke-width", 2)
      .attr("cursor", "pointer");

    // Fusion Nodes (special shapes)
    const fusionNode = g
      .append("g")
      .attr("class", "fusion-nodes")
      .selectAll("path")
      .data(fusionNodes)
      .join("path")
      .attr("d", (d) => {
        const r = getNodeRadius(d);
        const size = Math.pow(r * 1.5, 2); // Compact fusion node size
        const symbolType = shapeMap[d.shape || "diamond"] || d3.symbolDiamond;
        return d3.symbol().type(symbolType).size(size)() || "";
      })
      .attr("fill", (d) => {
        const shapeColors: Record<string, string> = { star: "#fbbf24", triangle: "#34d399", diamond: "#a78bfa" };
        return shapeColors[d.shape || "diamond"] || "#fbbf24";
      })
      .attr("stroke", "#ffffff40")
      .attr("stroke-width", 1.5)
      .attr("cursor", "pointer")
      .attr("filter", "url(#glow)");

    // Click handler
    node.on("click", (_, d) => setSelectedMemo(d));
    fusionNode.on("click", (_, d) => setSelectedMemo(d));

    // Hover handlers (use function() for D3's this binding)
    node
      .on("mouseenter", function (_, d) {
        setHoveredNode(d.id);
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        links.forEach((l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          if (s === d.id) connectedIds.add(t);
          if (t === d.id) connectedIds.add(s);
        });
        node.attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.1));
        fusionNode.attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.1));
        link.attr("stroke-opacity", (l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          return s === d.id || t === d.id ? 0.8 : 0.03;
        });
        fusionLink.attr("stroke-opacity", (l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          return s === d.id || t === d.id ? 0.9 : 0.1;
        });
        label.attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.05));
        d3.select(this).transition().duration(150)
          .attr("r", getNodeRadius(d) * 1.4).attr("stroke", "#fff").attr("stroke-width", 2);
      })
      .on("mouseleave", function (_, d) {
        setHoveredNode(null);
        node.attr("opacity", 1);
        fusionNode.attr("opacity", 1);
        link.attr("stroke-opacity", 0.4);
        fusionLink.attr("stroke-opacity", 0.6);
        label.attr("opacity", 1);
        d3.select(this).transition().duration(150)
          .attr("r", getNodeRadius(d)).attr("stroke", "transparent");
      });

    fusionNode
      .on("mouseenter", function (_, d) {
        setHoveredNode(d.id);
        const connectedIds = new Set<string>();
        connectedIds.add(d.id);
        links.forEach((l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          if (s === d.id) connectedIds.add(t);
          if (t === d.id) connectedIds.add(s);
        });
        node.attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.1));
        fusionNode.attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.1));
        link.attr("stroke-opacity", (l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          return s === d.id || t === d.id ? 0.8 : 0.03;
        });
        fusionLink.attr("stroke-opacity", (l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          return s === d.id || t === d.id ? 0.9 : 0.1;
        });
        label.attr("opacity", (n) => (connectedIds.has(n.id) ? 1 : 0.05));
        d3.select(this).transition().duration(150)
          .attr("stroke", "#fff").attr("stroke-width", 2.5);
      })
      .on("mouseleave", function (_, d) {
        setHoveredNode(null);
        node.attr("opacity", 1);
        fusionNode.attr("opacity", 1);
        link.attr("stroke-opacity", 0.4);
        fusionLink.attr("stroke-opacity", 0.6);
        label.attr("opacity", 1);
        d3.select(this).transition().duration(150)
          .attr("stroke", "#ffffff40").attr("stroke-width", 1.5);
      });

    // Double-click to release pinned node
    node.on("dblclick", function (event, d) {
      event.stopPropagation();
      d.fx = null; d.fy = null;
      d3.select(this).attr("stroke", "transparent").attr("stroke-width", 2);
      simulation.alpha(0.3).restart();
    });
    fusionNode.on("dblclick", function (event, d) {
      event.stopPropagation();
      d.fx = null; d.fy = null;
      d3.select(this).attr("stroke", "#ffffff40").attr("stroke-width", 1.5);
      simulation.alpha(0.3).restart();
    });

    // Fusion zone indicator (hidden initially)
    const fusionZone = g.append("circle")
      .attr("class", "fusion-zone")
      .attr("r", 0)
      .attr("fill", "none")
      .attr("stroke", "#fbbf24")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4,4")
      .attr("opacity", 0);

    // Drag with fusion detection
    // Track previous fusion target to release its pin when target changes
    let prevFusionTarget: GraphNode | null = null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dragBehavior = d3
      .drag<SVGElement, GraphNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        fusionTargetRef.current = null;
        prevFusionTarget = null;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;

        // Detect proximity to other nodes for fusion
        let closestNode: GraphNode | null = null;
        let closestDist = Infinity;
        const fusionThreshold = 60; // Wide detection range (nodes won't escape)

        nodes.forEach((other) => {
          if (other.id === d.id) return;
          if (other.isFusion && d.isFusion) return; // no fusion-fusion
          const dx = (other.x || 0) - event.x;
          const dy = (other.y || 0) - event.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < fusionThreshold && dist < closestDist) {
            closestNode = other;
            closestDist = dist;
          }
        });

        const closest = closestNode as GraphNode | null;
        if (closest) {
          // Release previous target if different
          if (prevFusionTarget && prevFusionTarget.id !== closest.id) {
            prevFusionTarget.fx = null;
            prevFusionTarget.fy = null;
          }

          fusionTargetRef.current = closest;
          prevFusionTarget = closest;

          // Pin the target so it doesn't run away from repel force!
          closest.fx = closest.x;
          closest.fy = closest.y;

          fusionZone
            .attr("cx", closest.x || 0)
            .attr("cy", closest.y || 0)
            .attr("r", 35)
            .attr("opacity", 0.8);
          // Highlight the target
          node.filter((n) => n.id === closest!.id)
            .attr("stroke", "#fbbf24").attr("stroke-width", 3);
          fusionNode.filter((n) => n.id === closest!.id)
            .attr("stroke", "#fbbf24").attr("stroke-width", 3);
        } else {
          // Release previously pinned target
          if (prevFusionTarget) {
            prevFusionTarget.fx = null;
            prevFusionTarget.fy = null;
            prevFusionTarget = null;
          }
          fusionTargetRef.current = null;
          fusionZone.attr("opacity", 0);
          node.attr("stroke", "transparent");
          fusionNode.attr("stroke", "#ffffff40");
        }
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.06);

        fusionZone.attr("opacity", 0);
        node.attr("stroke", "transparent");
        fusionNode.attr("stroke", "#ffffff40");

        const target = fusionTargetRef.current;

        // Release pinned target
        if (prevFusionTarget) {
          prevFusionTarget.fx = null;
          prevFusionTarget.fy = null;
          prevFusionTarget = null;
        }

        if (target && target.id !== d.id) {
          // Trigger fusion!
          d.fx = null;
          d.fy = null;
          setFusionPreview({ nodeA: d, nodeB: target });
        } else {
          // Normal pin behavior
          d3.select(event.sourceEvent?.target as SVGElement)
            .attr("stroke", "#ffffff30").attr("stroke-width", 1);
        }
        fusionTargetRef.current = null;
      });

    // d3のSelection/DragBehaviorのジェネリクス相互運用のための意図的なany（ランタイム影響なし）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (node as any).call(dragBehavior);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (fusionNode as any).call(dragBehavior);

    // Labels (hidden when labelSize is 0)
    const label = g
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .attr("class", "node-label")
      .text((d) => d.title || "")
      .attr("font-size", `${labelSize}px`)
      .attr("fill", "#9ca3af")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => getNodeRadius(d) + labelSize + 3)
      .attr("pointer-events", "none")
      .attr("display", labelSize === 0 ? "none" : null);

    // Tag labels
    if (showTags && labelSize > 0) {
      const tagFontSize = Math.max(5, Math.round(labelSize * 0.78));
      g.append("g")
        .attr("class", "tag-labels")
        .selectAll("text")
        .data(nodes.filter((n) => n.tags.length > 0))
        .join("text")
        .text((d) => d.tags.slice(0, 2).map((t) => `#${t}`).join(" "))
        .attr("font-size", `${tagFontSize}px`)
        .attr("fill", "#6b7280")
        .attr("text-anchor", "middle")
        .attr("dy", (d) => getNodeRadius(d) + labelSize + tagFontSize + 5)
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
      .attr("stroke-width", 0.3)
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
            .attr("stroke-width", 1)
            .transition()
            .duration(400)
            .attr("stroke-width", 0.3);
        });
    } else {
      insightLine.attr("stroke-opacity", 0.35);
    }

    // === IGNITION POINTS (発火ポイント) ===
    if (showIgnitions && ignitions.length > 0) {
      const ignitionGroup = g.append("g").attr("class", "ignitions");

      ignitions.forEach((ign) => {
        // Calculate center position of related memos
        const relatedNodes = ign.memoIds
          .map((id) => nodeMap.get(id))
          .filter(Boolean);
        if (relatedNodes.length < 2) return;

        // Ignition spark group
        const sparkGroup = ignitionGroup.append("g").attr("class", `ignition-${ign.id}`);

        // Outer pulsing ring
        sparkGroup
          .append("circle")
          .attr("r", 12 + ign.temperature * 8)
          .attr("fill", "none")
          .attr("stroke", `hsl(${30 + ign.temperature * 30}, 100%, 60%)`)
          .attr("stroke-width", 0.5)
          .attr("opacity", 0)
          .attr("class", "ignite-pulse");

        // Inner glow
        sparkGroup
          .append("circle")
          .attr("r", 4 + ign.temperature * 4)
          .attr("fill", `hsl(${30 + ign.temperature * 30}, 100%, 70%)`)
          .attr("opacity", 0.6)
          .attr("cursor", "pointer")
          .attr("class", "ignite-core")
          .on("click", () => setSelectedIgnition(ign));

        // Question mark
        sparkGroup
          .append("text")
          .text("?")
          .attr("font-size", `${8 + ign.temperature * 4}px`)
          .attr("fill", "#fff")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("pointer-events", "none")
          .attr("font-weight", "bold");
      });

      // Pulse animation
      let pulsePhase = 0;
      const pulseAnimate = () => {
        pulsePhase += 0.03;
        const pulse = (Math.sin(pulsePhase) + 1) / 2;

        g.selectAll(".ignite-pulse")
          .attr("opacity", pulse * 0.4)
          .attr("r", function () {
            const base = parseFloat(d3.select(this).attr("r") || "15");
            return base + pulse * 5;
          });

        g.selectAll(".ignite-core")
          .attr("opacity", 0.4 + pulse * 0.4);

        requestAnimationFrame(pulseAnimate);
      };
      requestAnimationFrame(pulseAnimate);
    }

    // Animate dash offset for flowing effect + aimless drift (遊泳)
    let dashOffset = 0;
    let animRunning = true;

    const animateLoop = () => {
      if (!animRunning) return;

      // Flowing dash effect
      dashOffset -= 0.5;
      insightLine.attr("stroke-dashoffset", dashOffset);

      // Aimless drift（Obsidian風の「ゆっくり無軌道に遊泳」）:
      // 各ノードにゆっくり向きの変わる進行方向(_drift)を持たせ、その向きへ
      // 微小な力を与え続ける。軌道回転ではなく、当てもなく漂う動き。
      if (isRotatingRef.current && rotationSpeedRef.current > 0) {
        const drift = rotationSpeedRef.current * 0.6;
        nodes.forEach((n) => {
          if (n.fx != null) return; // skip pinned nodes
          n._drift =
            (n._drift ?? Math.random() * Math.PI * 2) + (Math.random() - 0.5) * 0.3;
          n.vx = (n.vx || 0) + Math.cos(n._drift) * drift;
          n.vy = (n.vy || 0) + Math.sin(n._drift) * drift;
        });

        // Keep simulation gently alive
        if (simulation.alpha() < 0.05) {
          simulation.alpha(0.06).restart();
        }
      }

      requestAnimationFrame(animateLoop);
    };
    requestAnimationFrame(animateLoop);

    // Tick
    simulation.on("tick", () => {
      // Boundary: 画面全体を使いつつ、端に近づくとやんわり押し戻し、
      // 最後にハードクランプで絶対に画面外へ出さない（Obsidian風の"画面内で遊泳"）。
      const margin = 26;
      nodes.forEach((d) => {
        if (d.fx != null) return; // skip pinned nodes
        if (d.x == null || d.y == null) return;
        if (d.x < margin) d.vx = (d.vx || 0) + (margin - d.x) * 0.03;
        else if (d.x > width - margin) d.vx = (d.vx || 0) - (d.x - (width - margin)) * 0.03;
        if (d.y < margin) d.vy = (d.vy || 0) + (margin - d.y) * 0.03;
        else if (d.y > height - margin) d.vy = (d.vy || 0) - (d.y - (height - margin)) * 0.03;
        // hard clamp — 画面外へは出さない
        d.x = Math.max(8, Math.min(width - 8, d.x));
        d.y = Math.max(8, Math.min(height - 8, d.y));
      });

      link
        .attr("x1", (d) => (d.source as GraphNode).x || 0)
        .attr("y1", (d) => (d.source as GraphNode).y || 0)
        .attr("x2", (d) => (d.target as GraphNode).x || 0)
        .attr("y2", (d) => (d.target as GraphNode).y || 0);

      fusionLink
        .attr("x1", (d) => (d.source as GraphNode).x || 0)
        .attr("y1", (d) => (d.source as GraphNode).y || 0)
        .attr("x2", (d) => (d.target as GraphNode).x || 0)
        .attr("y2", (d) => (d.target as GraphNode).y || 0);

      node.attr("cx", (d) => d.x || 0).attr("cy", (d) => d.y || 0);

      // Fusion nodes use transform for positioning
      fusionNode.attr("transform", (d) => `translate(${d.x || 0},${d.y || 0})`);

      g.selectAll<SVGTextElement, GraphNode>(".node-label")
        .attr("x", (d) => d.x || 0)
        .attr("y", (d) => d.y || 0);

      // Update insight links positions
      insightLine
        .attr("x1", (d) => nodeMap.get(d.source)?.x || 0)
        .attr("y1", (d) => nodeMap.get(d.source)?.y || 0)
        .attr("x2", (d) => nodeMap.get(d.target)?.x || 0)
        .attr("y2", (d) => nodeMap.get(d.target)?.y || 0);

      // Update ignition positions (center of related memos)
      if (showIgnitions && ignitions.length > 0) {
        ignitions.forEach((ign) => {
          const relatedNodes = ign.memoIds
            .map((id) => nodeMap.get(id))
            .filter(Boolean);
          if (relatedNodes.length < 2) return;
          const cx = relatedNodes.reduce((s, n) => s + (n?.x || 0), 0) / relatedNodes.length;
          const cy = relatedNodes.reduce((s, n) => s + (n?.y || 0), 0) / relatedNodes.length;
          g.select(`.ignition-${ign.id}`).attr("transform", `translate(${cx},${cy})`);
        });
      }
    });

    return () => {
      simulation.stop();
      animRunning = false;
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
    labelSize,
    centerStrength,
    repelStrength,
    linkStrength,
    linkDistance,
    getNodeColor,
    graphData.insightLinks,
    showIgnitions,
    ignitions,
  ]);

  // --- Animation (time-lapse) ---
  const startAnimation = () => {
    const full = fullDataRef.current;
    if (full.nodes.length === 0) return;
    setIsAnimating(true);

    const sorted = [...full.nodes].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    let i = 0;
    setGraphData({ nodes: [], links: [], insightLinks: [] });

    animationRef.current = setInterval(() => {
      if (i >= sorted.length) {
        if (animationRef.current) clearInterval(animationRef.current);
        setIsAnimating(false);
        return;
      }
      const visibleIds = new Set(sorted.slice(0, i + 1).map((n) => n.id));
      setGraphData({
        nodes: sorted.slice(0, i + 1),
        links: full.links.filter((l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          return visibleIds.has(s) && visibleIds.has(t);
        }),
        insightLinks: full.insightLinks.filter(
          (il) => visibleIds.has(il.source) && visibleIds.has(il.target)
        ),
      });
      i++;
    }, 800);
  };

  const stopAnimation = () => {
    if (animationRef.current) clearInterval(animationRef.current);
    setIsAnimating(false);

    // Capture current node positions from the running simulation
    const currentPositions = new Map<string, { x: number; y: number }>();
    if (simulationRef.current) {
      (simulationRef.current.nodes() as GraphNode[]).forEach((n) => {
        if (n.x != null && n.y != null) {
          currentPositions.set(n.id, { x: n.x, y: n.y });
        }
      });
    }

    // Pre-assign positions to all nodes so they appear instantly
    const full = fullDataRef.current;
    const width = svgRef.current?.clientWidth || 800;
    const height = svgRef.current?.clientHeight || 600;
    const cx = width / 2;
    const cy = height / 2;

    const positionedNodes = full.nodes.map((n, i) => {
      const saved = currentPositions.get(n.id);
      if (saved) {
        return { ...n, x: saved.x, y: saved.y };
      }
      // Nodes not yet visible: spread in a circle around center
      const angle = (i / full.nodes.length) * 2 * Math.PI;
      const radius = 100 + Math.random() * 150;
      return { ...n, x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });

    setGraphData({
      nodes: positionedNodes,
      links: full.links,
      insightLinks: full.insightLinks,
    });
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
    setLabelSize(DEFAULT_DISPLAY.labelSize);
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

  // --- Fusion execution ---
  const executeFusion = async (nodeA: GraphNode, nodeB: GraphNode) => {
    setFusionLoading(true);
    try {
      const res = await fetch("/api/fuse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoIdA: nodeA.id, memoIdB: nodeB.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fusion failed");

      const fusion = data.fusion;
      // Add the new fusion node to the graph at the midpoint of the two parents
      const midX = ((nodeA.x || 0) + (nodeB.x || 0)) / 2;
      const midY = ((nodeA.y || 0) + (nodeB.y || 0)) / 2;
      const newNode: GraphNode = {
        id: fusion.id,
        title: fusion.title,
        summary: fusion.summary || fusion.insight,
        category: fusion.category || "その他",
        tags: fusion.tags || [],
        created_at: fusion.created_at,
        isFusion: true,
        shape: fusion.shape || "diamond",
        parentMemoIds: fusion.parent_memo_ids,
        x: midX,
        y: midY,
      };

      // Add parent links
      const parentLinks: GraphLink[] = [
        { source: fusion.id, target: nodeA.id, similarity: 1.0, isFusionLink: true },
        { source: fusion.id, target: nodeB.id, similarity: 1.0, isFusionLink: true },
      ];

      setGraphData((prev) => ({
        nodes: [...prev.nodes, newNode],
        links: [...prev.links, ...parentLinks],
        insightLinks: prev.insightLinks,
      }));

      // Also update fullDataRef
      fullDataRef.current = {
        nodes: [...fullDataRef.current.nodes, newNode],
        links: [...fullDataRef.current.links, ...parentLinks],
        insightLinks: fullDataRef.current.insightLinks,
      };
    } catch (err) {
      console.error("Fusion error:", err);
      alert(err instanceof Error ? err.message : "Fusion failed");
    } finally {
      setFusionLoading(false);
      setFusionPreview(null);
    }
  };

  // --- Delete fusion node ---
  const deleteFusion = async (fusionId: string) => {
    if (!confirm("Delete this fusion node?")) return;
    try {
      const res = await fetch("/api/fuse", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fusionId }),
      });
      if (!res.ok) throw new Error("削除に失敗しました");

      // Remove from graph
      setGraphData((prev) => ({
        nodes: prev.nodes.filter((n) => n.id !== fusionId),
        links: prev.links.filter((l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          return s !== fusionId && t !== fusionId;
        }),
        insightLinks: prev.insightLinks,
      }));
      // Also update fullDataRef
      fullDataRef.current = {
        nodes: fullDataRef.current.nodes.filter((n) => n.id !== fusionId),
        links: fullDataRef.current.links.filter((l) => {
          const s = typeof l.source === "string" ? l.source : l.source.id;
          const t = typeof l.target === "string" ? l.target : l.target.id;
          return s !== fusionId && t !== fusionId;
        }),
        insightLinks: fullDataRef.current.insightLinks,
      };
      setSelectedMemo(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました");
    }
  };

  const allCategories = [...new Set(graphData.nodes.map((n) => n.category))];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* === GRAPH AREA === */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground text-sm">{t("common.loading")}</div>
          </div>
        ) : graphData.nodes.length === 0 && !isAnimating ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <svg className="w-16 h-16 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            <p className="text-muted-foreground">{t("common.noMemos")}</p>
            <a href="/record">
              <Button>{t("common.recordFirst")}</Button>
            </a>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}

        {/* Top-left: search + quick filters */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 max-w-[240px]">
          <Input
            placeholder={t("graph.search")}
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
                {t("common.clear")}
              </Badge>
            )}
          </div>
        </div>

        {/* Top-right: settings gear + animate */}
        <div className="absolute top-3 right-3 flex gap-2">
          {isAnimating ? (
            <Button size="sm" variant="outline" onClick={stopAnimation} className="h-8 text-xs">
              {t("graph.stop")}
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={startAnimation} className="h-8 text-xs">
              {t("graph.animation")}
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
          {filteredData().nodes.filter((n) => !n.isFusion).length} {t("graph.nodes")} / {filteredData().links.length} {t("graph.connections")}
          {graphData.nodes.filter((n) => n.isFusion).length > 0 && (
            <span className="text-amber-400"> / {graphData.nodes.filter((n) => n.isFusion).length} {t("graph.fusions")}</span>
          )}
          {graphData.insightLinks.length > 0 && (
            <span className="text-violet-400"> / {graphData.insightLinks.length} {t("graph.insights")}</span>
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
                {hoveredInsight.domain} {t("graph.insights")}
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
              {t("graph.insightDiscovery")}
            </p>
          </div>
        )}

        {/* Ignition question popup */}
        {selectedIgnition && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedIgnition(null)}
          >
            <div
              className="bg-card border rounded-2xl p-6 max-w-sm mx-4 space-y-4 shadow-2xl animate-in fade-in zoom-in"
              style={{
                borderColor: `hsl(${30 + selectedIgnition.temperature * 30}, 100%, 40%)`,
                boxShadow: `0 0 40px hsl(${30 + selectedIgnition.temperature * 30}, 100%, 30%, 0.3)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Temperature indicator */}
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: `hsl(${30 + selectedIgnition.temperature * 30}, 100%, 60%)` }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {t("graph.ignitionTemp")}: {Math.round(selectedIgnition.temperature * 100)}%
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {selectedIgnition.density}{t("graph.collisions")}
                </span>
              </div>

              {/* The Question */}
              <div className="text-center py-2">
                <p className="text-lg font-bold leading-relaxed"
                  style={{ color: `hsl(${30 + selectedIgnition.temperature * 30}, 80%, 70%)` }}
                >
                  {selectedIgnition.question}
                </p>
              </div>

              {/* Spark explanation */}
              <p className="text-xs text-muted-foreground text-center">
                {selectedIgnition.spark}
              </p>

              {/* Direction */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                {selectedIgnition.direction}
              </div>

              {/* Source memos */}
              <div className="flex flex-wrap gap-1 justify-center">
                {selectedIgnition.memoTitles.map((t, i) => (
                  <Badge key={i} variant="outline" className="text-[9px]">{t}</Badge>
                ))}
              </div>

              {/* Action: Answer this question */}
              <a
                href={`/record?prompt=${encodeURIComponent(selectedIgnition.question)}`}
                className="block w-full text-center py-3 rounded-xl text-sm font-medium transition-all bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg"
              >
                {t("graph.answerQuestion")}
              </a>

              <button
                onClick={() => setSelectedIgnition(null)}
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                {t("common.close")}
              </button>
            </div>
          </div>
        )}
        {/* Fusion confirmation modal */}
        {fusionPreview && (
          <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => !fusionLoading && setFusionPreview(null)}
          >
            <div
              className="bg-card border border-amber-500/40 rounded-2xl p-6 max-w-sm mx-4 space-y-4 shadow-2xl animate-in fade-in zoom-in"
              style={{ boxShadow: "0 0 60px rgba(251, 191, 36, 0.2)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-bold text-sm">{t("graph.fusionTitle")}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("graph.fusionDesc")}
                </p>
              </div>

              <div className="flex items-center gap-2 justify-center">
                <div className="bg-muted rounded-lg px-3 py-2 text-xs font-medium max-w-[120px] truncate">
                  {fusionPreview.nodeA.title}
                </div>
                <span className="text-amber-500 font-bold">+</span>
                <div className="bg-muted rounded-lg px-3 py-2 text-xs font-medium max-w-[120px] truncate">
                  {fusionPreview.nodeB.title}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFusionPreview(null)}
                  disabled={fusionLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs border border-border hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={() => executeFusion(fusionPreview.nodeA, fusionPreview.nodeB)}
                  disabled={fusionLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg transition-all disabled:opacity-50"
                >
                  {fusionLoading ? (
                    <span className="flex items-center justify-center gap-1">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("graph.fusing")}
                    </span>
                  ) : (
                    t("graph.fuse")
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === SETTINGS PANEL (Obsidian-style) === */}
      {settingsOpen && !selectedMemo && !selectedIgnition && (
        <div className="w-64 bg-card border-l border-border overflow-y-auto p-4 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("settings.title")}</h3>
            <Button size="sm" variant="ghost" onClick={resetForces} className="h-6 text-[10px]">
              {t("common.reset")}
            </Button>
          </div>

          {/* FILTERS */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("settings.filters")}</h4>
            <label className="flex items-center justify-between text-xs">
              <span>{t("settings.showTags")}</span>
              <input type="checkbox" checked={showTags} onChange={(e) => setShowTags(e.target.checked)} className="accent-primary" />
            </label>
            <label className="flex items-center justify-between text-xs">
              <span>{t("settings.orphanNodes")}</span>
              <input type="checkbox" checked={showOrphans} onChange={(e) => setShowOrphans(e.target.checked)} className="accent-primary" />
            </label>
            <label className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                {t("settings.insightLinks")}
                <span className="text-[9px] text-violet-400">({graphData.insightLinks.length})</span>
              </span>
              <input type="checkbox" checked={showInsights} onChange={(e) => setShowInsights(e.target.checked)} className="accent-violet-500" />
            </label>
            <label className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                {t("settings.ignitionPoints")}
                <span className="text-[9px] text-orange-400">({ignitions.length})</span>
              </span>
              <input type="checkbox" checked={showIgnitions} onChange={(e) => setShowIgnitions(e.target.checked)} className="accent-orange-500" />
            </label>
          </div>

          <Separator />

          {/* DISPLAY */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("settings.display")}</h4>
            <label className="flex items-center justify-between text-xs">
              <span>{t("settings.arrows")}</span>
              <input type="checkbox" checked={showArrows} onChange={(e) => setShowArrows(e.target.checked)} className="accent-primary" />
            </label>

            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">{t("settings.labelSize")}</span>
              <div className="flex gap-1">
                {[
                  { label: t("settings.labelHidden"), value: 0 },
                  { label: t("settings.labelS"), value: 6 },
                  { label: t("settings.labelM"), value: 9 },
                  { label: t("settings.labelL"), value: 13 },
                  { label: t("settings.labelXL"), value: 18 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLabelSize(opt.value)}
                    className={`flex-1 text-[10px] py-1 rounded transition-colors ${
                      labelSize === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("settings.textThreshold")}</span>
                <span>{textFadeThreshold.toFixed(2)}</span>
              </div>
              <Slider value={[textFadeThreshold]} onValueChange={(v) => setTextFadeThreshold(Array.isArray(v) ? v[0] : v)} min={0.1} max={3} step={0.1} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("settings.nodeSize")}</span>
                <span>{nodeSize}</span>
              </div>
              <Slider value={[nodeSize]} onValueChange={(v) => setNodeSize(Array.isArray(v) ? v[0] : v)} min={1} max={15} step={0.5} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("settings.linkWidth")}</span>
                <span>{linkThickness}</span>
              </div>
              <Slider value={[linkThickness]} onValueChange={(v) => setLinkThickness(Array.isArray(v) ? v[0] : v)} min={0.2} max={5} step={0.2} />
            </div>
          </div>

          <Separator />

          {/* FORCES */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("settings.forces")}</h4>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("settings.centerForce")}</span>
                <span>{centerStrength.toFixed(2)}</span>
              </div>
              <Slider value={[centerStrength]} onValueChange={(v) => setCenterStrength(Array.isArray(v) ? v[0] : v)} min={0} max={1} step={0.02} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("settings.repelForce")}</span>
                <span>{repelStrength.toFixed(1)}</span>
              </div>
              <Slider value={[repelStrength]} onValueChange={(v) => setRepelStrength(Array.isArray(v) ? v[0] : v)} min={0} max={50} step={0.5} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("settings.linkForce")}</span>
                <span>{linkStrength.toFixed(2)}</span>
              </div>
              <Slider value={[linkStrength]} onValueChange={(v) => setLinkStrength(Array.isArray(v) ? v[0] : v)} min={0} max={1} step={0.02} />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("settings.linkDistance")}</span>
                <span>{linkDistance}</span>
              </div>
              <Slider value={[linkDistance]} onValueChange={(v) => setLinkDistance(Array.isArray(v) ? v[0] : v)} min={10} max={500} step={5} />
            </div>
          </div>

          <Separator />

          {/* ROTATION */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("settings.rotation")}</h4>
            <label className="flex items-center justify-between text-xs">
              <span>{t("settings.autoRotate")}</span>
              <input type="checkbox" checked={isRotating} onChange={(e) => setIsRotating(e.target.checked)} className="accent-primary" />
            </label>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{t("settings.rotateSpeed")}</span>
                <span>{rotationSpeed.toFixed(2)}</span>
              </div>
              <Slider value={[rotationSpeed]} onValueChange={(v) => setRotationSpeed(Array.isArray(v) ? v[0] : v)} min={0} max={1} step={0.02} />
            </div>
          </div>

          <Separator />

          {/* COLOR GROUPS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("settings.groups")}</h4>
              <Button size="sm" variant="ghost" onClick={addColorGroup} className="h-5 text-[10px] px-1">
                {t("settings.addGroup")}
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
                  placeholder={t("settings.searchQuery")}
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
                {selectedMemo.isFusion && (
                  <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {selectedMemo.shape === "star" ? "⭐ " + t("graph.fusionCreative") : selectedMemo.shape === "triangle" ? "🔺 " + t("graph.fusionTech") : "💎 " + t("graph.fusionBusiness")}
                  </Badge>
                )}
                <Badge style={{ backgroundColor: getNodeColor(selectedMemo) + "20", color: getNodeColor(selectedMemo) }}>
                  {selectedMemo.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {selectedMemo.connectionCount || 0} {t("graph.connections")}
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

              {selectedMemo.isFusion && selectedMemo.parentMemoIds && (
                <>
                  <Separator />
                  <p className="text-[10px] text-muted-foreground font-medium">{t("graph.fusionParents")}</p>
                  <div className="space-y-1">
                    {selectedMemo.parentMemoIds.map((pid) => {
                      const parent = graphData.nodes.find((n) => n.id === pid);
                      return parent ? (
                        <button
                          key={pid}
                          onClick={() => setSelectedMemo(parent)}
                          className="block w-full text-left text-[11px] text-blue-400 hover:text-blue-300 hover:underline truncate"
                        >
                          → {parent.title}
                        </button>
                      ) : null;
                    })}
                  </div>
                </>
              )}

              <Separator />

              <p className="text-[10px] text-muted-foreground">
                {new Date(selectedMemo.created_at).toLocaleString("ja-JP")}
              </p>

              {!selectedMemo.isFusion ? (
                <a href={`/memo/${selectedMemo.id}`}>
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    {t("graph.viewDetail")}
                  </Button>
                </a>
              ) : (
                <button
                  onClick={() => deleteFusion(selectedMemo.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t("graph.deleteFusion")}
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
