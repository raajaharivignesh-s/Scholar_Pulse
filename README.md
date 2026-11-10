# ScholarPulse – AI-Powered Academic Research Intelligence Platform

<p align="center">
  <strong>A Multi-Agent AI System for Academic Paper Analysis and Citation Tracking</strong>
</p>

<p align="center">
  An intelligent research workspace that transforms academic publications into structured knowledge using AI, semantic search, and evidence-grounded question answering.
</p>

---

## Overview

**ScholarPulse** is an AI-powered academic research workspace designed to simplify the process of reviewing, understanding, and analyzing research papers.

Traditional literature reviews require researchers to manually read multiple publications, extract important information, compare methodologies, examine findings, and track citation relationships. This process is often time-consuming and makes it difficult to identify meaningful connections across studies.

ScholarPulse addresses these challenges by combining Natural Language Processing (NLP), Retrieval-Augmented Generation (RAG), semantic search, and Multi-Agent AI orchestration into a unified platform.

Users can upload academic papers, automatically extract important research information, ask questions using natural language, explore citation relationships, and compare multiple publications through AI-assisted analysis.

The platform uses **LangGraph** to coordinate specialized AI analysis tasks and **Gemini** for language-based interpretation and response generation.

## Key Features

- **AI-Powered Academic Paper Intelligence** – Automatically extracts and organizes research problems, objectives, methodologies, datasets, results, and limitations from uploaded academic papers.
- **Evidence-Grounded Research Question Answering** – Uses semantic retrieval and RAG to generate context-aware answers supported by relevant academic paper content.
- **Specialized Multi-Agent Research Analysis** – Coordinates dedicated AI agents for paper understanding, methodology examination, evidence identification, and research comparison.
- **Integrated Cross-Paper Analysis** – Analyzes multiple research papers to identify common methodologies, datasets, findings, and recurring research limitations.
- **Intelligent Citation Tracking** – Extracts and organizes citation information to explore relationships between research publications.
- **Semantic Research Discovery** – Enables meaning-based searches across uploaded academic papers without depending exclusively on exact keyword matches.
- **Structured Knowledge Management** – Organizes extracted research information into structured paper profiles and searchable document representations.
- **Unified Research Dashboard** – Provides a centralized workspace for paper management, research insights, and AI-assisted analysis.

## System Architecture

ScholarPulse follows a modular architecture that integrates document processing, structured knowledge storage, semantic retrieval, and coordinated AI analysis.

### High-Level Workflow

```mermaid
flowchart TD
    A[Researcher] --> B[ScholarPulse Frontend]
    B --> C[Paper Upload and Validation]
    C --> D[Document Processing]
    D --> E[Text Extraction and Preprocessing]
    E --> F[Chunking and Metadata Extraction]

    F --> G[Knowledge Preparation]
    G --> H[Structured Paper Profiles]
    G --> I[Embedding Generation]

    H --> J[(PostgreSQL)]
    I --> K[(Qdrant)]

    B --> L[Research Question]
    L --> M[FastAPI Backend]
    M --> N[Semantic Retrieval]
    N --> K

    N --> O[Retrieved Evidence]
    O --> P[LangGraph Agent Orchestration]
    P --> Q[Paper Understanding Agent]
    P --> R[Methodology Agent]
    P --> S[Evidence Agent]
    P --> T[Citation and Comparison Analysis]

    Q --> U[Gemini LLM]
    R --> U
    S --> U
    T --> U

    U --> V[Evidence-Grounded Response]
    V --> B
```

### Workflow Explanation

1. **Paper Upload:** Users upload academic research papers through the application.
2. **Document Processing:** The backend validates documents and extracts their textual content.
3. **Text Preprocessing:** Extracted content is cleaned, divided into meaningful chunks, and associated with document metadata.
4. **Knowledge Preparation:** Important research information is organized into structured paper profiles, and document chunks are converted into embeddings.
5. **Knowledge Storage:** PostgreSQL stores structured information, while Qdrant stores vector representations for semantic retrieval.
6. **Semantic Retrieval:** Relevant passages are retrieved based on the meaning of the user's question.
7. **AI Agent Coordination:** LangGraph coordinates specialized research analysis tasks using the retrieved context.
8. **Response Generation:** Gemini supports the interpretation of retrieved evidence and generates research-related responses.
9. **Results Presentation:** The frontend displays answers and available research insights.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend Framework | Next.js |
| UI Library | React |
| Programming Language | TypeScript |
| Backend Framework | Python, FastAPI |
| Large Language Model | Google Gemini |
| Agent Orchestration | LangGraph |
| Relational Database | PostgreSQL |
| Vector Database | Qdrant |
| AI Architecture | Retrieval-Augmented Generation (RAG) |
| Document Processing | PDF Text Extraction |
| Source Control | Git, GitHub |
| Containerization | Docker |

