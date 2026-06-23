# SmartSIM MVP

SmartSIM is a telecom SIM marketplace and customer self-care platform.

## Project Structure

- `backend/`: FastAPI backend service
- `frontend/`: React + Vite + TypeScript frontend service
- `docker-compose.yml`: Multi-container Docker configuration for local development

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js (v18+ or v20+)
- Python (v3.10+)

### Running with Docker Compose

To start the entire application (Frontend, Backend, and PostgreSQL database) in development mode, run:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs (Swagger UI)**: http://localhost:8000/docs
- **Database**: Port 5432 (default credentials in docker-compose.yml)

### Local Development Setup

#### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows
   .\venv\Scripts\activate
   # On macOS/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the server (make sure you have a running PostgreSQL database):
   ```bash
   uvicorn app.main:app --reload
   ```

#### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
