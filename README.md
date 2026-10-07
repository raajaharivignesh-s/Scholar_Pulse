# ScholarPulse

ScholarPulse is a project-based academic research intelligence workspace.

## Milestone 1 — Foundation

This scaffold provides:

- Next.js + TypeScript frontend
- FastAPI backend
- PostgreSQL
- Redis
- Qdrant
- Docker Compose
- Environment configuration
- Backend health endpoint
- Frontend shell placeholder

## Architecture

Browser
→ Next.js
→ FastAPI
→ PostgreSQL / Redis / Qdrant

Celery workers will be added in the next milestone for asynchronous PDF processing.

## Start

1. Copy `.env.example` to `.env`.
2. Run:

```bash
docker compose up --build
```

3. Open:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Backend health: http://localhost:8000/health
- Qdrant: http://localhost:6333/dashboard

## Important

This is the foundation only. PDF ingestion, BGE-M3, BM25, RRF, reranking, LangGraph agents, and RAG are intentionally not wired in yet.
