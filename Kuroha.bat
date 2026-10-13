@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "ROOT=%~dp0"
set "CHECK_ONLY=0"
set "API_PORT=8000"
set "WEB_PORT=5173"
set "PIP_CACHE_DIR=%ROOT%.cache\pip"
set "npm_config_cache=%ROOT%.cache\npm"

if /I "%~1"=="--check" set "CHECK_ONLY=1"

echo.
echo ========================================
echo              KUROHA
echo ========================================
echo.
echo Project: "%ROOT%"

if not exist "%ROOT%pyproject.toml" (
  echo [ERROR] pyproject.toml was not found next to Kuroha.bat.
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

where powershell >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Windows PowerShell was not found.
  goto :fail
)

if "%CHECK_ONLY%"=="1" (
  call :find_free_port 8000 API_PORT
  if errorlevel 1 goto :fail
  call :find_free_port 5173 WEB_PORT
  if errorlevel 1 goto :fail
  echo [OK] Kuroha launcher prerequisites are available.
  echo [OK] API port candidate: !API_PORT!
  echo [OK] Web port candidate: !WEB_PORT!
  %PYTHON_CMD% --version
  node --version
  npm --version
  exit /b 0
)

if exist "%ROOT%.venv\Scripts\python.exe" (
  "%ROOT%.venv\Scripts\python.exe" --version >nul 2>nul
  if errorlevel 1 (
    echo [1/5] Existing virtual environment is not portable. Recreating it...
    rmdir /s /q "%ROOT%.venv"
  )
)

if not exist "%ROOT%.venv\Scripts\python.exe" (
  echo [1/5] Creating Python virtual environment on this drive...
  %PYTHON_CMD% -m venv "%ROOT%.venv"
  if errorlevel 1 goto :fail
) else (
  echo [1/5] Python virtual environment found.
)

echo [2/5] Installing Kuroha Python dependencies...
"%ROOT%.venv\Scripts\python.exe" -m pip install --disable-pip-version-check -e "%ROOT%"
if errorlevel 1 goto :fail

echo [3/5] Installing web dependencies...
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

echo [4/5] Selecting free local ports...
call :find_free_port 8000 API_PORT
if errorlevel 1 goto :fail

call :find_free_port 5173 WEB_PORT
if errorlevel 1 goto :fail

if "!WEB_PORT!"=="!API_PORT!" (
  set /a NEXT_WEB_PORT=!WEB_PORT!+1
  call :find_free_port !NEXT_WEB_PORT! WEB_PORT
  if errorlevel 1 goto :fail
)

echo       API: !API_PORT!
echo       Web: !WEB_PORT!

echo [5/5] Starting Kuroha from "%ROOT%"...
start "Kuroha API (!API_PORT!)" /D "%ROOT%" cmd /k ""%ROOT%.venv\Scripts\python.exe" -m uvicorn kuroha.app:app --host 127.0.0.1 --port !API_PORT!"
start "Kuroha Web (!WEB_PORT!)" /D "%ROOT%web" cmd /k "set VITE_API_TARGET=http://127.0.0.1:!API_PORT!&& npm run dev -- --host 127.0.0.1 --port !WEB_PORT!"

timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:!WEB_PORT!"

echo.
echo Kuroha is starting.
echo API: http://127.0.0.1:!API_PORT!
echo Web: http://127.0.0.1:!WEB_PORT!
echo.
exit /b 0

:find_free_port
setlocal
set "START_PORT=%~1"
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=%START_PORT%; while($p -le 65535){ try { $l=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$p); $l.Start(); $l.Stop(); Write-Output $p; exit 0 } catch { $p++ } }; exit 1"`) do set "FOUND_PORT=%%P"
if not defined FOUND_PORT (
  endlocal
  exit /b 1
)
endlocal & set "%~2=%FOUND_PORT%"
exit /b 0

:fail
echo.
echo Kuroha failed to start.
pause
exit /b 1
