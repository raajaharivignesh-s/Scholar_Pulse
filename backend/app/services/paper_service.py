from typing import Optional
from sqlalchemy import or_

import os
import hashlib
import logging
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.models import Paper, Project

logger = logging.getLogger(__name__)
STORAGE_DIR = os.environ.get("STORAGE_DIR", "/storage/papers")

def calculate_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()

async def upload_paper(db: Session, project_id: int, user_id: int, file: UploadFile) -> Paper:
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == user_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")

    file_hash = calculate_file_hash(content)

    existing = db.query(Paper).filter(Paper.project_id == project_id, Paper.file_hash == file_hash).first()
    if existing:
        raise HTTPException(status_code=400, detail="Paper already uploaded to this project")

    paper = Paper(
        project_id=project_id,
        file_hash=file_hash,
        file_path="",  
        status="QUEUED",
        title=file.filename
    )
    db.add(paper)
    db.flush()

    project_dir = os.path.join(STORAGE_DIR, str(project_id), str(paper.id))
    os.makedirs(project_dir, exist_ok=True)
    
    file_path = os.path.join(project_dir, "original.pdf")
    with open(file_path, "wb") as f:
        f.write(content)
        
    paper.file_path = file_path
    db.commit()
    db.refresh(paper)

    # Dispatch Celery async task, with graceful fallback to inline processing if Celery is offline
    try:
        from app.workers.paper_tasks import process_paper_task
        process_paper_task.delay(paper.id)
        logger.info(f"Dispatched Celery task for paper {paper.id}")
    except Exception as e:
        logger.warning(f"Could not dispatch Celery task ({e}). Running processing inline...")
        try:
            from app.ingestion.pdf_parser import extract_structured_pdf
            from app.ingestion.chunker import process_structured_document, process_document
            from app.retrieval.qdrant_store import store_chunks
            
            paper.status = "PROCESSING"
            db.commit()
            
            structured = extract_structured_pdf(file_path)
            text = structured.get("text")
            if text and text.strip():
                meta = structured.get("metadata", {})
                if meta.get("title") and (not paper.title or paper.title.endswith(".pdf")):
                    paper.title = meta["title"]
                if meta.get("authors") and not paper.authors:
                    paper.authors = meta["authors"]
                if meta.get("year") and not paper.year:
                    paper.year = meta["year"]
                if meta.get("doi") and not paper.doi:
                    paper.doi = meta["doi"]

                sections = structured.get("sections", [])
                if sections:
                    chunks = process_structured_document(sections, document_id=paper.id, project_id=project_id)
                else:
                    chunks = process_document(text, document_id=paper.id, project_id=project_id)

                if chunks:
                    store_chunks(chunks)
                    paper.status = "PROCESSED"
                else:
                    paper.status = "FAILED"
            else:
                paper.status = "FAILED_EXTRACTION"
        except Exception as inline_err:
            logger.error(f"Inline processing failed for paper {paper.id}: {inline_err}")
            paper.status = "FAILED"
        finally:
            db.commit()
            db.refresh(paper)
    
    return paper

def list_papers(
    db: Session,
    project_id: int,
    user_id: int,
    status: Optional[str] = None,
    search: Optional[str] = None,
    year_min: Optional[int] = None,
    year_max: Optional[int] = None
):
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == user_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")
    
    query = db.query(Paper).filter(Paper.project_id == project_id)
    
    if status and status.strip() and status != "ALL":
        query = query.filter(Paper.status == status.strip())
        
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Paper.title.ilike(term),
                Paper.authors.ilike(term),
                Paper.doi.ilike(term)
            )
        )
        
    if year_min is not None:
        query = query.filter(Paper.year >= year_min)
        
    if year_max is not None:
        query = query.filter(Paper.year <= year_max)

    return query.all()

