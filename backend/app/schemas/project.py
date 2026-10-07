from datetime import datetime
from pydantic import BaseModel, Field

class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    description: str = Field(default="", max_length=5000)
    research_question: str = Field(default="", max_length=10000)

class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    research_question: str | None = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str
    research_question: str
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
