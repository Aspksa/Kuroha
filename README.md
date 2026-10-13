# Kuroha

Kuroha is a small Python core with a FastAPI HTTP layer and a React/TypeScript web client.

## Stack

- Python 3.11+
- FastAPI
- React 18
- TypeScript
- Vite

## Run the API

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn kuroha.app:app --reload
```

The API is available at `http://localhost:8000`.

## Run the web app

```bash
cd web
npm install
npm run dev
```

The web app is available at `http://localhost:5173` and proxies `/api` to the local API.

## API

- `GET /api/health`
- `GET /api/info`
- `POST /api/chat`

Example:

```json
{
  "message": "hello",
  "session_id": "optional-session-id"
}
```

## Core

The core lives in `src/kuroha/engine.py`. It is intentionally framework-independent, so model providers, tools, persistence, auth and streaming can be added without coupling them to FastAPI or the browser UI.

## Tests

```bash
pytest
cd web && npm run build
```
