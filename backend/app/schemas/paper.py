from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class PaperBase(BaseModel):
    title: Optional[str] = None
    authors: Optional[str] = None
    year: Optional[int] = None
    doi: Optional[str] = None

class PaperOut(PaperBase):
    id: int
    project_id: int
    file_hash: str
    file_path: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
