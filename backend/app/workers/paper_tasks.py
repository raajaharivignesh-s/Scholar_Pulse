import logging
from app.workers.celery_app import celery_app
from app.db import SessionLocal
from app.models import Paper
from app.ingestion.pdf_parser import extract_structured_pdf
from app.ingestion.chunker import process_structured_document, process_document
from app.retrieval.qdrant_store import store_chunks

logger = logging.getLogger(__name__)

@celery_app.task(name="app.workers.paper_tasks.process_paper_task", bind=True, max_retries=2)
def process_paper_task(self, paper_id: int):
    """
    Background worker task to extract structured sections & metadata from PDF, 
    generate section-aware chunks, and store vectors in Qdrant.
    """
    db = SessionLocal()
    try:
        paper = db.query(Paper).filter(Paper.id == paper_id).first()
        if not paper:
            logger.error(f"Paper with ID {paper_id} not found.")
            return {"status": "FAILED", "reason": "Paper not found"}

        logger.info(f"Starting processing for paper {paper_id} (Path: {paper.file_path})")
        paper.status = "PROCESSING"
        db.commit()

        if not paper.file_path:
            paper.status = "FAILED"
            db.commit()
            return {"status": "FAILED", "reason": "Missing file path"}

        structured = extract_structured_pdf(paper.file_path)
        text = structured.get("text")

        if not text or not text.strip():
            logger.warning(f"Extracted empty text from paper {paper_id}")
            paper.status = "FAILED_EXTRACTION"
            db.commit()
            return {"status": "FAILED_EXTRACTION"}

        # Auto-update paper metadata from PDF extraction if empty/default
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
            logger.info(f"Successfully processed paper {paper_id} with {len(chunks)} structured chunks.")
        else:
            paper.status = "FAILED"

        db.commit()
        return {"status": paper.status, "chunks": len(chunks) if chunks else 0}

    except Exception as exc:
        logger.exception(f"Error processing paper {paper_id}: {exc}")
        if 'paper' in locals() and paper:
            paper.status = "FAILED"
            db.commit()
        raise self.retry(exc=exc, countdown=10)
    finally:
        db.close()
