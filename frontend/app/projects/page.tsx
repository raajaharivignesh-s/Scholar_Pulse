"use client";
import { FormEvent, useEffect, useState } from "react";
import { createProject, getProjects, logout, Project } from "../../lib/api";
import { useRouter } from "next/navigation";

export default function Projects() {
  const r = useRouter();
  const [ps, setPs] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [n, setN] = useState("");
  const [d, setD] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("sp_token")) {
      r.replace("/login");
      return;
    }
    getProjects().then(setPs).catch((e) => setErr(e.message));
  }, [r]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const p = await createProject({ name: n, description: d, research_question: q });
      setPs((x) => [p, ...x]);
      setN("");
      setD("");
      setQ("");
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to create project";
      setErr(msg);
      if (msg.includes("Authentication") || msg.includes("token") || msg.includes("User not found")) {
        setTimeout(() => r.replace("/login"), 1500);
      }
    }
  }

  const applyPreset = (title: string, desc: string, question: string) => {
    setN(title);
    setD(desc);
    setQ(question);
  };

  const filteredProjects = ps.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s));
  });

  return (
    <main className="workspace">
      {/* Top Header Navigation */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">✨</div>
          <div>
            <span>Scholar</span>
            <span className="accent">Pulse</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="ghost" style={{ fontSize: "0.85rem" }} onClick={() => { logout(); r.replace("/login"); }}>
            🔒 Sign out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <section className="content">
        {/* Page Banner */}
        <div className="page-heading">
          <div>
            <div className="eyebrow" style={{ marginBottom: "6px" }}>
              <span>● RESEARCH WORKSTATION</span>
            </div>
            <h1>Academic Research Projects</h1>
            <p className="muted">
              Organize paper libraries, run hybrid retrieval queries, and synthesize insights.
            </p>
          </div>
          <button className="primary" style={{ padding: "12px 22px", fontSize: "0.95rem" }} onClick={() => setOpen(true)}>
            ✨ + New Project
          </button>
        </div>

        {/* Global Workspace Metrics Bar */}
        <div className="metric-grid">
          <div className="metric">
            <span>ACTIVE WORKSPACES</span>
            <strong>{ps.length}</strong>
            <p>Configured research domains</p>
          </div>
          <div className="metric">
            <span>SEARCH HYBRID RETRIEVER</span>
            <strong>BM25 + RRF</strong>
            <p>Reciprocal Rank Fusion active</p>
          </div>
          <div className="metric">
            <span>AI SYNTHESIS AGENT</span>
            <strong>Active</strong>
            <p>Paper citation copilot ready</p>
          </div>
        </div>

        {/* Search Bar for Projects */}
        <div style={{ marginBottom: "24px" }}>
          <input
            placeholder="🔍 Search projects by title or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "420px" }}
          />
        </div>

        {err && <div className="error" style={{ marginBottom: "20px" }}>{err}</div>}

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "12px" }}>📚</div>
            <h2 style={{ marginBottom: "8px" }}>Start Your Research Journey</h2>
            <p className="muted" style={{ maxWidth: "460px", margin: "0 auto 24px" }}>
              Create a focused research workspace for your papers, research question, and citations graph.
            </p>
            <button className="primary" onClick={() => setOpen(true)}>
              + Create First Project
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {filteredProjects.map((p) => (
              <div
                className="project-card"
                key={p.id}
                onClick={() => r.push(`/projects/${p.id}`)}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span className="badge-pill badge-cyan">PROJECT #{p.id}</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-subtle)" }}>
                      {new Date(p.created_at || Date.now()).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.3rem", marginBottom: "8px", color: "#ffffff" }}>{p.name}</h3>
                  <p className="muted" style={{ fontSize: "0.88rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {p.description || "No description provided yet."}
                  </p>
                </div>

                <div style={{ marginTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.82rem", color: "var(--accent-cyan)", fontWeight: 700 }}>
                    Open Workspace →
                  </span>
                  <span className="badge-pill badge-primary">AI Ready</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* New Project Modal */}
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <form className="modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span className="eyebrow">NEW RESEARCH DOMAIN</span>
                <h2 style={{ marginTop: "4px" }}>Create Research Workspace</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setOpen(false)}>✕</button>
            </div>

            {err && (
              <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#fca5a5", padding: "10px 14px", borderRadius: "8px", fontSize: "0.88rem" }}>
                {err}
              </div>
            )}

            {/* Quick Presets */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="chip-label" style={{ display: "block", marginBottom: "8px" }}>Or choose a topic template:</span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="action-chip"
                  onClick={() => applyPreset("Transformer Architectures", "Evaluating multi-head attention models", "What are key advancements in transformer efficiency?")}
                >
                  🤖 Transformers NLP
                </button>
                <button
                  type="button"
                  className="action-chip"
                  onClick={() => applyPreset("Cognitive Load UX", "Investigating interface ergonomics", "How does layout density affect user decision velocity?")}
                >
                  🧠 Cognitive Load UI
                </button>
              </div>
            </div>

            <label>
              Project Name
              <input
                placeholder="e.g. LLM Reasoning Benchmarks"
                value={n}
                onChange={(e) => setN(e.target.value)}
                required
              />
            </label>

            <label>
              Description
              <textarea
                placeholder="Brief summary of research scope..."
                value={d}
                onChange={(e) => setD(e.target.value)}
                rows={2}
              />
            </label>

            <label>
              Research Question
              <textarea
                placeholder="e.g. What are the key empirical tradeoffs between dense and sparse attention mechanisms?"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                rows={3}
              />
            </label>

            <div className="modal-actions">
              <button type="button" className="ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className="primary">Create Workspace</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
