from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db import get_db
from app.dependencies import get_current_user
from app.models import Project, User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])

def owned(pid, user, db):
    p = db.scalar(select(Project).where(Project.id == pid, Project.owner_id == user.id))
    if not p: raise HTTPException(404, "Project not found")
    return p

@router.get("", response_model=list[ProjectResponse])
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return list(db.scalars(select(Project).where(Project.owner_id == user.id).order_by(Project.updated_at.desc())))

@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(payload: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = Project(owner_id=user.id, name=payload.name.strip(), description=payload.description.strip(), research_question=payload.research_question.strip())
    db.add(p); db.commit(); db.refresh(p)
    return p

@router.get("/{pid}", response_model=ProjectResponse)
def get_project(pid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return owned(pid, user, db)

@router.patch("/{pid}", response_model=ProjectResponse)
def update_project(pid: int, payload: ProjectUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = owned(pid, user, db)
    for key, value in payload.model_dump(exclude_unset=True).items():
        if value is not None: setattr(p, key, value.strip())
    db.commit(); db.refresh(p)
    return p

@router.delete("/{pid}", status_code=204)
def delete_project(pid: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = owned(pid, user, db); db.delete(p); db.commit()