## Multi-Agent AI Architecture

ScholarPulse uses a specialized agent-based approach to organize academic research analysis into smaller responsibilities.

The orchestration workflow is implemented using LangGraph, while Gemini supports language-based reasoning and response generation.

### Specialized AI Agents

| Agent | Responsibility |
|---|---|
| Paper Understanding Agent | Identifies research problems, objectives, contributions, and important paper information. |
| Methodology Agent | Examines research methodologies, models, datasets, and experimental procedures. |
| Evidence Agent | Identifies relevant supporting passages and evidence from academic publications. |
| Citation Analysis Agent | Processes reference information and explores citation relationships. |
| Cross-Paper Analysis Agent | Compares research information across multiple academic publications. |

The agents work with retrieved document context according to the requirements of the user's query. Their outputs are coordinated to produce a unified research response.

## Retrieval-Augmented Generation (RAG)

ScholarPulse uses Retrieval-Augmented Generation to support evidence-grounded question answering.

Instead of relying entirely on the language model's internal knowledge, the system retrieves relevant passages from the uploaded research collection and supplies them as context for response generation.

### RAG Pipeline

```mermaid
flowchart TD
    A[User Question] --> B[Query Embedding]
    B --> C[Qdrant Vector Search]
    C --> D[Relevant Document Chunks]
    D --> E[Context Preparation]
    E --> F[LangGraph Analysis Workflow]
    F --> G[Gemini Response Generation]
    G --> H[Evidence-Grounded Answer]
```

### RAG Process

1. The user submits a natural-language question.
2. The query is converted into a vector representation.
3. Qdrant retrieves semantically relevant document chunks.
4. Retrieved passages are prepared as contextual information.
5. The LangGraph workflow coordinates the required analysis tasks.
6. Gemini generates a response using the supplied context.
7. The response is returned to the frontend.

The use of retrieved evidence improves the traceability of generated responses but does not guarantee complete factual correctness. Important research claims should be verified against the original publications.

## Database Architecture

ScholarPulse uses a combination of relational and vector databases to manage academic research information.

### PostgreSQL

PostgreSQL is used for structured data storage, including:

- Academic paper information
- Structured paper profiles
- Document metadata
- Related application records

### Qdrant

Qdrant is used for vector-based knowledge storage and semantic retrieval.

Its responsibilities include:

- Storing document embeddings
- Maintaining searchable research chunks
- Performing similarity-based searches
- Retrieving relevant passages for RAG

### Two-Level Knowledge Representation

ScholarPulse organizes research information through two complementary representations:

| Knowledge Layer | Description |
|---|---|
| Structured Knowledge | Stores organized paper information such as research objectives, methodologies, datasets, findings, and limitations. |
| Vector Knowledge | Stores document chunk embeddings to support semantic retrieval and evidence discovery. |

## Project Structure

The following is a conceptual project structure. Adjust directory names to match the actual repository.

```text
Scholar_Pulse/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── public/
│   ├── types/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── agents/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── database/
│   │   └── ...
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── ...
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Getting Started

Follow the instructions below to configure and run ScholarPulse locally.

### Prerequisites

Install the following software before starting:

- Node.js and npm
- Python 3.11 or a compatible project-supported version
- PostgreSQL
- Docker Desktop
- Git
- Google Gemini API key

Make sure Docker Desktop and the required database services are running before starting the application.

### 1. Clone the Repository

```bash
git clone https://github.com/raajaharivignesh-s/Scholar_Pulse.git
```

Navigate to the project directory:

```bash
cd Scholar_Pulse
```

### 2. Configure Environment Variables

Create the required environment files based on the configuration expected by the frontend and backend.

Example backend environment configuration:

```env
POSTGRES_DB=scholarpulse
POSTGRES_USER=scholarpulse
POSTGRES_PASSWORD=scholarpulse_dev
POSTGRES_PORT=5432

REDIS_PORT=6379

QDRANT_PORT=6333
QDRANT_GRPC_PORT=6334

BACKEND_PORT=8000
FRONTEND_PORT=3000

DATABASE_URL=postgresql+psycopg://scholarpulse:scholarpulse_dev@postgres:5432/scholarpulse
REDIS_URL=redis://redis:6379/0
QDRANT_URL=http://qdrant:6333

