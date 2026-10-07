from fastapi import APIRouter, Depends, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import get_db
from app.dependencies import get_current_user
from app.models import User
from app.schemas.paper import PaperOut
from app.services import paper_service

router = APIRouter(prefix="/api/projects/{project_id}/papers", tags=["papers"])

@router.post("", response_model=PaperOut)
async def upload_paper(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await paper_service.upload_paper(db, project_id, current_user.id, file)

@router.get("", response_model=List[PaperOut])
def list_papers(
    project_id: int,
    status: Optional[str] = Query(None, description="Filter by status (e.g. PROCESSED, PROCESSING, QUEUED, FAILED)"),
    search: Optional[str] = Query(None, description="Search term across title, authors, or DOI"),
    year_min: Optional[int] = Query(None, description="Minimum publication year"),
    year_max: Optional[int] = Query(None, description="Maximum publication year"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return paper_service.list_papers(
        db,
        project_id,
        current_user.id,
        status=status,
        search=search,
        year_min=year_min,
        year_max=year_max
    )

