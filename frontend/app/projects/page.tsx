"use client";
import { FormEvent, useEffect, useState } from "react";
import { createProject, getProjects, logout, Project, User } from "../../lib/api";
import { useRouter } from "next/navigation";

export default function Projects() {
  const r = useRouter();
  const [ps, setPs] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [n, setN] = useState("");
  const [d, setD] = useState("");
  const [search, setSearch] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("sp_token")) {
      r.replace("/login");
      return;
    }
    const rawUser = localStorage.getItem("sp_user");
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch (x) {
        // ignore parse error
      }
    }
    getProjects().then(setPs).catch((e) => setErr(e.message));
  }, [r]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (profileOpen && !target.closest(".profile-menu-container")) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const p = await createProject({ name: n, description: d });
      setPs((x) => [p, ...x]);
      setN("");
      setD("");
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unable to create project";
      setErr(msg);
      if (msg.includes("Authentication") || msg.includes("token") || msg.includes("User not found")) {
        setTimeout(() => r.replace("/login"), 1500);
      }
    }
  }

  const applyPreset = (title: string, desc: string) => {
    setN(title);
    setD(desc);
  };

  const filteredProjects = ps.filter((p) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return p.name.toLowerCase().includes(s) || (p.description && p.description.toLowerCase().includes(s));
  });

  const userInitial = user?.name?.[0] || user?.email?.[0] || "A";
  const userName = user?.name || "Academic Researcher";
  const userEmail = user?.email || "researcher@scholarpulse.ai";

  return (
    <main className="workspace">
      {/* Top Header Navigation */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="topbar-brand-icon">$</div>
          <div className="topbar-brand-title">
            Scholar<span>Pulse</span>
          </div>
        </div>

        {/* User Profile Avatar & Dropdown Popover */}
        <div className="profile-menu-container">
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
      </header>

      {/* Main Workspace Content */}
      <section className="workspace-content">
        {/* Workspace Banner */}
        <div className="workspace-heading">
          <div className="workspace-title-area">
            <div className="workspace-eyebrow">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="#60a5fa"><circle cx="12" cy="12" r="12"/></svg>
              <span>KNOWLEDGE DASHBOARD</span>
              <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 4px" }}>|</span>
              <span style={{ color: "#94a3b8", fontWeight: 600 }}>{ps.length} Active Workspaces</span>
            </div>
            <h1>Academic Research Projects</h1>
            <p>
              Organize paper libraries, explore citation networks, and synthesize insights across your research domains.
            </p>
          </div>

          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <button
              type="button"
              className="auth-submit-btn"
              style={{ width: "auto", padding: "12px 24px", fontSize: "0.92rem", borderRadius: "12px" }}
              onClick={() => setOpen(true)}
            >
              <span>+ New Project</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>

        {/* Search Bar for Projects */}
        <div className="workspace-search-bar" style={{ maxWidth: "500px" }}>
          <span className="workspace-search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            type="text"
            className="workspace-search-input"
            placeholder="Search projects by title or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {err && (
          <div className="auth-error-banner" role="alert" style={{ marginBottom: "24px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>{err}</span>
          </div>
        )}

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div className="workspace-empty-state">
            <div className="workspace-empty-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <h2 className="workspace-empty-title">Start Your Research Journey</h2>
            <p className="workspace-empty-desc">
              Create a focused research workspace for your papers and citation graphs.
            </p>
            <button
              type="button"
              className="auth-submit-btn"
              style={{ width: "auto", margin: "0 auto", padding: "12px 24px" }}
              onClick={() => setOpen(true)}
            >
              <span>+ Create First Project</span>
            </button>
          </div>
        ) : (
          <div className="workspace-projects-grid">
            {filteredProjects.map((p) => (
              <div
                className="workspace-project-card"
                key={p.id}
                onClick={() => r.push(`/projects/${p.id}`)}
              >
                <div>
                  <div className="workspace-project-header">
                    <span className="workspace-project-tag">PROJECT #{p.id}</span>
                    <span className="workspace-project-date">
                      {new Date(p.created_at || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  <h3 className="workspace-project-title">{p.name}</h3>
                  <p className="workspace-project-desc">
                    {p.description || "No description provided yet for this research domain."}
                  </p>
                </div>

                <div className="workspace-project-footer">
                  <span className="workspace-project-action">
                    <span>Open Workspace</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </span>
                  <span className="workspace-project-status">AI Ready</span>
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
            <div className="modal-header">
              <div>
                <span className="workspace-eyebrow" style={{ marginBottom: "4px" }}>NEW RESEARCH DOMAIN</span>
                <h2 className="modal-title">Create Workspace</h2>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setOpen(false)}>✕</button>
            </div>

            {err && (
              <div className="auth-error-banner" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{err}</span>
              </div>
            )}

            {/* Topic Preset Chips */}
            <div style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="chip-label" style={{ display: "block", marginBottom: "8px", fontSize: "0.72rem" }}>Quick Topic Templates:</span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="auth-pill"
                  style={{ background: "rgba(99, 102, 241, 0.15)", borderColor: "rgba(99, 102, 241, 0.3)", color: "#a5b4fc", cursor: "pointer" }}
                  onClick={() => applyPreset("Transformer Architectures", "Evaluating multi-head attention models")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  Transformers NLP
                </button>
                <button
                  type="button"
                  className="auth-pill"
                  style={{ background: "rgba(6, 182, 212, 0.15)", borderColor: "rgba(6, 182, 212, 0.3)", color: "#67e8f9", cursor: "pointer" }}
                  onClick={() => applyPreset("Cognitive Load UX", "Investigating interface ergonomics")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  Cognitive Load UI
                </button>
              </div>
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="proj-name">Project Name</label>
              <input
                id="proj-name"
                type="text"
                className="auth-input-field"
                placeholder="e.g. LLM Reasoning Benchmarks"
                value={n}
                onChange={(e) => setN(e.target.value)}
                required
              />
            </div>

            <div className="auth-field-group">
              <label className="auth-label" htmlFor="proj-desc">Description</label>
              <textarea
                id="proj-desc"
                className="auth-input-field"
                style={{ height: "auto", minHeight: "85px", padding: "10px 14px" }}
                placeholder="Brief summary of research scope..."
                value={d}
                onChange={(e) => setD(e.target.value)}
                rows={3}
              />
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button
                type="button"
                className="profile-popover-item"
                style={{ width: "auto", padding: "10px 20px", border: "1px solid rgba(255,255,255,0.1)" }}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="auth-submit-btn"
                style={{ width: "auto", padding: "10px 24px" }}
              >
                <span>Create Workspace</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
