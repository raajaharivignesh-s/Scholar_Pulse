"use client";
import React, { useState, useMemo } from "react";
import { CitationNode, CitationEdge, CitationSummary, downloadBibTeX } from "../lib/api";

interface CitationGraphProps {
  nodes: CitationNode[];
  edges: CitationEdge[];
  summary?: CitationSummary;
  projectId?: string;
  onAskPaper?: (title: string) => void;
}

export default function CitationGraph({
  nodes,
  edges,
  summary,
  projectId,
  onAskPaper
}: CitationGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"TIMELINE" | "NETWORK">("TIMELINE");
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCluster, setSelectedCluster] = useState<string>("ALL");
  const [activeBottomTab, setActiveBottomTab] = useState<"LEADERBOARD" | "READING_PATH" | "NETWORK_METRICS">("LEADERBOARD");
  const [hoveredEdgeIdx, setHoveredEdgeIdx] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Map nodes for O(1) lookups
  const nodeMap = useMemo(() => {
    const map = new Map<number, CitationNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  // Chronological bounds
  const years = useMemo(() => {
    return nodes
      .map((n) => n.year)
      .filter((y): y is number => typeof y === "number" && y > 1900 && y <= 2030);
  }, [nodes]);

  const minYear = years.length > 0 ? Math.min(...years) : 2020;
  const maxYear = years.length > 0 ? Math.max(...years) : 2024;

  // Selected & Hovered Nodes
  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;
  const hoveredNode = hoveredNodeId ? nodeMap.get(hoveredNodeId) : null;

  // Connected neighbors
  const { citingThis, citedByThis, allConnectedIds } = useMemo(() => {
    const focusId = selectedNodeId || hoveredNodeId;
    if (!focusId) {
      return { citingThis: [], citedByThis: [], allConnectedIds: new Set<number>() };
    }
    const citing: CitationNode[] = [];
    const cited: CitationNode[] = [];
    const connected = new Set<number>([focusId]);

    edges.forEach((e) => {
      if (e.target === focusId) {
        // e.source is citing this paper (or predecessor)
        const src = nodeMap.get(e.source);
        if (src) {
          citing.push(src);
          connected.add(src.id);
        }
      } else if (e.source === focusId) {
        // this paper is cited by e.target (subsequent work)
        const tgt = nodeMap.get(e.target);
        if (tgt) {
          cited.push(tgt);
          connected.add(tgt.id);
        }
      }
    });

    return { citingThis: citing, citedByThis: cited, allConnectedIds: connected };
  }, [selectedNodeId, hoveredNodeId, edges, nodeMap]);

  // Color mapping by research cluster
  const getClusterColor = (cluster?: string) => {
    switch (cluster) {
      case "Foundational Roots":
        return "#818CF8"; // Radiant Indigo
      case "Core Architecture":
        return "#06B6D4"; // Cyan
      case "Empirical Benchmarks":
        return "#10B981"; // Emerald
      case "Frontier Extensions":
        return "#F59E0B"; // Amber
      default:
        return "#A78BFA"; // Violet
    }
  };

  // Node radius based on in-degree and influence
  const getNodeRadius = (node: CitationNode) => {
    const base = 22;
    const bonus = Math.min(14, ((node.in_degree || 0) * 4) + ((node.influence_score || 50) > 85 ? 4 : 0));
    return base + bonus;
  };

  // Copy BibTeX helper
  const handleCopyBibTeX = (node: CitationNode) => {
    const authorLastName = node.authors
      ? node.authors.split(",")[0].trim().split(" ").pop()?.toLowerCase() || "author"
      : "author";
    const citeKey = `${authorLastName}${node.year || 2024}_${node.id}`;
    const bibtex = `@article{${citeKey},
  title     = {${node.title}},
  author    = {${node.authors || "Unknown"}},
  year      = {${node.year || 2024}},
  ${node.doi ? `doi       = {${node.doi}},` : ""}
  publisher = {ScholarPulse Research Library}
}`;
    navigator.clipboard.writeText(bibtex).then(() => {
      setToastMessage(`Copied BibTeX citation for "${node.title.slice(0, 30)}..."`);
      setTimeout(() => setToastMessage(null), 3500);
    });
  };

  if (!nodes || nodes.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: "center", padding: "64px 24px", margin: "20px 0" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px", opacity: 0.7 }}>🌐</div>
        <h3 style={{ fontSize: "1.4rem", marginBottom: "8px" }}>No Citation Network Built Yet</h3>
        <p className="muted" style={{ maxWidth: "480px", margin: "0 auto 20px", fontSize: "0.92rem", lineHeight: "1.6" }}>
          Upload PDF research papers to generate automatic citation links, chronological lineage DAGs, and co-citation mapping.
        </p>
      </div>
    );
  }

  // Filtered nodes based on search and cluster
  const filteredNodes = nodes.filter((n) => {
    const matchesSearch =
      !searchQuery.trim() ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.doi && n.doi.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCluster = selectedCluster === "ALL" || n.cluster === selectedCluster;
    return matchesSearch && matchesCluster;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  // Time ruler ticks for Timeline Mode
  const yearTicks = useMemo(() => {
    if (minYear === maxYear) return [minYear];
    const ticks = [];
    const step = Math.max(1, Math.round((maxYear - minYear) / 4));
    for (let y = minYear; y <= maxYear; y += step) {
      ticks.push(y);
    }
    if (!ticks.includes(maxYear)) ticks.push(maxYear);
    return ticks;
  }, [minYear, maxYear]);

  // Landmark paper determination
  const landmarkPaper = useMemo(() => {
    return [...nodes].sort((a, b) => (b.in_degree || 0) - (a.in_degree || 0) || (b.influence_score || 0) - (a.influence_score || 0))[0];
  }, [nodes]);

  // Topologically sorted reading priority
  const readingPath = useMemo(() => {
    return [...nodes].sort((a, b) => {
      // Foundational (early year & high in_degree) first
      if ((a.year || 9999) !== (b.year || 9999)) {
        return (a.year || 9999) - (b.year || 9999);
      }
      return (b.in_degree || 0) - (a.in_degree || 0);
    });
  }, [nodes]);

  return (
    <div style={{ display: "grid", gap: "22px" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className="animate-fade-in"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "rgba(16, 185, 129, 0.95)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "10px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
            zIndex: 9999,
            fontWeight: 600,
            fontSize: "0.88rem",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Top 4 Key Research KPI Metrics Ribbon */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "14px" }}>
        {/* Metric 1: Landmark Anchor Paper */}
        <div className="glass-panel" style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--accent-amber)", letterSpacing: "0.06em" }}>
              👑 SEMINAL ANCHOR
            </span>
            <span className="badge-pill badge-amber" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
              Score: {landmarkPaper?.influence_score || 95}/100
            </span>
          </div>
          <div style={{ fontSize: "0.98rem", fontWeight: 700, color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {landmarkPaper?.title || "Foundational Paper"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Cited by <strong>{landmarkPaper?.in_degree || 0} downstream paper(s)</strong> in project
          </div>
        </div>

        {/* Metric 2: Network Connectivity & Density */}
        <div className="glass-panel" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--accent-cyan)", letterSpacing: "0.06em" }}>
              🕸️ NETWORK DENSITY
            </span>
            <span className="badge-pill badge-cyan" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
              {edges.length} Active Citations
            </span>
          </div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#ffffff" }}>
            {summary?.network_density ? `${Math.round(summary.network_density * 100)}%` : `${edges.length > 0 ? "High" : "Sparse"}`}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Avg. <strong>{summary?.avg_citations_per_paper || (edges.length / Math.max(1, nodes.length)).toFixed(1)} citations</strong> per document
          </div>
        </div>

        {/* Metric 3: Chronological Horizon */}
        <div className="glass-panel" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--accent-emerald)", letterSpacing: "0.06em" }}>
              📅 TIME HORIZON
            </span>
            <span className="badge-pill badge-emerald" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
              {maxYear - minYear > 0 ? `${maxYear - minYear} Years` : "Single Era"}
            </span>
          </div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffffff" }}>
            {minYear} <span style={{ color: "var(--accent-emerald)" }}>──►</span> {maxYear}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Spans from foundational baselines to recent models
          </div>
        </div>

        {/* Metric 4: Research Clusters */}
        <div className="glass-panel" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--accent-indigo)", letterSpacing: "0.06em" }}>
              🧬 RESEARCH CLUSTERS
            </span>
            <span className="badge-pill badge-primary" style={{ fontSize: "0.72rem", padding: "2px 8px" }}>
              {nodes.length} Nodes
            </span>
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "6px" }}>
            {["Foundational", "Architecture", "Benchmarks"].map((cl, i) => (
              <span key={i} style={{ fontSize: "0.72rem", padding: "2px 6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "#CBD5E1" }}>
                {cl}
              </span>
            ))}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "6px" }}>
            Multi-document co-citation mapping active
          </div>
        </div>
      </div>

      {/* Main Interactive Graph Panel */}
      <div className="glass-panel" style={{ padding: "24px 28px", position: "relative", overflow: "hidden" }}>
        {/* Controls Toolbar: Search, Filters, View Modes, and Zoom */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "14px", marginBottom: "18px" }}>
          {/* Left: View Mode Toggle */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.8)", padding: "4px", borderRadius: "10px", border: "1px solid var(--glass-border)" }}>
              <button
                onClick={() => setViewMode("TIMELINE")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  borderRadius: "7px",
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "TIMELINE" ? "var(--primary)" : "transparent",
                  color: viewMode === "TIMELINE" ? "#ffffff" : "var(--text-muted)",
                  transition: "all 0.2s ease"
                }}
              >
                🕒 Chronological Timeline DAG
              </button>
              <button
                onClick={() => setViewMode("NETWORK")}
                style={{
                  padding: "6px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  borderRadius: "7px",
                  border: "none",
                  cursor: "pointer",
                  background: viewMode === "NETWORK" ? "var(--primary)" : "transparent",
                  color: viewMode === "NETWORK" ? "#ffffff" : "var(--text-muted)",
                  transition: "all 0.2s ease"
                }}
              >
                🌐 Cluster Network View
              </button>
            </div>

            {/* Cluster Era Filter */}
            <select
              value={selectedCluster}
              onChange={(e) => setSelectedCluster(e.target.value)}
              className="auth-input"
              style={{ width: "auto", padding: "6px 12px", fontSize: "0.82rem", height: "36px" }}
            >
              <option value="ALL">All Research Clusters</option>
              <option value="Foundational Roots">Foundational Roots</option>
              <option value="Core Architecture">Core Architecture</option>
              <option value="Empirical Benchmarks">Empirical Benchmarks</option>
              <option value="Frontier Extensions">Frontier Extensions</option>
            </select>
          </div>

          {/* Right: Search Input & Zoom Controls */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search paper, author, DOI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="auth-input"
              style={{ width: "220px", padding: "6px 12px", fontSize: "0.82rem", height: "36px" }}
            />
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                className="ghost"
                style={{ padding: "6px 10px", fontSize: "0.8rem", height: "36px" }}
                onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.6))}
                title="Zoom In"
              >
                🔍+
              </button>
              <button
                className="ghost"
                style={{ padding: "6px 10px", fontSize: "0.8rem", height: "36px" }}
                onClick={() => setZoomLevel((z) => Math.max(z - 0.15, 0.75))}
                title="Zoom Out"
              >
                🔍-
              </button>
              <button
                className="ghost"
                style={{ padding: "6px 10px", fontSize: "0.8rem", height: "36px" }}
                onClick={() => { setZoomLevel(1); setSelectedNodeId(null); setSearchQuery(""); setSelectedCluster("ALL"); }}
                title="Reset Canvas"
              >
                ↺ Reset
              </button>
            </div>
          </div>
        </div>

        {/* Graph Legend & Information Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600 }}>Color Legend:</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#818CF8", display: "inline-block" }}></span>
              Foundational Roots
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#06B6D4", display: "inline-block" }}></span>
              Core Architecture
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#10B981", display: "inline-block" }}></span>
              Empirical Benchmarks
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#F59E0B", display: "inline-block" }}></span>
              Frontier Extensions
            </span>
          </div>
          <div>
            <span>💡 <em>Click any paper to isolate citation paths • Hover connection lines for relationship details</em></span>
          </div>
        </div>

        {/* SVG Graph Viewport */}
        <div
          style={{
            overflow: "hidden",
            background: "radial-gradient(ellipse at center, rgba(14, 23, 42, 0.92) 0%, rgba(7, 11, 22, 0.98) 100%)",
            borderRadius: "14px",
            border: "1px solid var(--glass-border-glow)",
            padding: "18px 14px 14px",
            position: "relative",
            minHeight: "490px"
          }}
        >
          <svg
            viewBox="0 0 920 490"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "520px",
              transform: `scale(${zoomLevel})`,
              transition: "transform 0.25s ease",
              userSelect: "none"
            }}
          >
            <defs>
              <filter id="nodeHalo" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="arrowGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Timeline Horizontal Year Axis (Visible in Timeline Mode) */}
            {viewMode === "TIMELINE" && (
              <g opacity="0.8">
                {/* Horizontal time line */}
                <line x1="80" y1="52" x2="840" y2="52" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1.5" strokeDasharray="4 4" />
                
                {/* Milestone Year Ticks & Guidelines */}
                {yearTicks.map((yr, idx) => {
                  const tickX = minYear === maxYear ? 460 : 110 + ((yr - minYear) / Math.max(1, maxYear - minYear)) * 700;
                  return (
                    <g key={idx}>
                      <line x1={tickX} y1="44" x2={tickX} y2="60" stroke="#06B6D4" strokeWidth="2" />
                      <line x1={tickX} y1="60" x2={tickX} y2="455" stroke="rgba(255, 255, 255, 0.04)" strokeDasharray="3 3" />
                      <text x={tickX} y="36" fill="#06B6D4" fontSize="11" fontWeight="700" textAnchor="middle">
                        {yr}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Connection Edges */}
            {edges.map((edge, idx) => {
              const srcNode = nodeMap.get(edge.source);
              const tgtNode = nodeMap.get(edge.target);
              if (!srcNode || !tgtNode) return null;

              const srcRadius = getNodeRadius(srcNode);
              const tgtRadius = getNodeRadius(tgtNode);

              const sx0 = viewMode === "TIMELINE" ? (srcNode.timeline_x ?? srcNode.x ?? 110) : (srcNode.x ?? 460);
              const sy0 = viewMode === "TIMELINE" ? (srcNode.timeline_y ?? srcNode.y ?? 245) : (srcNode.y ?? 245);
              const tx0 = viewMode === "TIMELINE" ? (tgtNode.timeline_x ?? tgtNode.x ?? 810) : (tgtNode.x ?? 460);
              const ty0 = viewMode === "TIMELINE" ? (tgtNode.timeline_y ?? tgtNode.y ?? 245) : (tgtNode.y ?? 245);

              const isFocus = selectedNodeId !== null || hoveredNodeId !== null;
              const focusId = selectedNodeId || hoveredNodeId;
              const isDirectlyConnected = edge.source === focusId || edge.target === focusId;
              const isDimmed = isFocus && !isDirectlyConnected;

              // Distance & direction vector between nodes
              const dx = tx0 - sx0;
              const dy = ty0 - sy0;

              // Organic Bézier control points with fanned departures
              let cx1: number, cy1: number, cx2: number, cy2: number;
              if (viewMode === "TIMELINE") {
                const curveCurvature = Math.max(45, Math.abs(dx) * 0.42);
                // Fan out departure based on vertical direction to avoid bundle clutter
                const fanOffset = dy * 0.22;
                cx1 = sx0 + curveCurvature;
                cy1 = sy0 + fanOffset;
                cx2 = tx0 - curveCurvature;
                cy2 = ty0 - dy * 0.08;
              } else {
                const midX = (sx0 + tx0) / 2;
                const midY = (sy0 + ty0) / 2;
                const perpX = -dy * 0.16;
                const perpY = dx * 0.16;
                cx1 = midX + perpX;
                cy1 = midY + perpY;
                cx2 = midX + perpX;
                cy2 = midY + perpY;
              }

              // Calculate outgoing angle from source node perimeter
              const uVx = cx1 - sx0;
              const uVy = cy1 - sy0;
              const uLen = Math.hypot(uVx, uVy) || 1;
              const sx = sx0 + (srcRadius + 1.5) * (uVx / uLen);
              const sy = sy0 + (srcRadius + 1.5) * (uVy / uLen);

              // Calculate incoming angle toward target node perimeter
              const vVx = tx0 - cx2;
              const vVy = ty0 - cy2;
              const vLen = Math.hypot(vVx, vVy) || 1;
              const angleDeg = Math.atan2(vVy, vVx) * (180 / Math.PI);

              // Terminate path and position arrowhead flush at target node perimeter
              const tipX = tx0 - (tgtRadius + 1.5) * (vVx / vLen);
              const tipY = ty0 - (tgtRadius + 1.5) * (vVy / vLen);

              const pathData = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tipX} ${tipY}`;

              // Position label dynamically at midpoint of curve
              const labelT = 0.50;
              const oneMinusT = 1 - labelT;
              const lx =
                Math.pow(oneMinusT, 3) * sx +
                3 * Math.pow(oneMinusT, 2) * labelT * cx1 +
                3 * oneMinusT * Math.pow(labelT, 2) * cx2 +
                Math.pow(labelT, 3) * tipX;
              const ly =
                Math.pow(oneMinusT, 3) * sy +
                3 * Math.pow(oneMinusT, 2) * labelT * cy1 +
                3 * oneMinusT * Math.pow(labelT, 2) * cy2 +
                Math.pow(labelT, 3) * tipY;

              const isEdgeHovered = hoveredEdgeIdx === idx;
              const isHighlighted = isDirectlyConnected || isEdgeHovered;
              const edgeColor = isHighlighted ? "#10B981" : "rgba(99, 102, 241, 0.4)";
              const arrowColor = isHighlighted ? "#10B981" : "#06B6D4";

              const labelText = `${edge.label || "Citation"}${edge.context ? ` • ${edge.context}` : ""}`;
              const badgeWidth = Math.max(76, labelText.length * 5.8 + 22);

              return (
                <g
                  key={idx}
                  opacity={isDimmed ? 0.08 : isHighlighted ? 1 : 0.4}
                  style={{ transition: "opacity 0.2s ease", cursor: "pointer" }}
                  onMouseEnter={() => setHoveredEdgeIdx(idx)}
                  onMouseLeave={() => setHoveredEdgeIdx(null)}
                >
                  {/* Invisible wide hitbox for effortless cursor interaction */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="18"
                  />

                  {/* Visible Curved Connection Path */}
                  <path
                    d={pathData}
                    fill="none"
                    stroke={edgeColor}
                    strokeWidth={isHighlighted ? "2.8" : "1.5"}
                    strokeDasharray={isHighlighted ? "none" : "3 3"}
                    filter={isHighlighted ? "url(#arrowGlow)" : undefined}
                  />

                  {/* High-Precision Direct Arrowhead */}
                  <path
                    d="M -9 -4.5 L 0 0 L -9 4.5 L -6.5 0 Z"
                    fill={arrowColor}
                    transform={`translate(${tipX}, ${tipY}) rotate(${angleDeg})`}
                    filter={isHighlighted ? "url(#arrowGlow)" : undefined}
                  />

                  {/* Interactive Floating Hover Tooltip: Appears on hover */}
                  {isEdgeHovered && (
                    <g transform={`translate(${lx}, ${ly - 14})`} style={{ pointerEvents: "none" }}>
                      <rect
                        x={-badgeWidth / 2}
                        y="-11"
                        width={badgeWidth}
                        height="22"
                        rx="11"
                        fill="rgba(11, 19, 43, 0.96)"
                        stroke="#10B981"
                        strokeWidth="1.2"
                        filter="drop-shadow(0 4px 12px rgba(0,0,0,0.85))"
                      />
                      <text
                        x="0"
                        y="3.5"
                        fill="#34D399"
                        fontSize="9"
                        fontWeight="700"
                        textAnchor="middle"
                        letterSpacing="0.03em"
                      >
                        {labelText}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Paper Nodes */}
            {nodes.map((node) => {
              const nx = viewMode === "TIMELINE" ? (node.timeline_x ?? node.x ?? 110) : (node.x ?? 460);
              const ny = viewMode === "TIMELINE" ? (node.timeline_y ?? node.y ?? 245) : (node.y ?? 245);

              const isSelected = selectedNodeId === node.id;
              const isHovered = hoveredNodeId === node.id;
              const isNeighbor = allConnectedIds.has(node.id) && (selectedNodeId !== null || hoveredNodeId !== null);
              const isDimmed = (selectedNodeId !== null || hoveredNodeId !== null) && !isSelected && !isNeighbor;
              const isFilteredOut = !filteredNodeIds.has(node.id);

              const clusterColor = getClusterColor(node.cluster);
              const radius = getNodeRadius(node);
              const isLandmark = landmarkPaper?.id === node.id;

              const titleSnippet = node.title.length > 22 ? node.title.slice(0, 20) + "…" : node.title;

              return (
                <g
                  key={node.id}
                  transform={`translate(${nx}, ${ny})`}
                  onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  style={{ cursor: "pointer", transition: "transform 0.2s ease, opacity 0.25s ease" }}
                  opacity={isFilteredOut ? 0.15 : isDimmed ? 0.2 : 1}
                >
                  {/* Outer Pulsing Halo for Selected or Landmark */}
                  {(isSelected || isLandmark) && (
                    <circle
                      r={radius + 12}
                      fill={isLandmark ? "rgba(245, 158, 11, 0.18)" : "rgba(6, 182, 212, 0.2)"}
                      stroke={isLandmark ? "#F59E0B" : "#06B6D4"}
                      strokeWidth="2"
                      filter="url(#nodeHalo)"
                    />
                  )}

                  {/* Core Node Disc */}
                  <circle
                    r={radius}
                    fill="#0B132B"
                    stroke={isSelected ? "#FFFFFF" : clusterColor}
                    strokeWidth={isSelected ? "3.5" : isLandmark ? "3" : "2"}
                  />

                  {/* Landmark Crown Indicator */}
                  {isLandmark && (
                    <text fill="#F59E0B" fontSize="12" textAnchor="middle" dy="-26" fontWeight="900">
                      👑
                    </text>
                  )}

                  {/* Node Center: Year */}
                  <text fill="#FFFFFF" fontSize="11" textAnchor="middle" dy="4" fontWeight="800">
                    {node.year || "PDF"}
                  </text>

                  {/* Bottom Title Label */}
                  <text
                    fill={isSelected ? "#06B6D4" : isNeighbor ? "#34D399" : "#E2E8F0"}
                    fontSize="10"
                    textAnchor="middle"
                    dy={radius + 14}
                    fontWeight={isSelected || isNeighbor ? "800" : "600"}
                  >
                    {titleSnippet}
                  </text>

                  {/* Role Subtitle Badge */}
                  <text
                    fill={clusterColor}
                    fontSize="8"
                    textAnchor="middle"
                    dy={radius + 25}
                    fontWeight="700"
                    opacity="0.9"
                  >
                    {node.key_role || node.cluster}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Quick Floating Hover Tooltip */}
          {hoveredNode && !selectedNode && (
            <div
              className="animate-fade-in"
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "rgba(15, 23, 42, 0.94)",
                border: `1px solid ${getClusterColor(hoveredNode.cluster)}`,
                padding: "14px 18px",
                borderRadius: "12px",
                maxWidth: "320px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                pointerEvents: "none",
                zIndex: 20
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: getClusterColor(hoveredNode.cluster) }}>
                  {hoveredNode.key_role}
                </span>
                <span className="badge-pill badge-primary" style={{ fontSize: "0.7rem", padding: "1px 6px" }}>
                  Year: {hoveredNode.year || "N/A"}
                </span>
              </div>
              <strong style={{ fontSize: "0.9rem", color: "#ffffff", display: "block", marginBottom: "4px" }}>
                {hoveredNode.title}
              </strong>
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: "6px" }}>
                👥 {hoveredNode.authors || "Unknown Authors"}
              </div>
              <div style={{ display: "flex", gap: "10px", fontSize: "0.74rem", color: "#E2E8F0" }}>
                <span>⚡ Influence: <strong>{hoveredNode.influence_score || 50}/100</strong></span>
                <span>🔗 Citations: <strong>{hoveredNode.in_degree || 0}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Selected Paper Minimal Card */}
        {selectedNode && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: "20px",
              padding: "20px 24px",
              borderRadius: "14px",
              background: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.35)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <span className="badge-pill badge-cyan">
                SELECTED PAPER
              </span>
              <button
                className="icon-button"
                onClick={() => setSelectedNodeId(null)}
                style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "#fff", cursor: "pointer", padding: "4px 10px", borderRadius: "6px", fontSize: "0.82rem" }}
                title="Close"
              >
                ✕ Close
              </button>
            </div>

            <h3 style={{ fontSize: "1.18rem", margin: "0 0 16px 0", color: "#ffffff", lineHeight: "1.45", fontWeight: 700 }}>
              {selectedNode.title}
            </h3>

            {onAskPaper && (
              <button
                className="auth-submit-btn"
                style={{ width: "auto", padding: "9px 20px", fontSize: "0.86rem", display: "inline-flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                onClick={() => onAskPaper(selectedNode.title)}
              >
                <span>🤖</span> Ask AI Copilot About This Paper
              </button>
            )}
          </div>
        )}
      </div>

      {/* Advanced Citation Analytics Tabs (Below Graph) */}
      <div className="glass-panel" style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => setActiveBottomTab("LEADERBOARD")}
              className={`ghost ${activeBottomTab === "LEADERBOARD" ? "active" : ""}`}
              style={{
                fontWeight: 700,
                fontSize: "0.85rem",
                borderBottom: activeBottomTab === "LEADERBOARD" ? "2px solid var(--accent-cyan)" : "none",
                color: activeBottomTab === "LEADERBOARD" ? "#ffffff" : "var(--text-muted)"
              }}
            >
              🏆 Influential Papers Leaderboard
            </button>
            <button
              onClick={() => setActiveBottomTab("READING_PATH")}
              className={`ghost ${activeBottomTab === "READING_PATH" ? "active" : ""}`}
              style={{
                fontWeight: 700,
                fontSize: "0.85rem",
                borderBottom: activeBottomTab === "READING_PATH" ? "2px solid var(--accent-cyan)" : "none",
                color: activeBottomTab === "READING_PATH" ? "#ffffff" : "var(--text-muted)"
              }}
            >
              🗺️ Recommended Reading Order
            </button>
            <button
              onClick={() => setActiveBottomTab("NETWORK_METRICS")}
              className={`ghost ${activeBottomTab === "NETWORK_METRICS" ? "active" : ""}`}
              style={{
                fontWeight: 700,
                fontSize: "0.85rem",
                borderBottom: activeBottomTab === "NETWORK_METRICS" ? "2px solid var(--accent-cyan)" : "none",
                color: activeBottomTab === "NETWORK_METRICS" ? "#ffffff" : "var(--text-muted)"
              }}
            >
              📊 Bibliographic Insights
            </button>
          </div>

          {projectId && (
            <button
              className="ghost"
              style={{ fontSize: "0.82rem", padding: "6px 14px", border: "1px solid var(--glass-border)" }}
              onClick={() => downloadBibTeX(projectId)}
            >
              📥 Export All Citations (.bib)
            </button>
          )}
        </div>

        {/* Tab 1: Leaderboard Table */}
        {activeBottomTab === "LEADERBOARD" && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--text-muted)", textAlign: "left" }}>
                  <th style={{ padding: "10px" }}>Rank</th>
                  <th style={{ padding: "10px" }}>Paper Title</th>
                  <th style={{ padding: "10px" }}>Year</th>
                  <th style={{ padding: "10px" }}>Internal Citations</th>
                  <th style={{ padding: "10px" }}>Influence Score</th>
                  <th style={{ padding: "10px" }}>Role</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...nodes]
                  .sort((a, b) => (b.in_degree || 0) - (a.in_degree || 0) || (b.influence_score || 0) - (a.influence_score || 0))
                  .map((paper, idx) => (
                    <tr
                      key={paper.id}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.05)",
                        background: selectedNodeId === paper.id ? "rgba(6, 182, 212, 0.08)" : "transparent"
                      }}
                    >
                      <td style={{ padding: "12px 10px", fontWeight: 700, color: idx === 0 ? "var(--accent-amber)" : "#ffffff" }}>
                        {idx === 0 ? "👑 #1" : `#${idx + 1}`}
                      </td>
                      <td style={{ padding: "12px 10px", fontWeight: 600, color: "#ffffff", maxWidth: "340px" }}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {paper.title}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {paper.authors || "Unknown Authors"}
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px", color: "var(--text-muted)" }}>
                        {paper.year || "N/A"}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <span className="badge-pill badge-cyan" style={{ fontSize: "0.75rem" }}>
                          {paper.in_degree || 0} citations
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "70px", height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${paper.influence_score || 50}%`,
                                height: "100%",
                                background: idx === 0 ? "var(--accent-amber)" : "var(--accent-emerald)"
                              }}
                            />
                          </div>
                          <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>{paper.influence_score || 50}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <span style={{ fontSize: "0.76rem", color: getClusterColor(paper.cluster), fontWeight: 600 }}>
                          {paper.key_role}
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                          <button
                            className="ghost"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={() => setSelectedNodeId(paper.id)}
                          >
                            Inspect
                          </button>
                          <button
                            className="ghost"
                            style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                            onClick={() => handleCopyBibTeX(paper)}
                          >
                            BibTeX
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Recommended Reading Order */}
        {activeBottomTab === "READING_PATH" && (
          <div style={{ display: "grid", gap: "12px" }}>
            <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "8px" }}>
              Our topological algorithm maps your literature from foundational seminal roots to modern benchmarks to maximize comprehension:
            </p>
            {readingPath.map((paper, idx) => (
              <div
                key={paper.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  flexWrap: "wrap",
                  gap: "10px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "50%",
                      background: idx === 0 ? "rgba(245, 158, 11, 0.2)" : "rgba(6, 182, 212, 0.15)",
                      color: idx === 0 ? "var(--accent-amber)" : "var(--accent-cyan)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.82rem"
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <strong style={{ fontSize: "0.92rem", color: "#ffffff", display: "block" }}>
                      {paper.title}
                    </strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Year {paper.year || "N/A"} • {paper.key_role} • {paper.authors || "Unknown"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className="badge-pill badge-primary" style={{ fontSize: "0.72rem" }}>
                    {idx === 0 ? "Step 1: Read Seminal Roots" : idx < readingPath.length - 1 ? "Step 2: Core Architecture" : "Step 3: State of the Art"}
                  </span>
                  <button
                    className="ghost"
                    style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                    onClick={() => setSelectedNodeId(paper.id)}
                  >
                    Focus Graph
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Detailed Bibliographic Insights */}
        {activeBottomTab === "NETWORK_METRICS" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            <div style={{ padding: "18px", borderRadius: "12px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
              <span className="badge-pill badge-primary" style={{ marginBottom: "8px" }}>📌 FOUNDATIONAL ANCHOR</span>
              <strong style={{ fontSize: "0.95rem", display: "block", color: "#ffffff", margin: "6px 0 4px" }}>
                {landmarkPaper?.title}
              </strong>
              <p className="muted" style={{ fontSize: "0.82rem", margin: 0, lineHeight: "1.5" }}>
                Serves as the chronological baseline for your workspace. Subsequent papers cite its core methodologies and benchmark their results against its findings.
              </p>
            </div>

            <div style={{ padding: "18px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
              <span className="badge-pill badge-emerald" style={{ marginBottom: "8px" }}>📈 RESEARCH EVOLUTION</span>
              <strong style={{ fontSize: "0.95rem", display: "block", color: "#ffffff", margin: "6px 0 4px" }}>
                Chronological Model Horizon ({minYear} → {maxYear})
              </strong>
              <p className="muted" style={{ fontSize: "0.82rem", margin: 0, lineHeight: "1.5" }}>
                Spans across {maxYear - minYear + 1} publication years, mapping the transition from initial theoretical proofs to modern high-performance implementations.
              </p>
            </div>

            <div style={{ padding: "18px", borderRadius: "12px", background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.25)" }}>
              <span className="badge-pill badge-cyan" style={{ marginBottom: "8px" }}>⚡ CO-CITATION SYNTHESIS</span>
              <strong style={{ fontSize: "0.95rem", display: "block", color: "#ffffff", margin: "6px 0 4px" }}>
                {edges.length} Active Reference Paths
              </strong>
              <p className="muted" style={{ fontSize: "0.82rem", margin: 0, lineHeight: "1.5" }}>
                All documents form an interconnected citation chain, enabling the AI Research Agent to synthesize cross-document findings and verify citations.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
