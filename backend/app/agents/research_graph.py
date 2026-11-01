import re
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models import Paper, Project
from app.retrieval.hybrid_retriever import hybrid_search
from app.llm.gemini_provider import get_llm_provider, GeminiProvider

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
    """
    base = state.query.strip()
    sub_q = [
        base,
        f"{base} methodology and experimental approach",
        f"{base} key findings and comparative results"
    ]
    state.sub_queries = sub_q
    return state

def node_retrieve_evidence(state: ResearchGraphState, db: Session, top_k_per_sub: int = 3) -> ResearchGraphState:
    """
    Executes hybrid retrieval across sub-questions, deduplicates context passages, 
    and enriches with Paper title, authors, year, section, and page metadata.
    """
    project = db.query(Project).filter(Project.id == state.project_id).first()
    if not project:
        state.final_answer = "Project not found."
        return state

    papers = db.query(Paper).filter(Paper.project_id == state.project_id).order_by(Paper.id.asc()).all()
    paper_map = {paper.id: paper for paper in papers}
    paper_id_to_num = {paper.id: idx for idx, paper in enumerate(papers, start=1)}

    # Detect if query explicitly targets specific papers (e.g. "paper 1", "paper 3")
    target_nums = [int(n) for n in re.findall(r"paper\s*(\d+)", state.query, re.I)]
    target_doc_ids = set()
    target_num_map = {}
    if target_nums and papers:
        for num in target_nums:
            if 1 <= num <= len(papers):
                doc_id = papers[num - 1].id
                target_doc_ids.add(doc_id)
                target_num_map[doc_id] = num

    seen_keys = set()
    aggregated_chunks = []

    # When specific papers are targeted, expand retrieval depth to ensure all target docs are covered
    search_k = max(12, len(target_doc_ids) * 6) if target_doc_ids else top_k_per_sub

    for sq in state.sub_queries:
        hits = hybrid_search(query=sq, project_id=state.project_id, top_k=search_k, rerank=True)
        for chunk in hits:
            doc_id = chunk.get("document_id", 0)
            if target_doc_ids and doc_id not in target_doc_ids:
                continue
            idx = chunk.get("chunk_index", 0)
            key = (doc_id, idx)
            if key not in seen_keys:
                seen_keys.add(key)
                aggregated_chunks.append(chunk)

    # Ensure every targeted document has representative evidence
    if target_doc_ids:
        found_target_ids = {c.get("document_id") for c in aggregated_chunks}
        missing_ids = target_doc_ids - found_target_ids
        if missing_ids:
            from app.retrieval.bm25_search import fetch_project_chunks
            all_chunks = fetch_project_chunks(state.project_id)
            for m_id in missing_ids:
                doc_chunks = [c for c in all_chunks if c.get("document_id") == m_id]
                # Prioritize Abstract or Methodology for architecture & tech stack comparison
                sorted_doc_chunks = sorted(
                    doc_chunks,
                    key=lambda c: 0 if c.get("section") in ["Abstract", "Methodology"] else 1
                )
                for chunk in sorted_doc_chunks[:2]:
                    idx = chunk.get("chunk_index", 0)
                    key = (m_id, idx)
                    if key not in seen_keys:
                        seen_keys.add(key)
                        aggregated_chunks.append(chunk)

    # Safe fallback if targeted filtering yielded zero hits
    if not aggregated_chunks and target_doc_ids:
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
        paper_info = paper_map.get(doc_id) if doc_id is not None else None

        paper_title = paper_info.title if paper_info and paper_info.title else f"Document #{doc_id}"
        authors = paper_info.authors if paper_info and paper_info.authors else "Unknown Authors"
        year = paper_info.year if paper_info and paper_info.year else ""

        sec_name = chunk.get("section", "General")
        page_num = chunk.get("page", 1)

        paper_num = target_num_map.get(doc_id, paper_id_to_num.get(doc_id))
        if paper_num is not None:
            doc_label = f"Paper {paper_num} ({sec_name}, p. {page_num})"
        else:
            doc_label = f"Doc {idx} ({sec_name}, p. {page_num})"

        enriched_chunk = {
            "doc_label": doc_label,
            "text": chunk.get("text", ""),
            "document_id": doc_id,
            "paper_num": paper_num,
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
            "paper_num": paper_num,
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

def node_synthesize_answer(state: ResearchGraphState, mode: str = "deep") -> ResearchGraphState:
    """
    Synthesizes structured academic answer with section citations.
    """
    if state.final_answer:
        return state

    if not state.retrieved_chunks:
        state.final_answer = "No relevant excerpts available to synthesize answer."
        return state

    try:
        llm: GeminiProvider = get_llm_provider()
        state.final_answer = llm.generate_answer(state.query, state.retrieved_chunks, mode=mode)
    except Exception as e:
        state.final_answer = f"Could not generate LLM answer: {str(e)}"

    return state

def run_research_graph(project_id: int, query: str, db: Session, mode: str = "deep") -> Dict[str, Any]:
    """
    Executes the multi-step LangGraph reasoning pipeline:
    Decompose Query -> Retrieve Evidence -> Evaluate Evidence -> Synthesize Answer.
    """
    state = ResearchGraphState(project_id=project_id, query=query)
    state = node_decompose_query(state)
    state = node_retrieve_evidence(state, db=db)
    state = node_evaluate_evidence(state)
    state = node_synthesize_answer(state, mode=mode)

    return {
        "answer": state.final_answer,
        "sources": state.sources,
        "evaluation": state.evidence_evaluation,
        "sub_queries": state.sub_queries
    }

def run_research_graph_stream(project_id: int, query: str, db: Session, mode: str = "deep"):
    """
    Streams research response tokens with sub-second time-to-first-token.
    """
    state = ResearchGraphState(project_id=project_id, query=query)
    state = node_decompose_query(state)
    state = node_retrieve_evidence(state, db=db)
    state = node_evaluate_evidence(state)

    yield {"type": "sources", "sources": state.sources}

    if not state.retrieved_chunks:
        yield {"type": "token", "token": state.final_answer or "No relevant excerpts found in the uploaded papers."}
        yield {"type": "done"}
        return

    llm: GeminiProvider = get_llm_provider()
    if mode == "turbo":
        ans = llm.generate_answer(state.query, state.retrieved_chunks, mode="turbo")
        yield {"type": "token", "token": ans}
        yield {"type": "done"}
        return

    for token in llm.generate_answer_stream(state.query, state.retrieved_chunks):
        yield {"type": "token", "token": token}
    yield {"type": "done"}
