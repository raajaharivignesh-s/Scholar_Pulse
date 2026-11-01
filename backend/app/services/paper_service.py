import os
import hashlib
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Optional
from fastapi import UploadFile, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models import Paper, Project
from app.db import SessionLocal
from app.config import settings

logger = logging.getLogger(__name__)
STORAGE_DIR = os.environ.get("STORAGE_DIR", "/storage/papers")

# Dedicated thread pool for async paper processing when Celery is not configured
_processing_executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="scholarpulse-worker")

def calculate_file_hash(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()

def process_paper_background(paper_id: int):
    """
    Dedicated background processor for paper ingestion.
    Extracts structured text via PyMuPDF (fast C engine),
    chunks sections while skipping heavy references embeddings,
    and upserts into Qdrant vector index.
    """
    from app.ingestion.pdf_parser import extract_structured_pdf
    from app.ingestion.chunker import process_structured_document, process_document
    from app.retrieval.qdrant_store import store_chunks

    db = SessionLocal()
    try:
        paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if not paper:
            logger.error(f"Paper {paper_id} not found in database for processing")
            return

        logger.info(f"Background processing started for paper {paper_id} ({paper.title})")
        paper.status = "PROCESSING"
        db.commit()

        if not paper.file_path or not os.path.exists(paper.file_path):
            logger.error(f"File path missing or invalid for paper {paper_id}: {paper.file_path}")
            paper.status = "FAILED"
            db.commit()
            return

        structured = extract_structured_pdf(paper.file_path)
        text = structured.get("text")
        if not text or not text.strip():
            logger.warning(f"Extracted empty text for paper {paper_id}")
            paper.status = "FAILED_EXTRACTION"
            db.commit()
            return

        # Update paper metadata from PDF
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
            chunks = process_structured_document(sections, document_id=paper.id, project_id=paper.project_id)
        else:
            chunks = process_document(text, document_id=paper.id, project_id=paper.project_id)

        if chunks:
            store_chunks(chunks)
            paper.status = "PROCESSED"
            try:
                from app.retrieval.bm25_search import invalidate_project_chunks_cache
                invalidate_project_chunks_cache(paper.project_id)
            except Exception:
                pass
            logger.info(f"Successfully processed paper {paper_id} with {len(chunks)} chunks")
        else:
            paper.status = "FAILED"

        db.commit()
    except Exception as exc:
        logger.error(f"Background processing failed for paper {paper_id}: {exc}", exc_info=True)
        try:
            paper = db.query(Paper).filter(Paper.id == paper_id).first()
            if paper:
                paper.status = "FAILED"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()

async def upload_paper(
    db: Session,
    project_id: int,
    user_id: int,
    file: UploadFile,
    background_tasks: Optional[BackgroundTasks] = None
) -> Paper:
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
        display_name=file.filename,
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

    # Dispatch Celery if explicitly configured, otherwise execute via non-blocking BackgroundTasks
    dispatched = False
    use_celery = getattr(settings, "use_celery", True) and os.environ.get("USE_CELERY", "true").lower() in ("true", "1")
    if use_celery:
        try:
            from app.workers.paper_tasks import process_paper_task
            process_paper_task.delay(paper.id)
            dispatched = True
            logger.info(f"Dispatched Celery task for paper {paper.id}")
        except Exception as e:
            logger.warning(f"Could not dispatch Celery task ({e}). Falling back to BackgroundTasks...")

    if not dispatched:
        if background_tasks is not None:
            background_tasks.add_task(process_paper_background, paper.id)
            logger.info(f"Scheduled FastAPI background processing task for paper {paper.id}")
        else:
            _processing_executor.submit(process_paper_background, paper.id)
            logger.info(f"Submitted paper {paper.id} to ThreadPoolExecutor")

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


def get_paper_file(
    db: Session,
    project_id: int,
    user_id: int,
    paper_id: int
) -> tuple[str, str]:
    project = db.query(Project).filter(Project.id == project_id, Project.owner_id == user_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or unauthorized")
    paper = db.query(Paper).filter(Paper.id == paper_id, Paper.project_id == project_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if not paper.file_path or not os.path.exists(paper.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found on disk")
    filename = paper.display_name or paper.title or "paper.pdf"
    if not filename.lower().endswith(".pdf"):
        filename += ".pdf"
    return paper.file_path, filename