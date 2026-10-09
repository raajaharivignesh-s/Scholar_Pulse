"use client";
import React, { useState } from "react";
import { CitationNode, CitationEdge } from "../lib/api";

interface CitationGraphProps {
  nodes: CitationNode[];
  edges: CitationEdge[];
}

export default function CitationGraph({ nodes, edges }: CitationGraphProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [filterType, setFilterType] = useState<string>("ALL");

  if (!nodes || nodes.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: "center", padding: "60px 20px", margin: "20px 0" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "12px", opacity: 0.6 }}>🌐</div>
        <h3 style={{ marginBottom: "8px" }}>No Citation Links Built Yet</h3>
        <p className="muted" style={{ maxWidth: "460px", margin: "0 auto" }}>
          Upload PDF research papers to generate automatic citation graph nodes, reference edges, and co-citation mapping.
        </p>
      </div>
    );
  }

  const nodeMap = new Map<number, CitationNode>();
  nodes.forEach((node) => nodeMap.set(node.id, node));

  const selectedNode = selectedNodeId ? nodeMap.get(selectedNodeId) : null;

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "PROCESSED":
        return "#10B981"; // Emerald
      case "PROCESSING":
        return "#06B6D4"; // Cyan
      case "QUEUED":
        return "#F59E0B"; // Amber
      default:
        return "#6366F1"; // Primary Indigo
    }
  };

  // Compute citation graph metrics & insights
  const sortedByYear = [...nodes].sort((a, b) => (a.year || 0) - (b.year || 0));
  const oldest = sortedByYear.find((n) => n.year) || nodes[0];
  const newest = sortedByYear[sortedByYear.length - 1] || nodes[0];
  const avgDegree = nodes.length > 0 ? (edges.length * 2 / nodes.length).toFixed(1) : "0";

  // Find connected neighbors for selected node
  const connectedNeighbors = selectedNodeId
    ? edges
        .filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
        .map((e) => (e.source === selectedNodeId ? nodeMap.get(e.target) : nodeMap.get(e.source)))
        .filter(Boolean) as CitationNode[]
    : [];

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <div className="glass-panel" style={{ padding: "28px", position: "relative", overflow: "hidden" }}>
        {/* Header Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--accent-cyan)", marginBottom: "4px" }}>
              <span>● CO-CITATION MAPPER & NETWORK ANALYSIS</span>
            </div>
            <h3 style={{ fontSize: "1.35rem" }}>Interactive Citation Network</h3>
            <p className="muted" style={{ fontSize: "0.86rem", margin: "4px 0 0" }}>
              Visualizing document reference relationships, co-citation paths, and chronological research lineage.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span className="badge-pill badge-emerald">
              ● {nodes.length} Nodes • {edges.length} Edges
            </span>
            <button className="ghost" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => setZoomLevel((z) => Math.min(z + 0.15, 1.5))}>
              🔍 Zoom In
            </button>
            <button className="ghost" style={{ padding: "6px 12px", fontSize: "0.8rem" }} onClick={() => setZoomLevel(1)}>
              ↺ Reset
            </button>
          </div>
        </div>

        {/* SVG Graph View */}
        <div style={{ overflow: "hidden", background: "rgba(7, 11, 22, 0.75)", borderRadius: "14px", border: "1px solid var(--glass-border-glow)", padding: "12px" }}>
          <svg viewBox="0 0 660 410" style={{ width: "100%", height: "auto", maxHeight: "450px", transform: `scale(${zoomLevel})`, transition: "transform 0.25s ease" }}>
            <defs>
              <filter id="nodeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#06B6D4" opacity="0.85" />
              </marker>
            </defs>

            {/* Connection Edges */}
            {edges.map((edge, idx) => {
              const source = nodeMap.get(edge.source);
              const target = nodeMap.get(edge.target);
              if (!source || !target) return null;

              const isConnectedToSelected = selectedNodeId === edge.source || selectedNodeId === edge.target;
              const isDimmed = selectedNodeId !== null && !isConnectedToSelected;
              const midX = (source.x! + target.x!) / 2;
              const midY = (source.y! + target.y!) / 2;

              return (
                <g key={idx} opacity={isDimmed ? 0.18 : 1}>
                  <line
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isConnectedToSelected ? "#06B6D4" : "rgba(99, 102, 241, 0.45)"}
                    strokeWidth={isConnectedToSelected ? "3" : "1.5"}
                    strokeDasharray={isConnectedToSelected ? "none" : "4 4"}
                    filter={isConnectedToSelected ? "url(#lineGlow)" : undefined}
                    markerEnd="url(#arrow)"
                  />
                  <text
                    x={midX}
                    y={midY - 6}
                    fill={isConnectedToSelected ? "#06B6D4" : "rgba(255,255,255,0.45)"}
                    fontSize="9"
                    textAnchor="middle"
                    fontWeight="700"
                    style={{ letterSpacing: "0.05em" }}
                  >
                    {edge.label}
                  </text>
                </g>
              );
            })}

            {/* Paper Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isNeighbor = connectedNeighbors.some((n) => n.id === node.id);
              const isDimmed = selectedNodeId !== null && !isSelected && !isNeighbor;
              const statusColor = getStatusColor(node.status);
              const titleSnippet = node.title.length > 20 ? node.title.slice(0, 18) + "..." : node.title;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                  style={{ cursor: "pointer" }}
                  opacity={isDimmed ? 0.25 : 1}
                >
                  {/* Outer Glowing Halo if selected or neighbor */}
                  {(isSelected || isNeighbor) && (
                    <circle
                      r={isSelected ? "36" : "30"}
                      fill={isSelected ? "rgba(6, 182, 212, 0.2)" : "rgba(16, 185, 129, 0.12)"}
                      stroke={isSelected ? "#06B6D4" : "#10B981"}
                      strokeWidth="2"
                      filter="url(#nodeGlow)"
                    />
                  )}

                  {/* Core Node Circle */}
                  <circle r="24" fill="#0E172A" stroke={statusColor} strokeWidth="3" />

                  {/* Year / ID text */}
                  <text fill="#FFFFFF" fontSize="10" textAnchor="middle" dy="-2" fontWeight="800">
                    {node.year || "PDF"}
                  </text>
                  <text fill="rgba(255,255,255,0.6)" fontSize="8" textAnchor="middle" dy="10" fontWeight="600">
                    #{node.id}
                  </text>

                  {/* Title Label */}
                  <text
                    fill={isSelected ? "#06B6D4" : isNeighbor ? "#34D399" : "#E2E8F0"}
                    fontSize="11"
                    textAnchor="middle"
                    dy="42"
                    fontWeight={isSelected || isNeighbor ? "800" : "600"}
                  >
                    {titleSnippet}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Selected Node Details Drawer */}
        {selectedNode && (
          <div
            className="animate-fade-in"
            style={{
              marginTop: "20px",
              padding: "20px",
              borderRadius: "14px",
              background: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.3)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="badge-pill badge-cyan">SELECTED PAPER NODE #{selectedNode.id}</span>
              <button className="icon-button" onClick={() => setSelectedNodeId(null)}>✕</button>
            </div>
            <h4 style={{ fontSize: "1.1rem", margin: "6px 0", color: "#ffffff" }}>{selectedNode.title}</h4>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "8px" }}>
              <span>✍️ <strong>Authors:</strong> {selectedNode.authors || "Unknown"}</span>
              <span>📅 <strong>Publication Year:</strong> {selectedNode.year || "N/A"}</span>
              <span>⚡ <strong>Co-Cited Connections:</strong> {connectedNeighbors.length} connected paper(s)</span>
            </div>

            {connectedNeighbors.length > 0 && (
              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--accent-emerald)", fontWeight: 700, display: "block", marginBottom: "6px" }}>
                  Directly Linked Research Papers:
                </span>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {connectedNeighbors.map((cn) => (
                    <span
                      key={cn.id}
                      onClick={() => setSelectedNodeId(cn.id)}
                      className="badge-pill badge-emerald"
                      style={{ cursor: "pointer" }}
                    >
                      #{cn.id} ({cn.year || "PDF"}): {cn.title.slice(0, 24)}...
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detailed Graph Insights & Analytics Section */}
        <div style={{ marginTop: "28px", paddingTop: "24px", borderTop: "1px solid var(--glass-border)" }}>
          <h4 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "#ffffff" }}>
            📊 Key Insights Derived From Citation Network
          </h4>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {/* Card 1: Foundational Paper */}
            <div style={{ padding: "18px", borderRadius: "14px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className="badge-pill badge-primary">📌 FOUNDATIONAL PAPER</span>
                <span style={{ fontSize: "0.78rem", color: "var(--accent-indigo)" }}>Year: {oldest.year || "Earliest"}</span>
              </div>
              <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: "6px", color: "#ffffff" }}>
                {oldest.title}
              </strong>
              <p className="muted" style={{ fontSize: "0.83rem", margin: 0, lineHeight: "1.5" }}>
                Serves as the chronological baseline for your research library. Subsequent models in your workspace build upon or evaluate against its findings.
              </p>
            </div>

            {/* Card 2: Research Timeline & Evolution */}
            <div style={{ padding: "18px", borderRadius: "14px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className="badge-pill badge-emerald">📈 RESEARCH EVOLUTION</span>
                <span style={{ fontSize: "0.78rem", color: "var(--accent-emerald)" }}>{oldest.year} → {newest.year}</span>
              </div>
              <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: "6px", color: "#ffffff" }}>
                Chronological Model Progression
              </strong>
              <p className="muted" style={{ fontSize: "0.83rem", margin: 0, lineHeight: "1.5" }}>
                Your collection spans <strong>{oldest.year} to {newest.year}</strong>, transitioning from classical TF-IDF baseline classification to BERT transformers and cross-domain generalization.
              </p>
            </div>

            {/* Card 3: Network Co-Citation Density */}
            <div style={{ padding: "18px", borderRadius: "14px", background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className="badge-pill badge-cyan">🕸️ NETWORK DENSITY</span>
                <span style={{ fontSize: "0.78rem", color: "var(--accent-cyan)" }}>{avgDegree} links/node</span>
              </div>
              <strong style={{ fontSize: "0.95rem", display: "block", marginBottom: "6px", color: "#ffffff" }}>
                Co-Citation Connectivity ({nodes.length} Nodes)
              </strong>
              <p className="muted" style={{ fontSize: "0.83rem", margin: 0, lineHeight: "1.5" }}>
                All {nodes.length} papers form a connected reference chain across your domain, enabling the AI Copilot to execute multi-document cross-synthesis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
