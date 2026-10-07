"use client";
import { useEffect, useState, useRef } from "react";
import {
  getProject,
  Project,
  getPapers,
  Paper,
  uploadPaper,
  askQuestion,
  getAnalytics,
  Analytics,
  getInsights,
  Insights,
  getReadingPriority,
  PriorityPaper,
  comparePapers,
  ComparisonItem,
  getCitations,
  Citations,
  downloadMarkdownReport,
  downloadBibTeX
} from "../../../lib/api";
import CitationGraph from "../../../components/CitationGraph";
import { useParams, useRouter } from "next/navigation";

export default function Workspace() {
  const p = useParams();
  const r = useRouter();
  const [x, setX] = useState<Project | null>(null);
  const [e, setE] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("Ask");
  const [askQuery, setAskQuery] = useState("");
  const [askResult, setAskResult] = useState<{ answer: string; sources: any[] } | null>(null);
  const [asking, setAsking] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<any | null>(null);

  // Advanced data states
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [priorityPapers, setPriorityPapers] = useState<PriorityPaper[]>([]);
  const [comparisonMatrix, setComparisonMatrix] = useState<ComparisonItem[]>([]);
  const [citations, setCitations] = useState<Citations | null>(null);
  const [loadingTabData, setLoadingTabData] = useState(false);

  // Dynamic filter states
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [yearMinFilter, setYearMinFilter] = useState("");
  const [yearMaxFilter, setYearMaxFilter] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPapers = async () => {
    if (!p || !p.id) return;
    try {
      const data = await getPapers(p.id as string);
      setPapers(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const filteredPapers = papers.filter((paper) => {
    if (statusFilter !== "ALL" && paper.status !== statusFilter) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchTitle = paper.title?.toLowerCase().includes(q);
      const matchAuthors = paper.authors?.toLowerCase().includes(q);
      const matchDoi = paper.doi?.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthors && !matchDoi) return false;
    }
    const minY = parseInt(yearMinFilter, 10);
    if (!isNaN(minY) && paper.year && paper.year < minY) return false;
    const maxY = parseInt(yearMaxFilter, 10);
    if (!isNaN(maxY) && paper.year && paper.year > maxY) return false;
    return true;
  });

  const resetFilters = () => {
    setSearchFilter("");
    setStatusFilter("ALL");
    setYearMinFilter("");
    setYearMaxFilter("");
  };

  useEffect(() => {
    if (!localStorage.getItem("sp_token")) {
      r.replace("/login");
      return;
    }
    if (!p || !p.id) return;
    getProject(p.id as string)
      .then(setX)
      .catch((z) => setE(z.message));
    fetchPapers();
  }, [p?.id, r]);

  // Polling paper processing status
  useEffect(() => {
    const hasPending = papers.some((paper) => paper.status === "QUEUED" || paper.status === "PROCESSING");
    if (!hasPending) return;
    const interval = setInterval(() => { fetchPapers(); }, 3000);
    return () => clearInterval(interval);
  }, [papers, p?.id]);

  // Tab Data Fetching
  useEffect(() => {
    if (!p || !p.id) return;
    const pid = p.id as string;
    setLoadingTabData(true);

    if (activeTab === "Analytics" || activeTab === "Overview") {
      getAnalytics(pid).then(setAnalytics).catch(console.error);
      getReadingPriority(pid).then(setPriorityPapers).catch(console.error);
    }
    if (activeTab === "Insights") {
      getInsights(pid).then(setInsights).catch(console.error);
    }
    if (activeTab === "Compare") {
      comparePapers(pid).then((res) => setComparisonMatrix(res.matrix)).catch(console.error);
    }
    if (activeTab === "Citations") {
      getCitations(pid).then(setCitations).catch(console.error);
    }
    setLoadingTabData(false);
  }, [activeTab, p?.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!p || !p.id) return;
    setUploading(true);
    for (let i = 0; i < e.target.files.length; i++) {
      try {
        await uploadPaper(p.id as string, e.target.files[i]);
      } catch (err: any) {
        alert("Failed to upload " + e.target.files[i].name + ": " + err.message);
      }
    }
    await fetchPapers();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAsk = async (queryToAsk?: string) => {
    const query = queryToAsk || askQuery;
    if (!query.trim() || !p || !p.id) return;
    setAsking(true);
    setAskResult(null);
    try {
      const res = await askQuestion(p.id as string, query);
      setAskResult(res);
    } catch (err: any) {
      alert("Failed to ask: " + err.message);
    }
    setAsking(false);
  };

  if (e)
    return (
      <main className="workspace center-state">
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
          <h2>{e}</h2>
          <button className="primary" style={{ marginTop: "16px" }} onClick={() => r.push("/projects")}>
            Back to projects
          </button>
        </div>
      </main>
    );

  if (!x) return <main className="workspace center-state">Loading project workspace...</main>;

  const processedCount = papers.filter((pap) => pap.status === "PROCESSED").length;
  const processedPercent = papers.length > 0 ? Math.round((processedCount / papers.length) * 100) : 0;

  const navItems = [
    { key: "Ask", label: "AI Copilot & Q&A", icon: "🤖" },
    { key: "Papers", label: "PDF Paper Library", icon: "📑" },
    { key: "Citations", label: "Citation Graph", icon: "🕸️" },
    { key: "Analytics", label: "Analytics & Priority", icon: "📊" },
    { key: "Insights", label: "Research Insights", icon: "💡" },
    { key: "Compare", label: "Matrix Compare", icon: "⚖️" }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return <span className="badge-pill badge-emerald">✓ PROCESSED</span>;
      case "PROCESSING":
        return <span className="badge-pill badge-cyan" style={{ animation: "pulseGlow 1.8s infinite" }}>⚙ PROCESSING...</span>;
      case "QUEUED":
        return <span className="badge-pill badge-amber">⏳ QUEUED</span>;
      default:
        return <span className="badge-pill" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#F43F5E", border: "1px solid rgba(244, 63, 94, 0.3)" }}>✖ {status}</span>;
    }
  };

  return (
    <main className="workspace">
      {/* Top Studio Header */}
      <header className="topbar">
        <div className="brand" onClick={() => r.push("/projects")} style={{ cursor: "pointer" }}>
          <div className="brand-icon">✨</div>
          <div>
            <span>Scholar</span>
            <span className="accent">Pulse</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="ghost" style={{ fontSize: "0.85rem" }} onClick={() => p?.id && downloadMarkdownReport(p.id as string)}>
            📥 Export Report (.md)
          </button>
          <button className="ghost" style={{ fontSize: "0.85rem" }} onClick={() => p?.id && downloadBibTeX(p.id as string)}>
            📚 Export BibTeX (.bib)
          </button>
          <button className="primary" style={{ padding: "8px 16px", fontSize: "0.85rem" }} onClick={() => r.push("/projects")}>
            ← All Workspaces
          </button>
        </div>
      </header>

      {/* Main Studio Shell */}
      <div className="app-shell">
        {/* Navigation Sidebar */}
        <aside className="sidebar">
          <div className="project-mini">
            <span className="eyebrow">RESEARCH DOMAIN</span>
            <strong>{x.name}</strong>
          </div>

          {navItems.map((item) => (
            <button
              className={"nav-item " + (activeTab === item.key ? "active" : "")}
              key={item.key}
              onClick={() => setActiveTab(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}

          {/* Quick Upload Button in Sidebar */}
          <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid var(--glass-border)" }}>
            <input type="file" multiple accept="application/pdf" ref={fileInputRef} style={{ display: "none" }} onChange={handleUpload} />
            <button
              className="secondary"
              style={{ width: "100%", padding: "10px", fontSize: "0.85rem" }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading PDF..." : "⚡ + Add Research Papers"}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="workspace-main animate-fade-in">
          {/* Header Metric Cards */}
          <div className="metric-grid">
            <div className="metric">
              <span>INDEXED PAPERS</span>
              <strong>{papers.length} Papers</strong>
              <p>{processedCount} fully parsed & chunked</p>
            </div>
            <div className="metric">
              <span>RETRIEVAL ENGINE</span>
              <strong>Dense + Lexical</strong>
              <p>Qdrant Vectors + BM25 RRF</p>
            </div>
            <div className="metric">
              <span>PROCESSED STATUS</span>
              <strong style={{ color: "var(--accent-emerald)" }}>{processedPercent}%</strong>
              <p>Knowledge base readiness</p>
            </div>
          </div>

          {/* Tab 1: AI Copilot & Q&A */}
          {activeTab === "Ask" && (
            <div className="glass-panel" style={{ padding: "32px" }}>
              <div style={{ marginBottom: "20px" }}>
                <span className="eyebrow" style={{ marginBottom: "6px" }}>
                  <span>● AI KNOWLEDGE GROUNDED COPILOT</span>
                </span>
                <h2>Synthesis & Question Answering</h2>
                <p className="muted">
                  Ask deep research questions across all parsed PDFs with automatic citation mapping.
                </p>
              </div>

              {/* Quick Action Chips */}
              <div className="search-container">
                <div className="quick-chips">
                  <span className="chip-label">Quick Actions:</span>
                  <button
                    className="action-chip"
                    onClick={() => {
                      const q = "Generate a comprehensive literature review summary across all indexed papers.";
                      setAskQuery(q);
                      handleAsk(q);
                    }}
                  >
                    ✨ Literature Review
                  </button>
                  <button
                    className="action-chip"
                    onClick={() => {
                      const q = "What are the key experimental methodologies and algorithms used in these papers?";
                      setAskQuery(q);
                      handleAsk(q);
                    }}
                  >
                    🔬 Extract Methodologies
                  </button>
                  <button
                    className="action-chip"
                    onClick={() => {
                      const q = "Identify any conflicting findings, contradictory claims, or research gaps across papers.";
                      setAskQuery(q);
                      handleAsk(q);
                    }}
                  >
                    ⚡ Find Contradictions
                  </button>
                </div>

                {/* Input Query Bar */}
                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <input
                    type="text"
                    value={askQuery}
                    onChange={(e) => setAskQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                    placeholder="Ask a question about methodology, findings, or citations..."
                    style={{ flex: 1, padding: "14px 18px", fontSize: "0.98rem" }}
                  />
                  <button
                    className="primary"
                    style={{ padding: "14px 24px" }}
                    onClick={() => handleAsk()}
                    disabled={asking || !askQuery.trim()}
                  >
                    {asking ? "Synthesizing..." : "Ask Agent →"}
                  </button>
                </div>
              </div>

              {/* Answer Render */}
              {askResult && (
                <div className="animate-fade-in" style={{ marginTop: "32px", padding: "28px", borderRadius: "16px", background: "rgba(10, 16, 30, 0.75)", border: "1px solid var(--glass-border-glow)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <span className="badge-pill badge-cyan">🤖 SCHOLARPULSE CO-PILOT RESPONSE</span>
                  </div>

                  <div style={{ whiteSpace: "pre-line", lineHeight: "1.75", fontSize: "1rem", color: "#f1f5f9" }}>
                    {askResult.answer}
                  </div>

                  {/* Cited Sources */}
                  {askResult.sources && askResult.sources.length > 0 && (
                    <div style={{ marginTop: "30px", paddingTop: "24px", borderTop: "1px solid var(--glass-border)" }}>
                      <h4 style={{ marginBottom: "16px", fontSize: "1rem" }}>Cited References & Vector Relevance:</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" }}>
                        {askResult.sources.map((s, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedSnippet(s)}
                            className="glass-panel-hover"
                            style={{
                              padding: "16px",
                              borderRadius: "12px",
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid var(--glass-border)",
                              cursor: "pointer"
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                              <span className="badge-pill badge-primary">[{s.doc_label || `Ref ${idx + 1}`}]</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontWeight: 700 }}>
                                RRF: {s.rrf_score}
                              </span>
                            </div>
                            <strong style={{ fontSize: "0.92rem", display: "block", marginBottom: "6px", color: "#ffffff" }}>
                              {s.title}
                            </strong>
                            <p className="muted" style={{ fontSize: "0.82rem", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              "{s.snippet}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: PDF Paper Library */}
          {activeTab === "Papers" && (
            <div className="glass-panel" style={{ padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
                <div>
                  <span className="eyebrow" style={{ marginBottom: "4px" }}>● PAPER MANAGEMENT</span>
                  <h2>Uploaded Research Papers</h2>
                  <p className="muted">Showing {filteredPapers.length} of {papers.length} total papers</p>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <input type="file" multiple accept="application/pdf" ref={fileInputRef} style={{ display: "none" }} onChange={handleUpload} />
                  <button className="primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    {uploading ? "Uploading..." : "+ Upload PDF Papers"}
                  </button>
                </div>
              </div>

              {/* Dynamic Filter Controls */}
              <div className="glass-panel" style={{ padding: "18px", marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", background: "rgba(10, 16, 30, 0.5)" }}>
                <div style={{ flex: "1 1 240px" }}>
                  <input
                    type="text"
                    placeholder="🔍 Search title, author, DOI..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                  />
                </div>

                <div style={{ flex: "0 0 180px" }}>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="ALL">All Statuses</option>
                    <option value="PROCESSED">✓ PROCESSED</option>
                    <option value="PROCESSING">⚙ PROCESSING</option>
                    <option value="QUEUED">⏳ QUEUED</option>
                    <option value="FAILED">✖ FAILED</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="number"
                    placeholder="Min Year"
                    value={yearMinFilter}
                    onChange={(e) => setYearMinFilter(e.target.value)}
                    style={{ width: "100px" }}
                  />
                  <span className="muted">to</span>
                  <input
                    type="number"
                    placeholder="Max Year"
                    value={yearMaxFilter}
                    onChange={(e) => setYearMaxFilter(e.target.value)}
                    style={{ width: "100px" }}
                  />
                </div>

                {(searchFilter || statusFilter !== "ALL" || yearMinFilter || yearMaxFilter) && (
                  <button className="ghost" onClick={resetFilters} style={{ color: "var(--accent-rose)", fontSize: "0.85rem" }}>
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Papers Grid/List */}
              {filteredPapers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px" }}>
                  <p className="muted">No research papers match your filter criteria.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gap: "14px" }}>
                  {filteredPapers.map((paper) => (
                    <div
                      key={paper.id}
                      className="glass-panel-hover"
                      style={{
                        padding: "20px 24px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--glass-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "20px"
                      }}
                    >
                      <div>
                        <h4 style={{ fontSize: "1.1rem", marginBottom: "6px", color: "#ffffff" }}>{paper.title || "Untitled Document"}</h4>
                        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {paper.authors && <span>👥 {paper.authors}</span>}
                          {paper.year && <span>📅 {paper.year}</span>}
                          {paper.doi && <span>🔗 DOI: {paper.doi}</span>}
                          <span>Uploaded {new Date(paper.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div>{getStatusBadge(paper.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Citation Graph */}
          {activeTab === "Citations" && (
            citations ? (
              <CitationGraph nodes={citations.nodes} edges={citations.edges} />
            ) : (
              <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
                <p className="muted">Building interactive citation network...</p>
              </div>
            )
          )}

          {/* Tab 4: Analytics & Reading Priority */}
          {activeTab === "Analytics" && (
            <div style={{ display: "grid", gap: "24px" }}>
              <div className="glass-panel" style={{ padding: "32px" }}>
                <span className="eyebrow" style={{ marginBottom: "4px" }}>● PRIORITY QUEUE</span>
                <h2 style={{ marginBottom: "16px" }}>Recommended Reading Order</h2>
                <div style={{ display: "grid", gap: "14px" }}>
                  {priorityPapers.map((item, idx) => (
                    <div key={idx} className="glass-panel" style={{ padding: "20px", background: "rgba(255,255,255,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span className="badge-pill badge-cyan">RANK #{idx + 1} • PRIORITY {item.priority_score || 95}</span>
                        <span style={{ fontSize: "0.8rem", color: "var(--accent-emerald)" }}>{item.status}</span>
                      </div>
                      <h4 style={{ fontSize: "1.05rem", margin: "4px 0 8px" }}>{item.title}</h4>
                      <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Research Insights */}
          {activeTab === "Insights" && (
            <div className="glass-panel" style={{ padding: "32px" }}>
              <span className="eyebrow" style={{ marginBottom: "4px" }}>● SYNTHESIZED INSIGHTS</span>
              <h2 style={{ marginBottom: "20px" }}>Key Findings & Gaps</h2>
              {insights ? (
                <div style={{ display: "grid", gap: "20px" }}>
                  <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                    <h4 style={{ color: "var(--accent-emerald)", marginBottom: "10px" }}>Domain Overview</h4>
                    <p style={{ lineHeight: "1.6" }}>{insights.overview || "Parsing research insights across document chunks..."}</p>
                  </div>
                  <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                    <h4 style={{ color: "var(--accent-amber)", marginBottom: "10px" }}>Open Questions & Research Gaps</h4>
                    {Array.isArray(insights.research_gaps) ? (
                      <ul style={{ margin: 0, paddingLeft: "20px", lineHeight: "1.6" }}>
                        {insights.research_gaps.map((gap, gIdx) => (
                          <li key={gIdx}>{gap}</li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ lineHeight: "1.6" }}>{insights.research_gaps || "Identifying open methodology questions..."}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="muted">Generating domain insights...</p>
              )}
            </div>
          )}

          {/* Tab 6: Matrix Comparison */}
          {activeTab === "Compare" && (
            <div className="glass-panel" style={{ padding: "32px" }}>
              <span className="eyebrow" style={{ marginBottom: "4px" }}>● METHODOLOGY MATRIX</span>
              <h2 style={{ marginBottom: "20px" }}>Cross-Paper Comparison</h2>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--accent-cyan)" }}>
                      <th style={{ padding: "14px" }}>Paper Title</th>
                      <th style={{ padding: "14px" }}>Methodology</th>
                      <th style={{ padding: "14px" }}>Key Finding</th>
                      <th style={{ padding: "14px" }}>Dataset / Benchmark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonMatrix.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "14px", fontWeight: 700, color: "#ffffff" }}>{item.title}</td>
                        <td style={{ padding: "14px" }}>{item.methodology || "N/A"}</td>
                        <td style={{ padding: "14px" }}>{item.key_findings || "N/A"}</td>
                        <td style={{ padding: "14px" }}>{item.limitations || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Snippet Drawer Modal */}
          {selectedSnippet && (
            <div className="modal-backdrop" onClick={() => setSelectedSnippet(null)}>
              <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "660px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="badge-pill badge-cyan">[{selectedSnippet.doc_label || "Ref"}] Source Excerpt</span>
                  <button className="icon-button" onClick={() => setSelectedSnippet(null)}>✕</button>
                </div>
                <h3 style={{ fontSize: "1.2rem" }}>{selectedSnippet.title}</h3>
                <p className="muted" style={{ fontSize: "0.85rem" }}>
                  Authors: {selectedSnippet.authors || "Unknown"} • RRF Score: {selectedSnippet.rrf_score}
                </p>
                <div style={{ padding: "18px", background: "rgba(7, 11, 22, 0.8)", borderRadius: "12px", border: "1px solid var(--glass-border)", lineHeight: "1.65", fontSize: "0.92rem", color: "#f1f5f9" }}>
                  "{selectedSnippet.snippet}"
                </div>
                <div className="modal-actions">
                  <button className="secondary" onClick={() => setSelectedSnippet(null)}>Close Excerpt</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
