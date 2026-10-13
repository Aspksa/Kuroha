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


## Web application v0.4

The web layer now uses real browser routes:

- /overview
- /system
- /backups
- /logs
- /settings

Reusable UI components and page modules live under web/src/components and web/src/pages. A first-run setup wizard validates the local environment without deleting data.

### Backup portability

Backups can be created, downloaded as ZIP archives, imported from disk, validated and restored from the Backups page.

### Logs and storage maintenance

The Logs page supports level filtering, refresh, download and clearing. The Backups page shows managed storage usage and can safely keep the newest restore points while cleaning older backups and rotated log files.

### PWA

Kuroha includes a web app manifest, application icon and service worker. Production builds can be installed as a standalone web app by supported browsers.

### Desktop-ready boundary

Browser-specific/native functionality is isolated behind web/src/platform/runtime.ts. A future Tauri or other desktop shell can provide window.__KUROHA_DESKTOP__ without rewriting the page/API architecture.

### End-to-end tests

Playwright boots the production FastAPI + built React site in CI and validates the setup wizard, real URL routing, diagnostics, backup creation and mobile navigation.
