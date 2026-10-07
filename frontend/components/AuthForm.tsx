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
    <form className="auth-card" onSubmit={submit}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
        <div className="brand-icon">✨</div>
        <span className="eyebrow">SCHOLARPULSE AI WORKSPACE</span>
      </div>

      <div>
        <h1 style={{ fontSize: "1.85rem", marginBottom: "6px" }}>
          {mode === "login" ? "Welcome back" : "Create Research Workspace"}
        </h1>
        <p className="muted">
          {mode === "login"
            ? "Sign in to access your research papers, citation graphs & AI copilot."
            : "Organize academic papers, run hybrid semantic searches & generate AI synthesis."}
        </p>
      </div>

      {mode === "register" && (
        <label>
          Full Name
          <input
            placeholder="e.g. Dr. Alex Morgan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
      )}

      <label>
        Email Address
        <input
          type="email"
          placeholder="researcher@university.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          placeholder="••••••••••••"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          minLength={8}
          required
        />
      </label>

      {err && <div className="error">{err}</div>}

      <button className="primary" style={{ width: "100%", padding: "14px", fontSize: "1rem", marginTop: "6px" }} disabled={busy}>
        {busy ? "Signing in..." : mode === "login" ? "Sign In →" : "Create Account →"}
      </button>

      <div style={{ textAlign: "center", marginTop: "10px" }}>
        <a className="secondary" style={{ width: "100%", textDecoration: "none" }} href={mode === "login" ? "/register" : "/login"}>
          {mode === "login" ? "Need an account? Register here" : "Already registered? Sign in"}
        </a>
      </div>
    </form>
  );
}