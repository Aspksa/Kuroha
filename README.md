# Kuroha

Kuroha is a Python + TypeScript platform foundation. The current stage focuses on the website, runtime, persistence, portability, testing and security. AI functionality is intentionally out of scope for now.

## Foundation

- FastAPI backend with versioned API at /api/v1
- React + TypeScript + Vite website
- SQLite local persistence with managed schema migrations and WAL mode
- environment configuration through .env
- production static-web serving from FastAPI
- portable Windows launcher
- UTF-8 and Cyrillic-safe paths
- Python 3.10–3.15 compatibility
- automatic free-port selection
- structured health/readiness and system diagnostics endpoints
- security headers, CORS allow-list and request-size limits
- Python/Web/Windows CI and dependency audits
- local backup/restore and portable release ZIP workflow

## Start on Windows

Install Python 3.10–3.15 and Node.js 20+, then double-click Kuroha.bat.

Default mode is production-like: the launcher builds the web app, starts one local FastAPI process and serves both the website and API from the same free local port.

Development mode:

    Kuroha.bat --dev

Validation only:

    Kuroha.bat --check

The launcher can run from normal folders, other local drives, writable USB drives and external SSD/HDD devices. Spaces and Cyrillic characters in the path are supported.

## Configuration

Copy .env.example to .env when custom settings are required. .env is ignored by Git and must never be committed.

Important variables:

- KUROHA_ENV
- KUROHA_HOST
- KUROHA_PORT
- KUROHA_DATA_DIR
- KUROHA_LOG_LEVEL
- KUROHA_CORS_ORIGINS
- KUROHA_MAX_REQUEST_BYTES

## API

Primary API prefix: /api/v1.

- GET /api/v1/health
- GET /api/v1/ready
- GET /api/v1/info
- GET /api/v1/settings
- PUT /api/v1/settings
- GET /api/v1/diagnostics
- GET /api/v1/backups
- POST /api/v1/backups
- POST /api/v1/backups/{backup_id}/restore

The previous /api/* prefix remains as a compatibility alias.

## Storage

Local persistent data is stored in data/kuroha.db by default. Schema migrations are applied automatically without resetting existing data. SQLite uses WAL mode and integrity checks. Backups are stored in data/backups as validated ZIP restore points.

## Security baseline

Kuroha applies restrictive CORS configuration, request-body limits, CSP, frame protection, MIME sniffing protection, referrer policy and permissions policy. CI runs Python dependency auditing and npm production dependency auditing.

## Tests

    python -m pip install -e ".[dev]"
    python -m pytest
    python -m ruff check .
    cd web
    npm install
    npm run test
    npm run build

CI runs the Python suite on Python 3.10–3.15 and validates Kuroha.bat on Windows, including a path containing Cyrillic characters and spaces.

## Release

The Build portable release GitHub Actions workflow creates Kuroha-portable.zip. It can be run manually or by pushing a v* tag.

## Project structure

    src/kuroha/
      api.py        versioned HTTP routes
      app.py        application assembly and web serving
      config.py     environment configuration
      logging.py    logging setup
      security.py   HTTP security middleware
      storage.py    SQLite persistence
    web/
      src/          React/TypeScript website
    tests/          API, storage, security and runtime tests
