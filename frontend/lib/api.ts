const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type User = { id: number; name: string; email: string };
export type Project = {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const h = new Headers(options.headers);
  h.set("Content-Type", "application/json");
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("sp_token");
    if (t) h.set("Authorization", `Bearer ${t}`);
  }
  let r: Response;
  try {
    r = await fetch(`${API}${path}`, { ...options, headers: h });
  } catch (err) {
    throw new Error("Unable to connect to server. Please check your connection.");
  }
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("sp_token");
    localStorage.removeItem("sp_user");
  }
  if (!r.ok) {
    const detailMsg = typeof d.detail === "string" ? d.detail : d.message;
    throw new Error(detailMsg || `Request failed with status ${r.status}`);
  }
  return d as T;
}

export async function login(email: string, password: string) {
  const d = await request<{ access_token: string; user: User }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem("sp_token", d.access_token);
  localStorage.setItem("sp_user", JSON.stringify(d.user));
  return d.user;
}

export async function register(name: string, email: string, password: string) {
  const d = await request<{ access_token: string; user: User }>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
  localStorage.setItem("sp_token", d.access_token);
  localStorage.setItem("sp_user", JSON.stringify(d.user));
  return d.user;
}

export function logout() {
  localStorage.removeItem("sp_token");
  localStorage.removeItem("sp_user");
}

export async function getProjects() {
  return request<Project[]>("/api/projects");
}

export async function createProject(p: { name: string; description: string }) {
  return request<Project>("/api/projects", { method: "POST", body: JSON.stringify(p) });
}

export async function getProject(id: string) {
  return request<Project>(`/api/projects/${id}`);
}

export type Paper = {
  id: number;
  project_id: number;
  file_hash: string;
  file_path: string;
  status: string;
  title: string;
  authors: string;
  year: number;
  doi: string;
  created_at: string;
};

export async function uploadPaper(projectId: string, file: File) {
  const f = new FormData();
  f.append("file", file);
  const h = new Headers();
  const t = localStorage.getItem("sp_token");
  if (t) h.set("Authorization", `Bearer ${t}`);
  const r = await fetch(`${API}/api/projects/${projectId}/papers`, { method: "POST", headers: h, body: f });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.detail ?? "Upload failed");
  return d as Paper;
}

export async function getPapers(projectId: string, filters?: { status?: string; search?: string; year_min?: number; year_max?: number }) {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.search) params.append("search", filters.search);
  if (filters?.year_min !== undefined && !isNaN(filters.year_min)) params.append("year_min", filters.year_min.toString());
  if (filters?.year_max !== undefined && !isNaN(filters.year_max)) params.append("year_max", filters.year_max.toString());
  const queryString = params.toString() ? `?${params.toString()}` : "";
  return request<Paper[]>(`/api/projects/${projectId}/papers${queryString}`);
}

export type SourceItem = {
  doc_label: string;
  document_id: number;
  title: string;
  authors?: string;
  year?: number;
  snippet: string;
  rrf_score?: number;
};

export type AskResponse = {
  answer: string;
  sources: SourceItem[];
};

export async function askQuestion(projectId: string, query: string): Promise<AskResponse> {
  return request<AskResponse>(`/api/projects/${projectId}/ask`, {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export type Analytics = {
  total_papers: number;
  processed_papers: number;
  status_breakdown: Record<string, number>;
  year_distribution: Record<string, number>;
  total_chunks: number;
};

export type InsightTheme = {
  title: string;
  description: string;
  paper_ids: number[];
};

export type Insights = {
  overview: string;
  core_themes: InsightTheme[];
  research_gaps: string[];
  methodologies: string[];
};

export type PriorityPaper = {
  id: number;
  title: string;
  authors: string;
  year?: number;
  status: string;
  priority_score: number;
  reason: string;
};

export type ComparisonItem = {
  paper_id: number;
  title: string;
  authors: string;
  year?: number;
  methodology: string;
  key_findings: string;
  limitations: string;
};

export type CitationNode = {
  id: number;
  title: string;
  authors: string;
  year?: number;
  status?: string;
  x?: number;
  y?: number;
};

export type CitationEdge = {
  source: number;
  target: number;
  label: string;
};

export type Citations = {
  nodes: CitationNode[];
  edges: CitationEdge[];
};

export async function getAnalytics(projectId: string): Promise<Analytics> {
  return request<Analytics>(`/api/projects/${projectId}/analytics`);
}

export async function getInsights(projectId: string): Promise<Insights> {
  return request<Insights>(`/api/projects/${projectId}/insights`);
}

export async function getReadingPriority(projectId: string): Promise<PriorityPaper[]> {
  return request<PriorityPaper[]>(`/api/projects/${projectId}/reading-priority`);
}

export async function comparePapers(projectId: string, paperIds?: number[]): Promise<{ matrix: ComparisonItem[] }> {
  return request<{ matrix: ComparisonItem[] }>(`/api/projects/${projectId}/compare`, {
    method: "POST",
    body: JSON.stringify({ paper_ids: paperIds }),
  });
}

export async function getCitations(projectId: string): Promise<Citations> {
  return request<Citations>(`/api/projects/${projectId}/citations`);
}

export async function downloadFile(urlPath: string, defaultFileName: string) {
  const h = new Headers();
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("sp_token");
    if (t) h.set("Authorization", `Bearer ${t}`);
  }
  const res = await fetch(`${API}${urlPath}`, { headers: h });
  if (!res.ok) throw new Error("File download failed");
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultFileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadMarkdownReport(projectId: string) {
  return downloadFile(`/api/projects/${projectId}/export/markdown`, `ScholarPulse_Project_${projectId}_Report.md`);
}

export async function downloadBibTeX(projectId: string) {
  return downloadFile(`/api/projects/${projectId}/export/bibtex`, `ScholarPulse_Project_${projectId}_Citations.bib`);
}
