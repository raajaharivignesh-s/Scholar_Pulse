import logging
from app.workers.celery_app import celery_app
from app.services.paper_service import process_paper_background

logger = logging.getLogger(__name__)

@celery_app.task(name="app.workers.paper_tasks.process_paper_task", bind=True, max_retries=2)
def process_paper_task(self, paper_id: int):
    """
    Celery background worker task that delegates to the optimized paper processor.
    """
    try:
        logger.info(f"Celery worker received processing task for paper {paper_id}")
        process_paper_background(paper_id)
        return {"status": "SUCCESS", "paper_id": paper_id}
    except Exception as exc:
        logger.exception(f"Celery task failed for paper {paper_id}: {exc}")
        raise self.retry(exc=exc, countdown=10)
