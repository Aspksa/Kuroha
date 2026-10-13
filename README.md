# Kuroha

Kuroha is a small Python core with a FastAPI HTTP layer and a React/TypeScript web client.

## Stack

- Python 3.10–3.15
- FastAPI
- React 18
- TypeScript
- Vite

## Windows portable quick start

Kuroha can be started directly from a normal folder, another local drive, an external SSD/HDD, or a writable USB drive. Paths with spaces and Cyrillic characters are supported.

Install a supported Python version (3.10 through 3.15) and Node.js 20+, copy or clone the entire Kuroha folder to the storage device you want, then double-click:

```text
Kuroha.bat
```

The launcher:

- switches the Windows console to UTF-8 and forces Python UTF-8 I/O;
- automatically chooses an installed supported Python version;
- rejects unsupported Python versions with a clear message;
- always resolves paths relative to its own folder instead of relying on the current drive;
- creates the Python virtual environment on the same storage device;
- keeps pip/npm caches inside the Kuroha folder;
- recreates a stale or incompatible virtual environment if the folder was moved or the Python version is unsupported;
- installs Python and web dependencies when needed;
- starts the API and web development server in separate windows;
- automatically selects the first free API port starting at `8000`;
- automatically selects the first free web port starting at `5173`;
- passes the selected API address to the Vite proxy;
- opens the actual selected web address in the browser.

A writable storage device is required for first-run dependency installation and caches.

To validate prerequisites, Python compatibility, UTF-8 path handling and free-port discovery without starting Kuroha:

```bat
Kuroha.bat --check
```

## Python compatibility

The package metadata requires Python `>=3.10,<3.16`. CI runs the Python test suite on every supported minor version from 3.10 through 3.15.

## Tests

The test suite covers API health, sessions, Cyrillic/UTF-8 round trips, mixed Unicode text, supported Python runtimes, and core conversation history. Windows CI also copies the project to a Cyrillic path with spaces and runs `Kuroha.bat --check` there.

```bash
python -m pip install -e ".[dev]"
python -m pytest
python -m ruff check .
cd web && npm install && npm run build
```
