# Kuroha

Kuroha is a small Python core with a FastAPI HTTP layer and a React/TypeScript web client.

## Stack

- Python 3.11+
- FastAPI
- React 18
- TypeScript
- Vite

## Windows portable quick start

Kuroha can be started directly from a normal folder, another local drive, an external SSD/HDD, or a writable USB drive. The path may contain spaces.

Install Python 3.11+ and Node.js 20+, copy or clone the entire Kuroha folder to the storage device you want, then double-click:

```text
Kuroha.bat
```

The launcher:

- always resolves paths relative to its own folder instead of relying on the current drive;
- creates the Python virtual environment on the same storage device;
- keeps pip/npm caches inside the Kuroha folder;
- recreates a stale virtual environment if the folder was moved between machines or drives;
- installs Python and web dependencies when needed;
- starts the API and web development server in separate windows;
- automatically selects the first free API port starting at `8000`;
- automatically selects the first free web port starting at `5173`;
- passes the selected API address to the Vite proxy;
- opens the actual selected web address in the browser.

A writable storage device is required for first-run dependency installation and caches.

To validate prerequisites and free-port discovery without installing dependencies or starting Kuroha:

```bat
Kuroha.bat --check
```

## Run the API manually

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn kuroha.app:app --reload
```

The default API address is `http://localhost:8000`.

## Run the web app manually

```bash
cd web
npm install
npm run dev
```

The default web address is `http://localhost:5173` and proxies `/api` to the local API. Set `VITE_API_TARGET` when the API uses another address.

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
