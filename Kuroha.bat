@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "ROOT=%~dp0"
set "CHECK_ONLY=0"

if /I "%~1"=="--check" set "CHECK_ONLY=1"

echo.
echo ========================================
echo              KUROHA
echo ========================================
echo.

if not exist "%ROOT%pyproject.toml" (
  echo [ERROR] pyproject.toml was not found.
  goto :fail
)

if not exist "%ROOT%web\package.json" (
  echo [ERROR] web\package.json was not found.
  goto :fail
)

set "PYTHON_CMD="

where py >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=py -3"
  goto :python_found
)

where python >nul 2>nul
if not errorlevel 1 (
  set "PYTHON_CMD=python"
  goto :python_found
)

echo [ERROR] Python 3 was not found in PATH.
echo Install Python 3.11 or newer and try again.
goto :fail

:python_found
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Install Node.js 20 or newer and try again.
  goto :fail
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found in PATH.
  goto :fail
)

if "%CHECK_ONLY%"=="1" (
  echo [OK] Kuroha launcher prerequisites are available.
  %PYTHON_CMD% --version
  node --version
  npm --version
  exit /b 0
)

if not exist "%ROOT%.venv\Scripts\python.exe" (
  echo [1/4] Creating Python virtual environment...
  %PYTHON_CMD% -m venv "%ROOT%.venv"
  if errorlevel 1 goto :fail
) else (
  echo [1/4] Python virtual environment found.
)

echo [2/4] Installing Kuroha Python dependencies...
"%ROOT%.venv\Scripts\python.exe" -m pip install --disable-pip-version-check -e "%ROOT%"
if errorlevel 1 goto :fail

echo [3/4] Installing web dependencies...
pushd "%ROOT%web"
if not exist "node_modules" (
  call npm install
  if errorlevel 1 (
    popd
    goto :fail
  )
) else (
  echo       node_modules found, skipping npm install.
)
popd

echo [4/4] Starting Kuroha...
start "Kuroha API" /D "%ROOT%" cmd /k ""%ROOT%.venv\Scripts\python.exe" -m uvicorn kuroha.app:app --host 127.0.0.1 --port 8000"
start "Kuroha Web" /D "%ROOT%web" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173"

timeout /t 2 /nobreak >nul
start "" "http://localhost:5173"

echo.
echo Kuroha is starting.
echo API: http://localhost:8000
echo Web: http://localhost:5173
echo.
exit /b 0

:fail
echo.
echo Kuroha failed to start.
pause
exit /b 1
