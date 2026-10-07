# API Plan

## Current
GET /health
GET /health/services

## Planned
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me

GET /api/projects
POST /api/projects
GET /api/projects/{project_id}
PATCH /api/projects/{project_id}
DELETE /api/projects/{project_id}

POST /api/projects/{project_id}/papers/upload
GET /api/projects/{project_id}/papers
GET /api/papers/{paper_id}

GET /api/projects/{project_id}/dashboard
GET /api/projects/{project_id}/insights/*
GET /api/projects/{project_id}/citations/*
POST /api/projects/{project_id}/compare
GET /api/projects/{project_id}/relevance
GET /api/projects/{project_id}/reading-priority
POST /api/projects/{project_id}/ask
