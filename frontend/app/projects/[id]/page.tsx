"use client";
import { useEffect, useState, useRef, FormEvent } from "react";
import {
  getProject,
  Project,
  getPapers,
  Paper,
  uploadPaper,
  askQuestion,
  askQuestionStream,
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
  logout,
  openPaperPdf
} from "../../../lib/api";
import CitationGraph from "../../../components/CitationGraph";
import { useParams, useRouter } from "next/navigation";

interface ChatMessage {
  id: string;
  sender: "user" | "copilot";
  text: string;
  timestamp: string;
  mode?: "turbo" | "deep";
  sources?: any[];
  isStreaming?: boolean;
}

function renderInlineTokens(text: string): React.ReactNode {
  if (!text) return "";
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[(?:Doc|Paper)\s+[^\]]+\]|\[Paper\s+\d+\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={key++}
          style={{
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "0.84rem",
            color: "#38bdf8",
            fontFamily: "monospace",
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={key++} style={{ color: "#ffffff", fontWeight: 700 }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={key++} style={{ color: "#a5b4fc", fontStyle: "italic" }}>
          {token.slice(1, -1)}
        </em>
      );
    } else if ((token.startsWith("[Doc") || token.startsWith("[Paper")) && token.endsWith("]")) {
      parts.push(
        <span
          key={key++}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "1px 6px",
            borderRadius: "4px",
            fontSize: "0.74rem",
            fontWeight: 700,
            background: "rgba(99, 102, 241, 0.18)",
            color: "#a5b4fc",
            border: "1px solid rgba(99, 102, 241, 0.35)",
            margin: "0 2px",
            whiteSpace: "nowrap",
          }}
        >
          {token}
        </span>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function renderFormattedMessage(text: string, isStreaming?: boolean): React.ReactNode {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      elements.push(<div key={`empty-${i}`} style={{ height: "8px" }} />);
      continue;
    }

    // 1. Horizontal Rule: --- or ***
    if (line === "---" || line === "***") {
      elements.push(
        <div
          key={`hr-${i}`}
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.4), transparent)",
            margin: "14px 0",
          }}
        />
      );
      continue;
    }

    // 1b. Markdown Table Detection
    if (line.startsWith("|") && line.endsWith("|") && i + 1 < lines.length && lines[i + 1].trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      i--; // Adjust loop counter

      if (tableLines.length >= 2) {
        const parseRow = (r: string) =>
          r
            .split("|")
            .slice(1, -1)
            .map((c) => c.trim());

        const headers = parseRow(tableLines[0]);
        const dataRows = tableLines.slice(2).map(parseRow);

        elements.push(
          <div
            key={`table-${i}`}
            style={{
              overflowX: "auto",
              margin: "16px 0",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "rgba(10, 16, 30, 0.75)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "rgba(99, 102, 241, 0.16)", borderBottom: "1px solid rgba(255, 255, 255, 0.12)", color: "var(--accent-cyan)" }}>
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} style={{ padding: "12px 16px", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {renderInlineTokens(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      background: rIdx % 2 === 0 ? "rgba(15, 23, 42, 0.4)" : "transparent",
                    }}
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        style={{
                          padding: "12px 16px",
                          verticalAlign: "top",
                          color: cIdx === 0 ? "#ffffff" : "#cbd5e1",
                          fontWeight: cIdx === 0 ? 600 : 400,
                          lineHeight: "1.55",
                        }}
                      >
                        {renderInlineTokens(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 2. Heading 3: ### Heading
    if (line.startsWith("### ")) {
      const heading = line.slice(4).trim();
      elements.push(
        <div
          key={`h3-${i}`}
          style={{
            marginTop: i === 0 ? "2px" : "18px",
            marginBottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <div
            style={{
              width: "4px",
              height: "18px",
              borderRadius: "2px",
              background: "linear-gradient(to bottom, var(--accent-cyan), var(--primary))",
              flexShrink: 0,
            }}
          />
          <h3
            style={{
              fontSize: "1.12rem",
              fontWeight: 800,
              color: "#ffffff",
              margin: 0,
              letterSpacing: "-0.01em",
            }}
          >
            {renderInlineTokens(heading)}
          </h3>
        </div>
      );
      continue;
    }

    // 3. Heading 4: #### Heading
    if (line.startsWith("#### ")) {
      const heading = line.slice(5).trim();
      elements.push(
        <div
          key={`h4-${i}`}
          style={{
            marginTop: "14px",
            marginBottom: "6px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span style={{ color: "var(--accent-cyan)", fontSize: "0.85rem" }}>▸</span>
          <h4
            style={{
              fontSize: "0.98rem",
              fontWeight: 700,
              color: "#38bdf8",
              margin: 0,
            }}
          >
            {renderInlineTokens(heading)}
          </h4>
        </div>
      );
      continue;
    }

    // 4. Paper Citation Header: **[Doc 1 (...)] Paper Title** or **[Paper 1 (...)] Title**
    const docHeaderMatch = line.match(/^\*\*(\[(?:Doc|Paper)\s+[^\]]+\])\s*(.*?)\*\*$/);
    if (docHeaderMatch) {
      const label = docHeaderMatch[1];
      const title = docHeaderMatch[2];
      elements.push(
        <div
          key={`doc-header-${i}`}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "16px",
            marginBottom: "6px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              background: "rgba(99, 102, 241, 0.22)",
              color: "#a5b4fc",
              border: "1px solid rgba(99, 102, 241, 0.4)",
              borderRadius: "6px",
              padding: "2px 8px",
              fontSize: "0.75rem",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            ✦ {label.replace(/^\[|\]$/g, "")}
          </span>
          <span style={{ fontWeight: 700, color: "#ffffff", fontSize: "0.96rem" }}>
            {title}
          </span>
        </div>
      );
      continue;
    }

    // 5. Quoted Excerpt: "[Section: ...] ..." or starting with `"` or `> `
    if ((line.startsWith('"') && line.endsWith('"')) || (line.startsWith('"') && line.length > 25) || line.startsWith("> ")) {
      const cleanQuote = line.startsWith("> ") ? line.slice(2) : line;
      elements.push(
        <div
          key={`quote-${i}`}
          style={{
            margin: "8px 0 14px",
            padding: "10px 16px",
            background: "rgba(10, 16, 30, 0.65)",
            borderLeft: "3px solid var(--accent-cyan)",
            borderRadius: "0 8px 8px 0",
            color: "#cbd5e1",
            fontSize: "0.91rem",
            lineHeight: "1.65",
            fontStyle: "italic",
          }}
        >
          {cleanQuote}
        </div>
      );
      continue;
    }

    // 6. List Item: `* ...`, `- ...`, or numbered list `1. ...`
    const listMatch = line.match(/^(\*|-|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const prefix = listMatch[1];
      const content = listMatch[2];
      elements.push(
        <div
          key={`list-${i}`}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            margin: "5px 0",
            fontSize: "0.93rem",
            lineHeight: "1.6",
          }}
        >
          <span
            style={{
              color: "var(--accent-cyan)",
              fontSize: "0.78rem",
              fontWeight: 700,
              marginTop: "2px",
              flexShrink: 0,
            }}
          >
            {prefix.endsWith(".") ? prefix : "✦"}
          </span>
          <div style={{ flex: 1, color: "#f1f5f9" }}>
            {renderInlineTokens(content)}
          </div>
        </div>
      );
      continue;
    }

    // 7. Regular paragraph line
    elements.push(
      <p
        key={`p-${i}`}
        style={{
          margin: "4px 0",
          fontSize: "0.94rem",
          lineHeight: "1.7",
          color: "#f1f5f9",
        }}
      >
        {renderInlineTokens(line)}
      </p>
    );
  }

  return (
    <div>
      {elements}
      {isStreaming && <span className="typing-cursor">▌</span>}
    </div>
  );
}

export default function Workspace() {
  const p = useParams();
  const r = useRouter();
  const [x, setX] = useState<Project | null>(null);
  const [e, setE] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("Ask");
  const [askQuery, setAskQuery] = useState("");
  const [askMode, setAskMode] = useState<"turbo" | "deep">("turbo");
  const [askResult, setAskResult] = useState<{ answer: string; sources: any[] } | null>(null);
  const [asking, setAsking] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<any | null>(null);
  const [openingPaperId, setOpeningPaperId] = useState<number | null>(null);

  const handleViewPdf = async (paperId: number) => {
    if (!p?.id) return;
    setOpeningPaperId(paperId);
    try {
      await openPaperPdf(p.id as string, paperId);
    } catch (err: any) {
      alert("Could not open PDF: " + (err.message || String(err)));
    } finally {
      setOpeningPaperId(null);
    }
  };

  // Conversational Copilot Chat Feed State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
  const workspaceMainRef = useRef<HTMLElement>(null);

  // Auto-scroll ONLY inside the inner chat container, strictly avoiding any page-level scrolling
  useEffect(() => {
    if (activeTab === "Ask" && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, asking, activeTab]);

  const handleCopyMessage = (id: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    }
  };

  const handleClearChat = () => {
    if (asking) return;
    setChatMessages([]);
  };

  const exploreInCopilot = (promptText: string) => {
    setActiveTab("Ask");
    setTimeout(() => {
      handleAsk(promptText);
    }, 120);
  };

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
    const fileList = Array.from(ev.target.files);
    setUploading(true);

    try {
      // Parallel concurrent uploads for instant response
      const results = await Promise.allSettled(
        fileList.map((file) => uploadPaper(p.id as string, file))
      );

      const failures: string[] = [];
      results.forEach((res, idx) => {
        if (res.status === "rejected") {
          failures.push(`${fileList[idx].name}: ${res.reason?.message || "Upload failed"}`);
        }
      });

      if (failures.length > 0) {
        alert("Upload note:\n" + failures.join("\n"));
      }
    } catch (err: any) {
      alert("Error uploading files: " + (err.message || String(err)));
    } finally {
      // Immediately refresh paper list to display queued/processing papers
      await fetchPapers();
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAsk = async (queryToAsk?: string, overrideMode?: "turbo" | "deep") => {
    const query = (queryToAsk !== undefined ? queryToAsk : askQuery).trim();
    if (!query || asking || !p || !p.id) return;
    const modeToUse = overrideMode || askMode;

    // Immediately clear the input box so the user sees their prompt move into the chat area
    setAskQuery("");
    setAsking(true);

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `user-${Date.now()}`;
    const copilotMsgId = `copilot-${Date.now() + 1}`;

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: query,
      timestamp: now,
    };

    const copilotMsg: ChatMessage = {
      id: copilotMsgId,
      sender: "copilot",
      text: "",
      timestamp: now,
      mode: modeToUse,
      sources: [],
      isStreaming: true,
    };

    setChatMessages((prev) => [...prev, userMsg, copilotMsg]);

    try {
      await askQuestionStream(
        p.id as string,
        query,
        modeToUse,
        (fullText) => {
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === copilotMsgId
                ? { ...msg, text: fullText, isStreaming: true }
                : msg
            )
          );
        },
        (sources) => {
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === copilotMsgId
                ? { ...msg, sources: sources || [] }
                : msg
            )
          );
        }
      );
    } catch (err: any) {
      const errorText = `⚠️ Error during synthesis: ${err.message || String(err)}`;
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === copilotMsgId
            ? { ...msg, text: (msg.text ? msg.text + "\n\n" : "") + errorText, isStreaming: false }
            : msg
        )
      );
    } finally {
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === copilotMsgId
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
      setAsking(false);
    }
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
        <aside
          className="sidebar"
          onWheel={(e) => {
            if (typeof window !== "undefined" && activeTab !== "Ask") {
              window.scrollBy({ top: e.deltaY, behavior: "auto" });
            }
          }}
        >
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
        <section
          ref={workspaceMainRef}
          className="workspace-main animate-fade-in"
          style={
            activeTab === "Ask"
              ? {
                  height: "calc(100vh - 64px)",
                  display: "flex",
                  flexDirection: "column",
                  padding: "16px 28px",
                  overflow: "hidden",
                  boxSizing: "border-box",
                }
              : undefined
          }
        >
          {/* Header Metric Cards (Shown on Papers, Citations, Insights, Compare tabs) */}
          {activeTab !== "Ask" && (
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
          )}

          {/* Tab 1: AI Copilot Conversational Chat Feed */}
          {activeTab === "Ask" && (
            <div
              className="glass-panel"
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                minHeight: 0,
                overflow: "hidden",
                padding: 0,
                borderRadius: "16px",
                border: "1px solid var(--glass-border-glow)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.45)",
              }}
            >
              {/* Copilot Header */}
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--glass-border)",
                  background: "rgba(10, 16, 30, 0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)",
                      display: "grid",
                      placeItems: "center",
                      boxShadow: "0 0 15px rgba(99, 102, 241, 0.35)",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v3"/><circle cx="12" cy="2" r="1"/><rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="13" r="1.2" fill="currentColor"/><circle cx="15" cy="13" r="1.2" fill="currentColor"/><path d="M10 17h4"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>ScholarPulse AI Copilot</h2>
                      <span className="badge-pill badge-cyan" style={{ fontSize: "0.68rem" }}>Multi-Turn Grounded</span>
                    </div>
                    <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                      Synthesizing across {papers.length} indexed papers • {processedCount} ready
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* Synthesizer Selector Toggle */}
                  <div style={{ display: "flex", background: "rgba(15, 23, 42, 0.85)", padding: "3px", borderRadius: "8px", border: "1px solid var(--glass-border)" }}>
                    <button
                      type="button"
                      onClick={() => setAskMode("turbo")}
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        background: askMode === "turbo" ? "var(--accent-emerald)" : "transparent",
                        color: askMode === "turbo" ? "#000000" : "var(--text-muted)",
                        transition: "all 0.2s ease"
                      }}
                      title="Fast multi-vector retrieval (<0.1s instant synthesis)"
                    >
                      ⚡ Turbo (Instant)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAskMode("deep")}
                      style={{
                        padding: "4px 10px",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                        background: askMode === "deep" ? "var(--primary)" : "transparent",
                        color: askMode === "deep" ? "#ffffff" : "var(--text-muted)",
                        transition: "all 0.2s ease"
                      }}
                      title="Deep generative reasoning via Gemini live stream"
                    >
                      🧠 Gemini Stream
                    </button>
                  </div>

                  {/* Clear Thread Button */}
                  {chatMessages.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearChat}
                      disabled={asking}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid var(--glass-border)",
                        color: "#94a3b8",
                        padding: "5px 12px",
                        fontSize: "0.76rem",
                        borderRadius: "8px",
                        cursor: asking ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                      title="Clear all messages in this conversation"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      <span>Clear Chat</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Chat Area - ONLY THIS SCROLLS */}
              <div
                ref={chatContainerRef}
                className="chat-scroll-container"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  padding: "24px 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "22px",
                }}
              >
                {/* Empty State when no messages */}
                {chatMessages.length === 0 && (
                  <div style={{ margin: "auto", maxWidth: "680px", textAlign: "center", padding: "20px 10px" }}>
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "18px",
                        background: "linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)",
                        display: "grid",
                        placeItems: "center",
                        margin: "0 auto 18px",
                        boxShadow: "0 0 30px rgba(99, 102, 241, 0.4)",
                      }}
                    >
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 2v3"/><circle cx="12" cy="2" r="1"/><rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="13" r="1.2" fill="currentColor"/><circle cx="15" cy="13" r="1.2" fill="currentColor"/><path d="M10 17h4"/>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: "1.45rem", marginBottom: "8px", color: "#ffffff" }}>
                      How can I help with your research today?
                    </h3>
                    <p className="muted" style={{ maxWidth: "540px", margin: "0 auto 28px", fontSize: "0.92rem", lineHeight: "1.6" }}>
                      Ask anything across your project's parsed research papers. Answers are grounded in semantic chunks with clickable citation attribution.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", textAlign: "left" }}>
                      <div
                        onClick={() => handleAsk("Generate a comprehensive literature review summary across all indexed papers.")}
                        className="glass-panel-hover"
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--glass-border)",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontWeight: 700, fontSize: "0.85rem", marginBottom: "6px" }}>
                          <span>📚</span>
                          <span>Literature Review</span>
                        </div>
                        <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                          Synthesize core evolution, paradigms, and state of the art across papers.
                        </p>
                      </div>

                      <div
                        onClick={() => handleAsk("What are the key experimental methodologies and algorithms used in these papers?")}
                        className="glass-panel-hover"
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--glass-border)",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#a78bfa", fontWeight: 700, fontSize: "0.85rem", marginBottom: "6px" }}>
                          <span>🔬</span>
                          <span>Extract Methodologies</span>
                        </div>
                        <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                          Analyze models, datasets, metrics, and algorithmic formulations.
                        </p>
                      </div>

                      <div
                        onClick={() => handleAsk("Identify any conflicting findings, contradictory claims, or research gaps across papers.")}
                        className="glass-panel-hover"
                        style={{
                          padding: "16px",
                          borderRadius: "12px",
                          background: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid var(--glass-border)",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#f59e0b", fontWeight: 700, fontSize: "0.85rem", marginBottom: "6px" }}>
                          <span>⚠️</span>
                          <span>Find Contradictions</span>
                        </div>
                        <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                          Uncover empirical discrepancies and high-priority open research gaps.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Message List */}
                {chatMessages.map((msg) => {
                  if (msg.sender === "user") {
                    return (
                      <div key={msg.id} style={{ display: "flex", justifyContent: "flex-end", width: "100%", gap: "10px", alignItems: "flex-end" }}>
                        <div
                          style={{
                            maxWidth: "76%",
                            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.28) 0%, rgba(139, 92, 246, 0.24) 100%)",
                            border: "1px solid rgba(99, 102, 241, 0.45)",
                            borderRadius: "18px 18px 4px 18px",
                            padding: "12px 18px",
                            boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
                          }}
                        >
                          <div style={{ fontSize: "0.95rem", color: "#ffffff", lineHeight: "1.55", wordBreak: "break-word" }}>
                            {msg.text}
                          </div>
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px", fontSize: "0.7rem", color: "#94a3b8" }}>
                            {msg.timestamp}
                          </div>
                        </div>
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: "linear-gradient(135deg, var(--primary), var(--accent-violet))",
                            display: "grid",
                            placeItems: "center",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: "#ffffff",
                            flexShrink: 0,
                          }}
                        >
                          {userInitial}
                        </div>
                      </div>
                    );
                  }

                  // Copilot Message
                  return (
                    <div key={msg.id} style={{ display: "flex", width: "100%", gap: "12px", alignItems: "flex-start" }}>
                      <div
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "10px",
                          background: "linear-gradient(135deg, var(--primary) 0%, var(--accent-cyan) 100%)",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                          marginTop: "2px",
                          boxShadow: "0 0 12px rgba(6, 182, 212, 0.35)",
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2v3"/><circle cx="12" cy="2" r="1"/><rect x="4" y="8" width="16" height="12" rx="3"/><circle cx="9" cy="13" r="1.2" fill="currentColor"/><circle cx="15" cy="13" r="1.2" fill="currentColor"/><path d="M10 17h4"/>
                        </svg>
                      </div>

                      <div
                        style={{
                          maxWidth: "88%",
                          background: "rgba(13, 20, 36, 0.85)",
                          border: "1px solid var(--glass-border)",
                          borderRadius: "4px 18px 18px 18px",
                          padding: "18px 22px",
                          boxShadow: "0 4px 18px rgba(0,0,0,0.35)",
                        }}
                      >
                        {/* Message Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#ffffff" }}>ScholarPulse Copilot</span>
                            <span className="badge-pill badge-primary" style={{ fontSize: "0.66rem", padding: "2px 8px" }}>
                              {msg.mode === "turbo" ? "⚡ Turbo Synthesis" : "🧠 Gemini Generative"}
                            </span>
                            {msg.isStreaming && (
                              <span className="badge-pill badge-emerald" style={{ fontSize: "0.66rem", padding: "2px 8px" }}>
                                ● Streaming tokens live…
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{msg.timestamp}</span>
                            {msg.text && (
                              <button
                                type="button"
                                onClick={() => handleCopyMessage(msg.id, msg.text)}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: copiedMsgId === msg.id ? "var(--accent-emerald)" : "var(--text-muted)",
                                  fontSize: "0.72rem",
                                  padding: "2px 6px",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title="Copy response to clipboard"
                              >
                                {copiedMsgId === msg.id ? (
                                  <>
                                    <span>✓ Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                    </svg>
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Message Body Content */}
                        {msg.isStreaming && !msg.text ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--accent-cyan)", fontSize: "0.88rem", padding: "8px 0" }}>
                            <svg className="spinner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                            <span>Grounded reasoning across indexed papers...</span>
                          </div>
                        ) : (
                          <div style={{ lineHeight: "1.75", fontSize: "0.95rem", color: "#f1f5f9" }}>
                            {renderFormattedMessage(msg.text, msg.isStreaming)}
                          </div>
                        )}

                        {/* Cited Sources & References */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--accent-cyan)", letterSpacing: "0.08em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "6px" }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                  <span>Cited References &amp; Evidence ({msg.sources.length})</span>
                                </span>
                              </div>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                                Click any card to inspect full PDF excerpt
                              </span>
                            </div>

                            {/* Responsive Grid with Clean Alignment */}
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                                gap: "12px",
                                width: "100%",
                              }}
                            >
                              {msg.sources.map((s, idx) => {
                                const rawLabel = s.doc_label || `Doc ${idx + 1}`;
                                const scoreVal = typeof s.rrf_score === "number" ? s.rrf_score.toFixed(4) : (s.rrf_score || "0.0000");

                                return (
                                  <div
                                    key={idx}
                                    onClick={() => setSelectedSnippet(s)}
                                    className="glass-panel-hover"
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      justifyContent: "space-between",
                                      padding: "14px 16px",
                                      borderRadius: "12px",
                                      background: "rgba(15, 23, 42, 0.75)",
                                      border: "1px solid rgba(255, 255, 255, 0.09)",
                                      cursor: "pointer",
                                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                                    }}
                                  >
                                    {/* Top Row: Pill Badge and RRF Relevance Score */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", gap: "8px" }}>
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "5px",
                                          padding: "3px 8px",
                                          borderRadius: "6px",
                                          fontSize: "0.72rem",
                                          fontWeight: 700,
                                          background: "rgba(99, 102, 241, 0.18)",
                                          color: "#a5b4fc",
                                          border: "1px solid rgba(99, 102, 241, 0.35)",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        <span style={{ color: "var(--accent-cyan)" }}>✦</span>
                                        <span>{rawLabel}</span>
                                      </span>
                                      <span
                                        style={{
                                          fontSize: "0.7rem",
                                          fontWeight: 700,
                                          color: "var(--accent-cyan)",
                                          background: "rgba(6, 182, 212, 0.12)",
                                          padding: "2px 7px",
                                          borderRadius: "4px",
                                          whiteSpace: "nowrap",
                                          letterSpacing: "0.02em",
                                        }}
                                      >
                                        RRF {scoreVal}
                                      </span>
                                    </div>

                                    {/* Paper Title */}
                                    <div
                                      style={{
                                        fontSize: "0.88rem",
                                        fontWeight: 700,
                                        color: "#ffffff",
                                        lineHeight: "1.4",
                                        marginBottom: "8px",
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                      }}
                                    >
                                      {s.title}
                                    </div>

                                    {/* Bottom Row: Excerpt preview and Click hint */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                      <span className="muted" style={{ fontSize: "0.74rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "210px" }}>
                                        {s.snippet ? `"${s.snippet.slice(0, 45)}..."` : "Inspect excerpt"}
                                      </span>
                                      <span style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 700, display: "flex", alignItems: "center", gap: "3px" }}>
                                        <span>Inspect</span>
                                        <span>↗</span>
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Docked Input Bar - ALWAYS FIXED AT BOTTOM */}
              <div
                style={{
                  padding: "14px 20px 18px",
                  borderTop: "1px solid var(--glass-border)",
                  background: "rgba(10, 16, 30, 0.95)",
                  backdropFilter: "blur(12px)",
                  flexShrink: 0,
                }}
              >
                {/* Mini Quick Action Chips */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px", overflowX: "auto", paddingBottom: "2px" }}>
                  <button
                    className="action-chip"
                    type="button"
                    onClick={() => handleAsk("Generate a comprehensive literature review summary across all indexed papers.")}
                    disabled={asking}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    </svg>
                    <span>Literature Review</span>
                  </button>
                  <button
                    className="action-chip"
                    type="button"
                    onClick={() => handleAsk("What are the key experimental methodologies and algorithms used in these papers?")}
                    disabled={asking}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/>
                      <path d="M8.5 2h7"/>
                      <path d="M7 16h10"/>
                    </svg>
                    <span>Extract Methodologies</span>
                  </button>
                  <button
                    className="action-chip"
                    type="button"
                    onClick={() => handleAsk("Identify any conflicting findings, contradictory claims, or research gaps across papers.")}
                    disabled={asking}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    <span>Find Contradictions</span>
                  </button>
                </div>

                {/* Input Field and Send Button */}
                <form
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    handleAsk();
                  }}
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <input
                    type="text"
                    value={askQuery}
                    onChange={(ev) => setAskQuery(ev.target.value)}
                    placeholder="Ask a question about methodology, findings, or citations (Press Enter)..."
                    style={{
                      flex: 1,
                      padding: "13px 18px",
                      fontSize: "0.94rem",
                      background: "rgba(15, 23, 42, 0.8)",
                      borderRadius: "12px",
                      border: "1px solid var(--glass-border)",
                    }}
                    disabled={asking}
                  />
                  <button
                    type="submit"
                    className="auth-submit-btn"
                    style={{
                      width: "auto",
                      padding: "0 24px",
                      height: "46px",
                      borderRadius: "12px",
                      opacity: (!askQuery.trim() || asking) ? 0.6 : 1,
                      cursor: (!askQuery.trim() || asking) ? "not-allowed" : "pointer",
                      flexShrink: 0,
                    }}
                    disabled={asking || !askQuery.trim()}
                  >
                    {asking ? (
                      <>
                        <svg className="spinner-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                        <span>Synthesizing...</span>
                      </>
                    ) : (
                      <>
                        <span>Ask Agent</span>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </>
                    )}
                  </button>
                </form>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "0.72rem", color: "var(--text-subtle)" }}>
                  <span>Press <kbd style={{ padding: "1px 5px", borderRadius: "4px", background: "rgba(255,255,255,0.08)", border: "1px solid var(--glass-border)" }}>Enter</kbd> to send query</span>
                  <span>Hybrid BM25 + Vector Retrieval Grounded • Multi-Turn Session</span>
                </div>
              </div>
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
                        <h4 style={{ fontSize: "1.1rem", marginBottom: "4px", color: "#ffffff" }}>{paper.display_name || paper.title || "Untitled Document"}</h4>
                        {paper.display_name && paper.title && paper.title !== paper.display_name && (
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "5px" }}>
                            <span style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "4px", padding: "1px 6px", color: "#a5b4fc", fontWeight: 600, fontSize: "0.7rem" }}>Detected Title</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "480px" }}>{paper.title}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                          {paper.authors && <span>👥 {paper.authors}</span>}
                          {paper.year && <span>📅 {paper.year}</span>}
                          {paper.doi && <span>🔗 DOI: {paper.doi}</span>}
                          <span>Uploaded {new Date(paper.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "10px", flexShrink: 0 }}>
                        <div>{getStatusBadge(paper.status)}</div>
                        {paper.status === "PROCESSED" && (
                          <button
                            type="button"
                            className="auth-pill"
                            onClick={() => handleViewPdf(paper.id)}
                            disabled={openingPaperId === paper.id}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "6px 14px",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              borderRadius: "8px",
                              background: "rgba(99, 102, 241, 0.12)",
                              borderColor: "rgba(99, 102, 241, 0.35)",
                              color: "#a5b4fc",
                              cursor: openingPaperId === paper.id ? "wait" : "pointer",
                              transition: "all 0.2s ease",
                            }}
                            title="Open original PDF in a new tab"
                          >
                            {openingPaperId === paper.id ? (
                              <>
                                <svg className="spinner-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                <span>Loading...</span>
                              </>
                            ) : (
                              <>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                  <polyline points="14 2 14 8 20 8"/>
                                  <line x1="16" y1="13" x2="8" y2="13"/>
                                  <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                                <span>Open PDF</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="7" y1="17" x2="17" y2="7"/>
                                  <polyline points="7 7 17 7 17 17"/>
                                </svg>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Citation Graph */}
          {activeTab === "Citations" && (
            citations ? (
              <CitationGraph
                nodes={citations.nodes}
                edges={citations.edges}
                summary={citations.summary}
                projectId={p?.id ? String(p.id) : undefined}
                onAskPaper={(paperTitle) => {
                  exploreInCopilot(`Analyze the research methodology, key findings, and contributions of the paper: "${paperTitle}"`);
                }}
              />
            ) : (
              <div className="glass-panel" style={{ padding: "40px", textAlign: "center" }}>
                <p className="muted">Building interactive citation network...</p>
              </div>
            )
          )}

          {/* Tab 4: Research Insights */}
          {activeTab === "Insights" && (
            <div style={{ display: "grid", gap: "24px" }}>
              <div className="glass-panel" style={{ padding: "32px", position: "relative", overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                  <div>
                    <span className="workspace-eyebrow" style={{ marginBottom: "6px" }}>● SYNTHESIZED RESEARCH INTELLIGENCE</span>
                    <h2 style={{ fontSize: "1.8rem", margin: "4px 0 8px", fontWeight: 800 }}>Literature Synthesis &amp; Gaps</h2>
                    <p className="muted" style={{ margin: 0, fontSize: "0.95rem" }}>
                      Cross-document meta-analysis synthesized across all {papers.length} indexed project papers.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span className="badge-pill badge-cyan">{papers.length} Papers Synthesized</span>
                    <span className="badge-pill" style={{ background: "rgba(16, 185, 129, 0.15)", borderColor: "rgba(16, 185, 129, 0.3)", color: "#6ee7b7" }}>100% Vector Readiness</span>
                  </div>
                </div>

                {insights ? (
                  <div style={{ display: "grid", gap: "24px" }}>
                    {/* Domain Overview Box */}
                    <div style={{
                      padding: "24px",
                      borderRadius: "16px",
                      background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      boxShadow: "0 8px 32px -4px rgba(0, 0, 0, 0.2)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", color: "#34d399" }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                        </div>
                        <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#34d399", fontWeight: 700 }}>Executive Literature Synthesis</h3>
                      </div>
                      <p style={{ lineHeight: "1.75", fontSize: "0.98rem", color: "#e2e8f0", margin: 0 }}>
                        {insights.overview}
                      </p>
                    </div>

                    {/* Thematic Clusters Section */}
                    {insights.core_themes && insights.core_themes.length > 0 && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                            <span>🧠</span> Thematic Research Paradigms ({insights.core_themes.length})
                          </h3>
                          <span className="muted" style={{ fontSize: "0.85rem" }}>Categorized by algorithmic approach</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
                          {insights.core_themes.map((theme, tIdx) => (
                            <div key={tIdx} className="glass-panel" style={{
                              padding: "20px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid rgba(255, 255, 255, 0.07)",
                              borderRadius: "14px",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between"
                            }}>
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                                  <span className="badge-pill badge-cyan" style={{ fontSize: "0.72rem", padding: "3px 10px" }}>
                                    {theme.category || "Thematic Paradigm"}
                                  </span>
                                  <span style={{ fontSize: "0.78rem", color: "var(--accent-purple)" }}>
                                    {theme.paper_ids.length} {theme.paper_ids.length === 1 ? "Paper" : "Papers"}
                                  </span>
                                </div>
                                <h4 style={{ margin: "0 0 10px", fontSize: "1.05rem", color: "#ffffff", fontWeight: 700 }}>{theme.title}</h4>
                                <p style={{ fontSize: "0.88rem", lineHeight: "1.6", color: "#94a3b8", margin: "0 0 14px" }}>
                                  {theme.description}
                                </p>
                              </div>

                              <div>
                                {theme.paper_titles && theme.paper_titles.length > 0 && (
                                  <div style={{ background: "rgba(0,0,0,0.25)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)", marginBottom: "12px" }}>
                                    <span style={{ display: "block", fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginBottom: "4px" }}>KEY CONTRIBUTING PAPERS:</span>
                                    {theme.paper_titles.slice(0, 2).map((pt, ptIdx) => (
                                      <div key={ptIdx} style={{ fontSize: "0.8rem", color: "#cbd5e1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        • {pt}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => exploreInCopilot(`Synthesize the evidence and methodologies for "${theme.title}" based on the uploaded papers.`)}
                                  style={{
                                    width: "100%",
                                    padding: "8px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid rgba(99, 102, 241, 0.3)",
                                    background: "rgba(99, 102, 241, 0.1)",
                                    color: "#a5b4fc",
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "6px"
                                  }}
                                >
                                  <span>💬 Query Copilot on Theme →</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Structured Research Gaps Section */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#f8fafc", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>🎯</span> High-Impact Research Gaps &amp; Opportunities
                        </h3>
                        <span className="badge-pill badge-purple" style={{ fontSize: "0.75rem" }}>Novel Paper Angles</span>
                      </div>
                      <p className="muted" style={{ margin: "0 0 16px", fontSize: "0.9rem" }}>
                        Unaddressed challenges in current literature providing concrete avenues for novel research or engineering projects:
                      </p>

                      <div style={{ display: "grid", gap: "14px" }}>
                        {(insights.structured_gaps && insights.structured_gaps.length > 0
                          ? insights.structured_gaps
                          : (insights.research_gaps || []).map((rg) => ({
                              title: rg.split(":")[0] || "Research Limitation",
                              severity: "High" as const,
                              description: rg.includes(":") ? rg.split(":")[1].trim() : rg,
                              opportunity: "Design robust empirical architectures evaluating this limitation across diverse datasets."
                            }))
                        ).map((gap, gIdx) => {
                          const isCrit = gap.severity === "Critical";
                          const isHigh = gap.severity === "High";
                          const borderColor = isCrit ? "rgba(244, 63, 94, 0.35)" : isHigh ? "rgba(245, 158, 11, 0.35)" : "rgba(6, 182, 212, 0.35)";
                          const bgColor = isCrit ? "rgba(244, 63, 94, 0.05)" : isHigh ? "rgba(245, 158, 11, 0.05)" : "rgba(6, 182, 212, 0.05)";
                          const badgeColor = isCrit ? "#fda4af" : isHigh ? "#fcd34d" : "#67e8f9";

                          return (
                            <div key={gIdx} style={{
                              padding: "20px",
                              borderRadius: "14px",
                              background: bgColor,
                              border: `1px solid ${borderColor}`,
                              display: "grid",
                              gap: "10px"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    padding: "3px 10px",
                                    borderRadius: "12px",
                                    background: isCrit ? "rgba(244, 63, 94, 0.2)" : isHigh ? "rgba(245, 158, 11, 0.2)" : "rgba(6, 182, 212, 0.2)",
                                    color: badgeColor,
                                    border: `1px solid ${borderColor}`
                                  }}>
                                    SEVERITY: {gap.severity.toUpperCase()}
                                  </span>
                                  <h4 style={{ margin: 0, fontSize: "1.05rem", color: "#ffffff", fontWeight: 700 }}>{gap.title}</h4>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => exploreInCopilot(`How can we solve the research gap "${gap.title}" in this domain? What novel experiment could we run?`)}
                                  style={{
                                    padding: "4px 12px",
                                    borderRadius: "6px",
                                    border: `1px solid ${borderColor}`,
                                    background: "rgba(0,0,0,0.3)",
                                    color: badgeColor,
                                    fontSize: "0.78rem",
                                    cursor: "pointer"
                                  }}
                                >
                                  Formulate Thesis Proposal →
                                </button>
                              </div>

                              <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: "1.6", color: "#cbd5e1" }}>
                                <strong style={{ color: "#94a3b8" }}>The Limitation: </strong>{gap.description}
                              </p>

                              <div style={{
                                padding: "12px 16px",
                                borderRadius: "10px",
                                background: "rgba(0, 0, 0, 0.35)",
                                border: "1px dashed rgba(255, 255, 255, 0.12)",
                                fontSize: "0.88rem",
                                color: "#f1f5f9",
                                lineHeight: "1.5"
                              }}>
                                <span style={{ color: "var(--accent-emerald)", fontWeight: 700 }}>💡 Novel Research Opportunity: </span>
                                {gap.opportunity}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Consensus vs Open Debates Dual Column */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
                      {/* Left: Scientific Consensus */}
                      <div style={{
                        padding: "24px",
                        borderRadius: "16px",
                        background: "rgba(16, 185, 129, 0.04)",
                        border: "1px solid rgba(16, 185, 129, 0.2)"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                          <span style={{ fontSize: "1.2rem" }}>🤝</span>
                          <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#34d399", fontWeight: 700 }}>Scientific Consensus</h4>
                        </div>
                        <div style={{ display: "grid", gap: "12px" }}>
                          {(insights.consensus_findings || [
                            "Deep contextual embeddings consistently outperform bag-of-words models on standard benchmark tests.",
                            "Pure text analysis without source credibility yields false positives on satirical articles.",
                            "Cross-domain evaluation exposes significant performance drop-offs when testing out-of-distribution."
                          ]).map((point, cIdx) => (
                            <div key={cIdx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "0.88rem", lineHeight: "1.55", color: "#cbd5e1" }}>
                              <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span>
                              <span>{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Open Debates */}
                      <div style={{
                        padding: "24px",
                        borderRadius: "16px",
                        background: "rgba(245, 158, 11, 0.04)",
                        border: "1px solid rgba(245, 158, 11, 0.2)"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                          <span style={{ fontSize: "1.2rem" }}>⚖️</span>
                          <h4 style={{ margin: 0, fontSize: "1.1rem", color: "#fbbf24", fontWeight: 700 }}>Open Debates &amp; Contradictions</h4>
                        </div>
                        <div style={{ display: "grid", gap: "12px" }}>
                          {(insights.open_debates || [
                            "Interpretability vs Accuracy: Whether high-stakes content moderation should mandate interpretable feature trees over opaque neural models.",
                            "Inference Latency Trade-Off: Whether lightweight TF-IDF pipelines are preferable for high-velocity streaming feeds compared to GPU-heavy Transformers.",
                            "Content vs Context: Whether fact-checking should focus strictly on linguistic features or external social network diffusion patterns."
                          ]).map((debate, dIdx) => (
                            <div key={dIdx} style={{ display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "0.88rem", lineHeight: "1.55", color: "#cbd5e1" }}>
                              <span style={{ color: "#fbbf24", fontWeight: 700 }}>⚡</span>
                              <span>{debate}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Methodological Trade-offs Section */}
                    {insights.methodology_insights && insights.methodology_insights.length > 0 && (
                      <div style={{ padding: "24px", borderRadius: "16px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid rgba(255, 255, 255, 0.07)" }}>
                        <h4 style={{ margin: "0 0 16px", fontSize: "1.1rem", color: "#ffffff", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>⚙️</span> Evaluated Methodologies &amp; Architectural Trade-offs
                        </h4>
                        <div style={{ display: "grid", gap: "12px" }}>
                          {insights.methodology_insights.map((m, mIdx) => (
                            <div key={mIdx} style={{
                              padding: "16px",
                              borderRadius: "12px",
                              background: "rgba(0,0,0,0.25)",
                              border: "1px solid rgba(255,255,255,0.05)",
                              display: "flex",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "12px"
                            }}>
                              <div style={{ flex: "1 1 340px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                                  <span className="badge-pill badge-purple" style={{ fontSize: "0.7rem", padding: "2px 8px" }}>{m.category}</span>
                                  <strong style={{ color: "#e2e8f0", fontSize: "0.95rem" }}>{m.name}</strong>
                                </div>
                                <p style={{ margin: "0 0 6px", fontSize: "0.86rem", color: "#94a3b8", lineHeight: "1.5" }}>{m.description}</p>
                              </div>
                              {m.tradeoff && (
                                <div style={{ flex: "1 1 280px", background: "rgba(99, 102, 241, 0.08)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(99, 102, 241, 0.2)", fontSize: "0.84rem", color: "#c7d2fe", alignSelf: "center" }}>
                                  <strong style={{ color: "#a5b4fc" }}>Trade-off: </strong>{m.tradeoff}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: "40px", textAlign: "center" }}>
                    <p className="muted">Generating synthesized domain insights across papers...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 6: Matrix Comparison */}
          {activeTab === "Compare" && (
            <div className="glass-panel" style={{ padding: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <span className="workspace-eyebrow" style={{ marginBottom: "4px" }}>● METHODOLOGY MATRIX</span>
                  <h2 style={{ fontSize: "1.6rem", margin: "4px 0 6px" }}>Cross-Paper Comparison</h2>
                  <p className="muted" style={{ margin: 0, fontSize: "0.92rem" }}>Side-by-side architectural and empirical contrast across your {comparisonMatrix.length} project papers.</p>
                </div>
                <button
                  type="button"
                  onClick={() => exploreInCopilot("Generate a comparative synthesis contrasting the trade-offs of all papers in this project.")}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    color: "#a5b4fc",
                    fontWeight: 600,
                    fontSize: "0.86rem",
                    cursor: "pointer"
                  }}
                >
                  💬 Synthesize Matrix in Copilot →
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--glass-border)", color: "var(--accent-cyan)", background: "rgba(255,255,255,0.02)" }}>
                      <th style={{ padding: "14px", width: "22%" }}>Paper Title &amp; Year</th>
                      <th style={{ padding: "14px", width: "26%" }}>Methodology &amp; Architecture</th>
                      <th style={{ padding: "14px", width: "28%" }}>Key Findings</th>
                      <th style={{ padding: "14px", width: "24%" }}>Limitations &amp; Trade-offs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonMatrix.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <td style={{ padding: "14px", fontWeight: 700, color: "#ffffff", verticalAlign: "top" }}>
                          <div>{item.title}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--accent-cyan)", fontWeight: 400, marginTop: "4px" }}>
                            {item.year ? `Year: ${item.year}` : ""} • {item.authors || "Unknown Authors"}
                          </div>
                        </td>
                        <td style={{ padding: "14px", verticalAlign: "top", color: "#e2e8f0", lineHeight: "1.5" }}>
                          {item.methodology || "N/A"}
                        </td>
                        <td style={{ padding: "14px", verticalAlign: "top", color: "#cbd5e1", lineHeight: "1.5" }}>
                          {item.key_findings || "N/A"}
                        </td>
                        <td style={{ padding: "14px", verticalAlign: "top", color: "#fca5a5", lineHeight: "1.5", background: "rgba(244, 63, 94, 0.02)" }}>
                          {item.limitations || "N/A"}
                        </td>
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
