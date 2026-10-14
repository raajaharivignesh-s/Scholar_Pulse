"use client";
import { useEffect, useState, useRef, FormEvent } from "react";
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
  User,
  logout
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

  // User profile state
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

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
    const rawUser = localStorage.getItem("sp_user");
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch (err) {
        // ignore parse error
      }
    }
    if (!p || !p.id) return;
    getProject(p.id as string)
      .then(setX)
      .catch((z) => setE(z.message));
    fetchPapers();
  }, [p?.id, r]);

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      const target = ev.target as HTMLElement;
      if (profileOpen && !target.closest(".profile-menu-container")) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

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

  const handleUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (!ev.target.files || ev.target.files.length === 0) return;
    if (!p || !p.id) return;
    setUploading(true);
    for (let i = 0; i < ev.target.files.length; i++) {
      try {
        await uploadPaper(p.id as string, ev.target.files[i]);
      } catch (err: any) {
        alert("Failed to upload " + ev.target.files[i].name + ": " + err.message);
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
      <main className="workspace" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div className="glass-panel" style={{ padding: "40px", textAlign: "center", maxWidth: "480px" }}>
          <div className="auth-error-banner" style={{ marginBottom: "20px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{e}</span>
          </div>
          <button className="auth-submit-btn" style={{ width: "auto", margin: "0 auto", padding: "10px 24px" }} onClick={() => r.push("/projects")}>
            ← Return to Workspaces
          </button>
        </div>
      </main>
    );

  if (!x)
    return (
      <main className="workspace" style={{ display: "grid", placeItems: "center", minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#94a3b8" }}>
          <svg className="spinner-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
          <span style={{ fontWeight: 600 }}>Loading research workspace...</span>
        </div>
      </main>
    );

  const processedCount = papers.filter((pap) => pap.status === "PROCESSED").length;
  const processedPercent = papers.length > 0 ? Math.round((processedCount / papers.length) * 100) : 0;

  const userInitial = user?.name?.[0] || user?.email?.[0] || "A";
  const userName = user?.name || "Academic Researcher";
  const userEmail = user?.email || "researcher@scholarpulse.ai";

  const navItems = [
    {
      key: "Ask",
      label: "AI Copilot",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v3"/>
          <circle cx="12" cy="2" r="1"/>
          <rect x="4" y="8" width="16" height="12" rx="3"/>
          <circle cx="9" cy="13" r="1.2" fill="currentColor"/>
          <circle cx="15" cy="13" r="1.2" fill="currentColor"/>
          <path d="M10 17h4"/>
        </svg>
      )
    },
    {
      key: "Papers",
      label: "PDF Paper Library",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 2H5.5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V7.5L14.5 2z"/>
          <polyline points="14.5 2 14.5 7.5 20 7.5"/>
          <line x1="7.5" y1="13" x2="16.5" y2="13"/>
          <line x1="7.5" y1="17" x2="16.5" y2="17"/>
        </svg>
      )
    },
    {
      key: "Citations",
      label: "Citation Graph",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="5" r="2.5"/>
          <circle cx="5.5" cy="17.5" r="2.5"/>
          <circle cx="18.5" cy="17.5" r="2.5"/>
          <line x1="10" y1="7" x2="7" y2="15.5"/>
          <line x1="14" y1="7" x2="17" y2="15.5"/>
          <line x1="8" y1="17.5" x2="16" y2="17.5"/>
        </svg>
      )
    },
    {
      key: "Analytics",
      label: "Analytics & Priority",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="9"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
          <line x1="3.5" y1="20" x2="20.5" y2="20"/>
        </svg>
      )
    },
    {
      key: "Insights",
      label: "Research Insights",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6"/>
          <path d="M10 21h4"/>
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1.55.6 2.87 1.5 3.5.76.76 1.23 1.52 1.41 2.5"/>
        </svg>
      )
    },
    {
      key: "Compare",
      label: "Matrix Compare",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="3.5" width="17" height="17" rx="3"/>
          <line x1="3.5" y1="12" x2="20.5" y2="12"/>
          <line x1="12" y1="3.5" x2="12" y2="20.5"/>
        </svg>
      )
    }
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
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div className="topbar-brand" onClick={() => r.push("/projects")} style={{ cursor: "pointer" }}>
            <div className="topbar-brand-icon">$</div>
            <div className="topbar-brand-title">
              Scholar<span>Pulse</span>
            </div>
          </div>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "1.2rem" }}>/</span>
          <span style={{ fontSize: "0.88rem", color: "#94a3b8", fontWeight: 600, maxWidth: "240px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {x.name}
          </span>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="auth-submit-btn"
            style={{ width: "auto", padding: "8px 16px", fontSize: "0.82rem", borderRadius: "10px" }}
            onClick={() => r.push("/projects")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            <span>All Workspaces</span>
          </button>

          {/* User Profile Avatar Popover */}
          <div className="profile-menu-container" style={{ marginLeft: "4px" }}>
            <button
              type="button"
              className="profile-trigger-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
              aria-label="User profile menu"
            >
              <div className="profile-avatar">{userInitial}</div>
              <span className="profile-name-label">{userName}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform 0.2s ease", transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {profileOpen && (
              <div className="profile-popover" role="menu">
                <div className="profile-popover-header">
                  <div className="profile-popover-avatar">{userInitial}</div>
                  <div className="profile-popover-info">
                    <div className="profile-popover-name">{userName}</div>
                    <div className="profile-popover-email">{userEmail}</div>
                    <div className="profile-popover-badge">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Academic Researcher
                    </div>
                  </div>
                </div>

                <div className="profile-popover-menu">
                  <button
                    type="button"
                    className="profile-popover-item logout-item"
                    onClick={() => {
                      logout();
                      r.replace("/login");
                    }}
                    role="menuitem"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Studio Shell */}
      <div className="app-shell">
        {/* Navigation Sidebar */}
        <aside className="sidebar">
          <div className="project-mini">
            <span className="workspace-eyebrow" style={{ fontSize: "0.7rem" }}>RESEARCH DOMAIN</span>
            <strong style={{ fontSize: "1.05rem", color: "#ffffff", wordBreak: "break-word" }}>{x.name}</strong>
          </div>

          {navItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                className={"nav-item " + (isActive ? "active" : "")}
                key={item.key}
                onClick={() => setActiveTab(item.key)}
              >
                {isActive && <div className="nav-indicator" />}
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}

          {/* Quick Upload Button in Sidebar */}
          <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <input type="file" multiple accept="application/pdf" ref={fileInputRef} style={{ display: "none" }} onChange={handleUpload} />
            <button
              className="secondary"
              style={{ width: "100%", padding: "11px", fontSize: "0.85rem", borderRadius: "12px", gap: "8px" }}
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>{uploading ? "Uploading PDF..." : "+ Add Research Papers"}</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="workspace-main animate-fade-in">

          {/* Header Metric Cards (Redundant RETRIEVAL ENGINE Card Removed) */}
          <div className="workspace-metric-grid" style={{ marginBottom: "28px" }}>
            <div className="workspace-metric-card">
              <span className="workspace-metric-label">INDEXED PAPERS</span>
              <strong className="workspace-metric-value">{papers.length} Papers</strong>
              <span className="workspace-metric-subtext">{processedCount} fully parsed &amp; chunked</span>
            </div>
            <div className="workspace-metric-card">
              <span className="workspace-metric-label">PROCESSED STATUS</span>
              <strong className="workspace-metric-value" style={{ color: "var(--accent-emerald)" }}>{processedPercent}%</strong>
              <span className="workspace-metric-subtext">Knowledge base readiness</span>
            </div>
          </div>

          {/* Tab 1: AI Copilot & Q&A */}
          {activeTab === "Ask" && (
            <div className="glass-panel" style={{ padding: "32px" }}>
              <div style={{ marginBottom: "20px" }}>
                <span className="workspace-eyebrow" style={{ marginBottom: "6px" }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="#06b6d4"><circle cx="12" cy="12" r="12"/></svg>
                  <span>AI KNOWLEDGE GROUNDED COPILOT</span>
                </span>
                <h2 style={{ fontSize: "1.6rem", marginTop: "4px" }}>Synthesis &amp; Question Answering</h2>
                <p className="muted" style={{ marginTop: "4px" }}>
                  Ask deep research questions across all parsed PDFs with automatic citation mapping.
                </p>
              </div>

              {/* Quick Action Chips */}
              <div className="search-container">
                <div className="quick-chips">
                  <span className="chip-label">Quick Actions:</span>
                  <button
                    className="action-chip"
                    type="button"
                    onClick={() => {
                      const q = "Generate a comprehensive literature review summary across all indexed papers.";
                      setAskQuery(q);
                      handleAsk(q);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    </svg>
                    <span>Literature Review</span>
                  </button>
                  <button
                    className="action-chip"
                    type="button"
                    onClick={() => {
                      const q = "What are the key experimental methodologies and algorithms used in these papers?";
                      setAskQuery(q);
                      handleAsk(q);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
                      <path d="M8.5 2h7"/>
                      <path d="M7 16h10"/>
                    </svg>
                    <span>Extract Methodologies</span>
                  </button>
                  <button
                    className="action-chip"
                    type="button"
                    onClick={() => {
                      const q = "Identify any conflicting findings, contradictory claims, or research gaps across papers.";
                      setAskQuery(q);
                      handleAsk(q);
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    <span>Find Contradictions</span>
                  </button>
                </div>

                {/* Input Query Bar */}
                <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                  <input
                    type="text"
                    value={askQuery}
                    onChange={(ev) => setAskQuery(ev.target.value)}
                    onKeyDown={(ev) => ev.key === "Enter" && handleAsk()}
                    placeholder="Ask a question about methodology, findings, or citations..."
                    style={{ flex: 1, padding: "14px 18px", fontSize: "0.95rem" }}
                  />
                  <button
                    className="auth-submit-btn"
                    style={{ width: "auto", padding: "0 28px", height: "auto" }}
                    onClick={() => handleAsk()}
                    disabled={asking || !askQuery.trim()}
                  >
                    <span>{asking ? "Synthesizing..." : "Ask Agent →"}</span>
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
                      <h4 style={{ marginBottom: "16px", fontSize: "1rem" }}>Cited References &amp; Vector Relevance:</h4>
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
                  <span className="workspace-eyebrow" style={{ marginBottom: "4px" }}>● PAPER MANAGEMENT</span>
                  <h2 style={{ fontSize: "1.6rem", marginTop: "4px" }}>Uploaded Research Papers</h2>
                  <p className="muted" style={{ marginTop: "4px" }}>Showing {filteredPapers.length} of {papers.length} total papers</p>
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  <input type="file" multiple accept="application/pdf" ref={fileInputRef} style={{ display: "none" }} onChange={handleUpload} />
                  <button className="auth-submit-btn" style={{ width: "auto", padding: "10px 24px" }} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                    <span>{uploading ? "Uploading..." : "+ Upload PDF Papers"}</span>
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
                    onChange={(ev) => setSearchFilter(ev.target.value)}
                  />
                </div>

                <div style={{ flex: "0 0 180px" }}>
                  <select value={statusFilter} onChange={(ev) => setStatusFilter(ev.target.value)}>
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
                    onChange={(ev) => setYearMinFilter(ev.target.value)}
                    style={{ width: "100px" }}
                  />
                  <span className="muted">to</span>
                  <input
                    type="number"
                    placeholder="Max Year"
                    value={yearMaxFilter}
                    onChange={(ev) => setYearMaxFilter(ev.target.value)}
                    style={{ width: "100px" }}
                  />
                </div>

                {(searchFilter || statusFilter !== "ALL" || yearMinFilter || yearMaxFilter) && (
                  <button type="button" className="ghost" onClick={resetFilters} style={{ color: "var(--accent-rose)", fontSize: "0.85rem" }}>
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
                <span className="workspace-eyebrow" style={{ marginBottom: "4px" }}>● PRIORITY QUEUE</span>
                <h2 style={{ marginBottom: "16px", fontSize: "1.6rem", marginTop: "4px" }}>Recommended Reading Order</h2>
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
              <span className="workspace-eyebrow" style={{ marginBottom: "4px" }}>● SYNTHESIZED INSIGHTS</span>
              <h2 style={{ marginBottom: "20px", fontSize: "1.6rem", marginTop: "4px" }}>Key Findings &amp; Gaps</h2>
              {insights ? (
                <div style={{ display: "grid", gap: "20px" }}>
                  <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                    <h4 style={{ color: "var(--accent-emerald)", marginBottom: "10px" }}>Domain Overview</h4>
                    <p style={{ lineHeight: "1.6" }}>{insights.overview || "Parsing research insights across document chunks..."}</p>
                  </div>
                  <div style={{ padding: "20px", borderRadius: "14px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                    <h4 style={{ color: "var(--accent-amber)", marginBottom: "10px" }}>Open Questions &amp; Research Gaps</h4>
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
              <span className="workspace-eyebrow" style={{ marginBottom: "4px" }}>● METHODOLOGY MATRIX</span>
              <h2 style={{ marginBottom: "20px", fontSize: "1.6rem", marginTop: "4px" }}>Cross-Paper Comparison</h2>
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
              <div className="modal" onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: "660px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="badge-pill badge-cyan">[{selectedSnippet.doc_label || "Ref"}] Source Excerpt</span>
                  <button type="button" className="modal-close-btn" onClick={() => setSelectedSnippet(null)}>✕</button>
                </div>
                <h3 style={{ fontSize: "1.2rem" }}>{selectedSnippet.title}</h3>
                <p className="muted" style={{ fontSize: "0.85rem" }}>
                  Authors: {selectedSnippet.authors || "Unknown"} • RRF Score: {selectedSnippet.rrf_score}
                </p>
                <div style={{ padding: "18px", background: "rgba(7, 11, 22, 0.8)", borderRadius: "12px", border: "1px solid var(--glass-border)", lineHeight: "1.65", fontSize: "0.92rem", color: "#f1f5f9" }}>
                  "{selectedSnippet.snippet}"
                </div>
                <div className="modal-actions">
                  <button type="button" className="profile-popover-item" style={{ width: "auto", padding: "8px 20px" }} onClick={() => setSelectedSnippet(null)}>Close Excerpt</button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
