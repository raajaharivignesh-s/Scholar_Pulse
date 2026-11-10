"use client";
import { FormEvent, useState } from "react";
import { login, register } from "../lib/api";
import { useRouter } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const r = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, pw);
      else await register(name, email, pw);
      r.push("/projects");
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Unable to continue");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-container">
      {/* LEFT SIDE: Minimal Academic / Research Visual Hero */}
      <div className="auth-left">
        <div className="auth-left-bg-glow" />
        <div className="auth-left-grid-pattern" />

        {/* Brand Header */}
        <div className="auth-brand-badge">
          <div className="auth-brand-logo-icon">
            $
          </div>
          <span className="auth-brand-name">SCHOLARPULSE</span>
        </div>

        {/* Hero Body */}
        <div className="auth-hero-body">
          <h1 className="auth-hero-title">
            Research smarter.<br />
            <span>Learn deeper.</span>
          </h1>
          <p className="auth-hero-desc">
            Organize your knowledge, explore research, and build deeper understanding in one focused workspace.
          </p>

          {/* Abstract Vector Visual: Citation Network & Knowledge Cards */}
          <div className="auth-visual-card">
            <svg viewBox="0 0 400 160" className="w-full h-auto" style={{ width: "100%", height: "auto" }}>
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="nodeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>

              {/* Connections */}
              <line x1="60" y1="45" x2="180" y2="35" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 2" />
              <line x1="180" y1="35" x2="320" y2="60" stroke="url(#lineGrad)" strokeWidth="1.5" />
              <line x1="60" y1="45" x2="140" y2="115" stroke="url(#lineGrad)" strokeWidth="1.5" />
              <line x1="140" y1="115" x2="320" y2="60" stroke="url(#lineGrad)" strokeWidth="1.5" strokeDasharray="4 2" />
              <line x1="180" y1="35" x2="240" y2="125" stroke="url(#lineGrad)" strokeWidth="1.5" />

              {/* Mock Paper Cards */}
              <g transform="translate(40, 20)">
                <rect x="0" y="0" width="110" height="50" rx="8" fill="#1e293b" fillOpacity="0.9" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <rect x="12" y="12" width="60" height="6" rx="3" fill="#60a5fa" />
                <rect x="12" y="24" width="86" height="4" rx="2" fill="#64748b" />
                <rect x="12" y="32" width="50" height="4" rx="2" fill="#475569" />
              </g>

              <g transform="translate(250, 40)">
                <rect x="0" y="0" width="120" height="56" rx="8" fill="#1e293b" fillOpacity="0.9" stroke="rgba(99, 102, 241, 0.4)" strokeWidth="1" />
                <rect x="12" y="12" width="70" height="6" rx="3" fill="#a5b4fc" />
                <rect x="12" y="24" width="96" height="4" rx="2" fill="#64748b" />
                <rect x="12" y="32" width="65" height="4" rx="2" fill="#475569" />
                <circle cx="104" cy="42" r="4" fill="#10b981" />
              </g>

              {/* Graph Nodes */}
              <circle cx="60" cy="45" r="7" fill="url(#nodeGrad)" />
              <circle cx="60" cy="45" r="12" fill="none" stroke="#60a5fa" strokeOpacity="0.3" strokeWidth="2" />

              <circle cx="180" cy="35" r="9" fill="#8b5cf6" />
              <circle cx="140" cy="115" r="6" fill="#3b82f6" />
              <circle cx="240" cy="125" r="8" fill="#06b6d4" />

              <circle cx="320" cy="60" r="7" fill="#6366f1" />
            </svg>

            {/* Feature Pills */}
            <div className="auth-feature-pills" style={{ marginTop: "12px" }}>
              <span className="auth-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Hybrid Semantic Search
              </span>
              <span className="auth-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a5b4fc" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Citation Graphs
              </span>
              <span className="auth-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                AI Synthesis
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="auth-hero-footer">
          <span>&copy; {new Date().getFullYear()} ScholarPulse Inc.</span>
          <span>Academic SaaS Engine v2.4</span>
        </div>
      </div>

      {/* RIGHT SIDE: Clean Authentication Card */}
      <div className="auth-right">
        <div className="auth-card-inner">
          <div className="auth-header">
            <h2 className="auth-title">
              {mode === "login" ? "Welcome back" : "Create Workspace"}
            </h2>
            <p className="auth-subtitle">
              {mode === "login"
                ? "Sign in to access your research papers, citation graphs & AI copilot."
                : "Organize academic papers, run hybrid semantic searches & generate AI synthesis."}
            </p>
          </div>

          <form className="auth-form" onSubmit={submit} noValidate>
            {/* Full Name field for registration */}
            {mode === "register" && (
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="name">Full Name</label>
                <div className="input-icon-group">
                  <span className="input-icon-left">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input
                    id="name"
                    type="text"
                    className="auth-input-field"
                    placeholder="e.g. Dr. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email Address field */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="email">Email Address</label>
              <div className="input-icon-group">
                <span className="input-icon-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  className="auth-input-field"
                  placeholder="researcher@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password field */}
            <div className="auth-field-group">
              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <div className="input-icon-group">
                <span className="input-icon-left">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  className="auth-input-field has-right-icon"
                  placeholder="••••••••••••"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  minLength={8}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  className="pw-toggle-btn"
                  onClick={() => setShowPw(!showPw)}
                  title={showPw ? "Hide password" : "Show password"}
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me / Forgot Password (for Login mode) */}
            {mode === "login" && (
              <div className="auth-options-row">
                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    className="auth-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#forgot"
                  className="auth-forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Please contact your institutional administrator or system support to reset your password.");
                  }}
                >
                  Forgot password?
                </a>
              </div>
            )}

            {/* Error Banner */}
            {err && (
              <div className="auth-error-banner" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{err}</span>
              </div>
            )}

            {/* Submit Button */}
            <button type="submit" className="auth-submit-btn" disabled={busy}>
              {busy ? (
                <>
                  <svg className="spinner-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                  </svg>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Mode Switch Prompt */}
          <div className="auth-switch-prompt">
            {mode === "login" ? (
              <>
                Don't have an account?
                <a href="/register" className="auth-switch-link">
                  Create account
                </a>
              </>
            ) : (
              <>
                Already have an account?
                <a href="/login" className="auth-switch-link">
                  Sign in
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}