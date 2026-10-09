from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models import Paper, Project
from app.retrieval.hybrid_retriever import hybrid_search
from app.llm.gemini_provider import get_llm_provider

class ResearchGraphState:
    """State object passed through the reasoning graph nodes."""
    def __init__(self, project_id: int, query: str):
        self.project_id = project_id
        self.query = query
        self.sub_queries: List[str] = []
        self.retrieved_chunks: List[Dict[str, Any]] = []
        self.evidence_evaluation: Dict[str, Any] = {}
        self.final_answer: str = ""
        self.sources: List[Dict[str, Any]] = []

def node_decompose_query(state: ResearchGraphState) -> ResearchGraphState:
    """
    Decomposes user query into targeted academic sub-questions.
    (Optimized: Skip multi-query expansion to vastly improve agent response speed)
    """
    base = state.query.strip()
    sub_q = [base]
    state.sub_queries = sub_q
    return state

def node_retrieve_evidence(state: ResearchGraphState, db: Session, top_k_per_sub: int = 5) -> ResearchGraphState:
    """
    Executes hybrid retrieval across sub-questions, deduplicates context passages, 
    and enriches with Paper title, authors, year, section, and page metadata.
    """
    project = db.query(Project).filter(Project.id == state.project_id).first()
    if not project:
        state.final_answer = "Project not found."
        return state

    papers = db.query(Paper).filter(Paper.project_id == state.project_id).all()
    paper_map = {paper.id: paper for paper in papers}

    seen_keys = set()
    aggregated_chunks = []

    for sq in state.sub_queries:
        hits = hybrid_search(query=sq, project_id=state.project_id, top_k=top_k_per_sub, rerank=True)
        for chunk in hits:
            doc_id = chunk.get("document_id", 0)
            idx = chunk.get("chunk_index", 0)
            key = (doc_id, idx)
            if key not in seen_keys:
                seen_keys.add(key)
                aggregated_chunks.append(chunk)

    if not aggregated_chunks:
        if not papers:
            state.final_answer = "No papers have been uploaded to this research project yet. Please upload PDF papers to ask questions."
        else:
            state.final_answer = "No relevant excerpts were found in the uploaded papers for your query."
        return state

    # Enrich chunks with paper metadata
    context_chunks = []
    sources = []

    for idx, chunk in enumerate(aggregated_chunks, start=1):
        doc_id = chunk.get("document_id")
        paper_info = paper_map.get(doc_id)

        paper_title = paper_info.title if paper_info and paper_info.title else f"Document #{doc_id}"
        authors = paper_info.authors if paper_info and paper_info.authors else "Unknown Authors"
        year = paper_info.year if paper_info and paper_info.year else ""

        sec_name = chunk.get("section", "General")
        page_num = chunk.get("page", 1)

        doc_label = f"Doc {idx} ({sec_name}, p. {page_num})"

        enriched_chunk = {
            "doc_label": doc_label,
            "text": chunk.get("text", ""),
            "document_id": doc_id,
            "title": paper_title,
            "authors": authors,
            "year": year,
            "section": sec_name,
            "page": page_num,
            "rerank_score": chunk.get("rerank_score", 0.0),
            "rrf_score": chunk.get("rrf_score", 0.0)
        }

        context_chunks.append(enriched_chunk)
        sources.append({
            "doc_label": doc_label,
            "document_id": doc_id,
            "title": paper_title,
            "authors": authors,
            "year": year,
            "section": sec_name,
            "page": page_num,
            "snippet": chunk.get("text", "")[:280] + "...",
            "rerank_score": chunk.get("rerank_score", 0.0),
            "rrf_score": chunk.get("rrf_score", 0.0)
        })

    state.retrieved_chunks = context_chunks
    state.sources = sources
    return state

def node_evaluate_evidence(state: ResearchGraphState) -> ResearchGraphState:
    """
    Evaluates evidence sufficiency across retrieved excerpts.
    """
    chunk_count = len(state.retrieved_chunks)
    sections_found = list(set(c["section"] for c in state.retrieved_chunks)) if chunk_count > 0 else []

    state.evidence_evaluation = {
        "sufficient": chunk_count > 0,
        "total_excerpts": chunk_count,
        "sections_covered": sections_found
    }
    return state

def node_synthesize_answer(state: ResearchGraphState) -> ResearchGraphState:
    """
    Synthesizes structured academic answer with section citations.
    """
    if state.final_answer:
        return state

    if not state.retrieved_chunks:
        state.final_answer = "No relevant excerpts available to synthesize answer."
        return state

    try:
        llm = get_llm_provider()
        
        excerpts_formatted = ""
        for c in state.retrieved_chunks:
            excerpts_formatted += f"[{c['doc_label']}] Title: {c['title']} ({c['year']})\nExcerpt: {c['text']}\n\n"

        prompt = f"""You are ScholarPulse Research Intelligence Agent.
Answer the user's research query thoroughly based strictly on the provided document excerpts.
Always cite your sources using section-grounded inline bracket tags like [{state.retrieved_chunks[0]['doc_label']}] whenever making assertions.
If the excerpts do not contain sufficient evidence, clearly specify what is missing.

=== Document Excerpts ===
{excerpts_formatted}

User Research Query: {state.query}
Structured Academic Answer:"""

        state.final_answer = llm.generate_answer(state.query, state.retrieved_chunks)

    except Exception as e:
        state.final_answer = f"Could not generate LLM answer: {str(e)}"

    return state

def run_research_graph(project_id: int, query: str, db: Session) -> Dict[str, Any]:
    """
    Executes the multi-step LangGraph reasoning pipeline:
    Decompose Query -> Retrieve Evidence -> Evaluate Evidence -> Synthesize Answer.
    """
    state = ResearchGraphState(project_id=project_id, query=query)
    state = node_decompose_query(state)
    state = node_retrieve_evidence(state, db=db)
    state = node_evaluate_evidence(state)
    state = node_synthesize_answer(state)

    return {
        "answer": state.final_answer,
        "sources": state.sources,
        "evaluation": state.evidence_evaluation,
        "sub_queries": state.sub_queries
    }