JWT_SECRET=change-me-in-development
GEMINI_API_KEY=your_gemini_api_key_here
LLM_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-3.5-flash
```

**Important:**

- Replace example values with your actual configuration.
- Use the environment variable names expected by your application code.
- Configure database credentials according to your PostgreSQL setup.
- Never commit API keys, database passwords, or other sensitive credentials to GitHub.
- Keep `.env` files in `.gitignore`.

### 3. Start Database Services

If the repository contains a Docker Compose configuration for PostgreSQL and Qdrant, start the configured services using:

```bash
docker compose up -d
```

Check running containers:

```bash
docker compose ps
```

View container logs:

```bash
docker compose logs
```

Use the service configuration defined in your actual `docker-compose.yml`.

### 4. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\venv\Scripts\Activate.ps1
```

**Linux / macOS:**

```bash
source venv/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI application:

```bash
uvicorn app.main:app --reload
```

The backend should be accessible at:

```text
http://localhost:8000
```

FastAPI interactive API documentation:

```text
http://localhost:8000/docs
```

Use the actual ASGI application import path configured in the repository if it differs from `app.main:app`.

### 5. Frontend Setup

Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend should be accessible at the URL printed by the development server, commonly:

```text
http://localhost:3000
```

Ensure that the frontend API configuration points to the running backend.

## Running the Complete Application

For local development, the general startup sequence is:

| Step | Service | Command |
|---|---|---|
| 1 | Database Services | `docker compose up -d` |
| 2 | Backend | `uvicorn app.main:app --reload` |
| 3 | Frontend | `npm run dev` |

Start each service in its respective terminal or using the deployment configuration provided by the repository.

## Evaluation and Testing

ScholarPulse can be evaluated using functional and AI-related testing methods.

The following metrics are relevant to assessing system performance:

| Metric | Purpose |
|---|---|
| Precision@K | Measures the relevance of retrieved passages among the top K results. |
| Recall@K | Measures how many relevant passages are retrieved within the top K results. |
| Mean Reciprocal Rank (MRR) | Evaluates the ranking position of the first relevant result. |
| Information Extraction Accuracy | Measures the correctness of extracted research information. |
| Answer Groundedness | Measures how well generated factual claims are supported by retrieved evidence. |
| Citation Correctness | Evaluates the correctness of extracted and verified citation information. |
| Response Time | Measures the time taken to process requests and generate responses. |

Testing should cover document processing, database operations, semantic retrieval, AI-generated answers, citation information, and complete user workflows.

Actual performance values should be reported only after executing the corresponding tests.

## Security and Data Handling

ScholarPulse processes user-uploaded academic documents and associated research information.

Important security considerations include:

- Protecting API keys and database credentials through environment variables.
- Validating uploaded documents before processing.
- Restricting access to authorized user documents.
- Handling database and external AI-service failures.
- Avoiding exposure of sensitive document content.
- Maintaining consistency between structured records and vector entries.

The actual security controls depend on the implemented application configuration.

## Future Enhancements

Potential directions for extending ScholarPulse include:

- **Advanced Document Understanding:** Improve extraction from scanned PDFs, tables, equations, and complex publication layouts.
- **Enhanced Citation Verification:** Integrate scholarly metadata services to validate bibliographic references.
- **Research Gap Discovery:** Identify potential research gaps through deeper comparison of related publications.
- **Improved Hallucination Detection:** Introduce additional verification mechanisms for unsupported AI-generated claims.
- **Scholarly Database Integration:** Connect with academic publication databases to expand research discovery.
- **Advanced Research Visualizations:** Provide richer visual exploration of citation networks and relationships between publications.
- **Performance Optimization:** Improve retrieval efficiency and reduce processing and response latency.
- **Collaborative Research Workspace:** Support shared paper collections and collaborative literature-review activities.

## Contributors

ScholarPulse was developed as a collaborative academic project.

| Team Member | Role |
|---|---|
| PRASHANNA S R | Frontend Developer and UI/UX Designer |
| RAAJA HARI VIGNESH S | Backend Developer and Database Engineer |
| ROHIT B G | AI/ML Engineer and Research Analysis Developer |

## Project Repository

**GitHub:**  
https://github.com/raajaharivignesh-s/Scholar_Pulse

## Acknowledgements

We would like to express our sincere gratitude to our project guide, faculty members, and institution for their continuous guidance and support throughout the development of ScholarPulse.

We also acknowledge the developers and research communities behind the open-source frameworks, databases, and AI technologies used in this project.

## License

This project is developed for academic and educational purposes.

A formal open-source license can be added to the repository if the project is intended for public reuse and distribution.

---

<p align="center">
  <strong>ScholarPulse</strong><br/>
  Transforming Academic Literature into Structured Research Intelligence.
</p>
