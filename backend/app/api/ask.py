import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.dependencies import get_current_user
from app.db import get_db
from app.models import Project
from app.agents.research_agent import CitationResearchAgent

router = APIRouter(prefix="/api/projects", tags=["ask"])

class AskRequest(BaseModel):
    query: str
    mode: Optional[str] = "deep"  # "deep" (Gemini LLM) or "turbo" (Instant Grounded Synthesis)

class SourceItem(BaseModel):
    doc_label: str
    document_id: int
    title: str
    authors: Optional[str] = ""
    year: Optional[int] = None
    snippet: str
    rrf_score: Optional[float] = 0.0

    @field_validator('year', mode='before')
    @classmethod
    def parse_year(cls, v):
        if v == "" or v is None:
            return None
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                return None
        return v

class AskResponse(BaseModel):
    answer: str
    sources: List[SourceItem]

@router.post("/{project_id}/ask", response_model=AskResponse)
def ask_question(
    project_id: int, 
    req: AskRequest, 
    db: Session = Depends(get_db), 
    current_user = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")

    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        agent = CitationResearchAgent(db=db)
        result = agent.run_research_query(project_id=project_id, query=req.query, mode=req.mode or "deep")
        return AskResponse(answer=result["answer"], sources=result["sources"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Research agent error: {str(e)}")

@router.post("/{project_id}/ask/stream")
def ask_question_stream(
    project_id: int,
    req: AskRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")

    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    agent = CitationResearchAgent(db=db)

    def event_generator():
        try:
            for event in agent.run_research_query_stream(project_id=project_id, query=req.query, mode=req.mode or "deep"):
                yield json.dumps(event) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "error": str(e)}) + "\n"

    return StreamingResponse(
        event_generator(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )
