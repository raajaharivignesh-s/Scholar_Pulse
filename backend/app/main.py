from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.api.auth import router as auth_router
from app.api.projects import router as projects_router
from app.api.papers import router as papers_router
from app.api.ask import router as ask_router
from app.api.insights import router as insights_router
from app.api.export import router as export_router
from app.db import Base, engine
from app import models

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE projects DROP COLUMN IF EXISTS research_question;"))
        conn.commit()
    yield

app = FastAPI(title="ScholarPulse API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth_router)
app.include_router(export_router)
app.include_router(insights_router)
app.include_router(projects_router)
app.include_router(papers_router)
app.include_router(ask_router)

@app.get("/health")
def health():
    return {"status":"ok","service":"scholarpulse-backend","version":"0.2.0"}

