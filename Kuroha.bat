@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

set "ROOT=%~dp0"
set "PROJECT_DIR=%ROOT:~0,-1%"
set "MODE=production"
set "CHECK_ONLY=0"
set "API_PORT=8000"
set "WEB_PORT=5173"
set "LAUNCH_MINIMIZED=0"
set "MINIMIZE_TO_TRAY=1"
set "CHECK_UPDATES_ON_START=1"
set "PREFERRED_DATA_DIR="
set "PIP_CACHE_DIR=%ROOT%.cache\pip"
set "npm_config_cache=%ROOT%.cache\npm"
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
set "PYTHONLEGACYWINDOWSSTDIO="
set "KUROHA_DATA_DIR=%ROOT%data"

if exist "%ROOT%data\launcher.json" (
  for /f "tokens=1,* delims==" %%A in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=Get-Content -LiteralPath ''%ROOT%data\launcher.json'' -Raw | ConvertFrom-Json; $d=[string]$c.preferred_data_dir; if($d){$d=[IO.Path]::GetFullPath($d).TrimEnd(''\'')}; ''API_PORT='' + $c.preferred_api_port; ''LAUNCH_MINIMIZED='' + [int][bool]$c.launch_minimized; ''MINIMIZE_TO_TRAY='' + [int][bool]$c.minimize_to_tray; ''CHECK_UPDATES_ON_START='' + [int][bool]$c.check_updates_on_start; ''PREFERRED_DATA_DIR='' + $d"') do set "%%A=%%B"
)

if /I "%~1"=="--check" set "CHECK_ONLY=1"
if /I "%~1"=="--dev" set "MODE=development"

echo.
echo ========================================
echo              KUROHA
echo ========================================
echo.
echo Project: "%PROJECT_DIR%"
echo Mode: !MODE!

if not exist "%ROOT%pyproject.toml" (
  echo [ERROR] pyproject.toml was not found next to Kuroha.bat.
  goto :fail
)

if not exist "%ROOT%web\package.json" (
  echo [ERROR] web\package.json was not found.
  goto :fail
)

if not exist "%ROOT%KurohaTray.ps1" (
  echo [ERROR] KurohaTray.ps1 was not found.
  goto :fail
)

call :select_python
if errorlevel 1 goto :fail

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  echo Install Node.js 20 or newer and try again.
  goto :fail
)

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 20 or newer is required.
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
  call :find_free_port !API_PORT! API_PORT
  if errorlevel 1 goto :fail
  echo [OK] Kuroha launcher prerequisites are available.
  echo [OK] Python: !PYTHON_VERSION!
  echo [OK] Port candidate: !API_PORT!
  call !PYTHON_CMD! --version
  node --version
  npm --version
  exit /b 0
)

if defined PREFERRED_DATA_DIR (
  if not exist "!PREFERRED_DATA_DIR!" mkdir "!PREFERRED_DATA_DIR!"
  if errorlevel 1 goto :fail
  if /I not "!PREFERRED_DATA_DIR!"=="%ROOT%data" (
    if not exist "!PREFERRED_DATA_DIR!\kuroha.db" if exist "%ROOT%data" (
      robocopy "%ROOT%data" "!PREFERRED_DATA_DIR!" /E /XF launcher.json >nul
      if errorlevel 8 goto :fail
    )
    set "KUROHA_DATA_DIR=!PREFERRED_DATA_DIR!"
  )
)

if exist "%ROOT%.venv\Scripts\python.exe" (
  "%ROOT%.venv\Scripts\python.exe" -c "import sys; raise SystemExit(0 if (3,10) <= sys.version_info[:2] < (3,16) else 1)" >nul 2>nul
  if errorlevel 1 (
    echo [1/5] Existing virtual environment is incompatible or not portable. Recreating it...
    rmdir /s /q "%ROOT%.venv"
  )
)

if not exist "%ROOT%.venv\Scripts\python.exe" (
  echo [1/5] Creating Python virtual environment with !PYTHON_VERSION!...
  call !PYTHON_CMD! -m venv "%ROOT%.venv"
  if errorlevel 1 goto :fail
) else (
  echo [1/5] Compatible Python virtual environment found.
)

echo [2/5] Installing Kuroha Python dependencies...
"%ROOT%.venv\Scripts\python.exe" -m pip install --disable-pip-version-check -e "%PROJECT_DIR%"
if errorlevel 1 goto :fail

echo [3/5] Installing web dependencies...
pushd "%ROOT%web"
set "INSTALL_WEB_DEPS=0"
if not exist "node_modules" set "INSTALL_WEB_DEPS=1"
if not exist "node_modules\\vite\\package.json" set "INSTALL_WEB_DEPS=1"
if not exist "node_modules\\typescript\\package.json" set "INSTALL_WEB_DEPS=1"
if "!INSTALL_WEB_DEPS!"=="1" (
  echo [INFO] Missing web dependencies detected. Installing...
  call npm install
  if errorlevel 1 (
    popd
    goto :fail
  )
)
popd

echo [4/5] Selecting free local ports...
call :find_free_port !API_PORT! API_PORT
if errorlevel 1 goto :fail

if /I "!MODE!"=="development" (
  call :find_free_port 5173 WEB_PORT
  if errorlevel 1 goto :fail
  if "!WEB_PORT!"=="!API_PORT!" (
    set /a NEXT_WEB_PORT=!WEB_PORT!+1
    call :find_free_port !NEXT_WEB_PORT! WEB_PORT
    if errorlevel 1 goto :fail
  )
)

echo [5/5] Starting Kuroha...
if /I "!MODE!"=="production" (
  pushd "%ROOT%web"
  call npm run build
  if errorlevel 1 (
    popd
    goto :fail
  )
  popd

  set "KUROHA_ENV=production"
  set "KUROHA_PORT=!API_PORT!"
  start "Kuroha (!API_PORT!)" /D "%PROJECT_DIR%" "%ROOT%.venv\Scripts\python.exe" -m uvicorn kuroha.app:app --host 127.0.0.1 --port !API_PORT!
  call :wait_for_http "http://127.0.0.1:!API_PORT!/api/v1/ready"
  if errorlevel 1 goto :fail
  if "!MINIMIZE_TO_TRAY!"=="1" (
    start "Kuroha Tray" /min powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "%ROOT%KurohaTray.ps1" -Url "http://127.0.0.1:!API_PORT!" -Port !API_PORT! -Launcher "%ROOT%Kuroha.bat" -CheckUpdates !CHECK_UPDATES_ON_START!
  )
  if not "!LAUNCH_MINIMIZED!"=="1" start "" "http://127.0.0.1:!API_PORT!"
  echo Web/API: http://127.0.0.1:!API_PORT!
) else (
  set "KUROHA_ENV=development"
  set "VITE_API_TARGET=http://127.0.0.1:!API_PORT!"
  start "Kuroha API (!API_PORT!)" /D "%PROJECT_DIR%" "%ROOT%.venv\Scripts\python.exe" -m uvicorn kuroha.app:app --host 127.0.0.1 --port !API_PORT!
  start "Kuroha Web (!WEB_PORT!)" /D "%PROJECT_DIR%\web" cmd /k npm run dev -- --host 127.0.0.1 --port !WEB_PORT!
  call :wait_for_http "http://127.0.0.1:!API_PORT!/api/v1/ready"
  if errorlevel 1 goto :fail
  call :wait_for_http "http://127.0.0.1:!WEB_PORT!/"
  if errorlevel 1 goto :fail
  start "" "http://127.0.0.1:!WEB_PORT!"
  echo API: http://127.0.0.1:!API_PORT!
  echo Web: http://127.0.0.1:!WEB_PORT!
)

echo.
echo Kuroha is starting.
echo Data: "%KUROHA_DATA_DIR%"
echo.
exit /b 0

:select_python
set "PYTHON_CMD="
set "PYTHON_VERSION="

where py >nul 2>nul
if not errorlevel 1 (
  for %%V in (3.15 3.14 3.13 3.12 3.11 3.10) do (
    py -%%V -c "import sys; raise SystemExit(0 if (3,10) <= sys.version_info[:2] < (3,16) else 1)" >nul 2>nul
    if not errorlevel 1 if not defined PYTHON_CMD (
      set "PYTHON_CMD=py -%%V"
      set "PYTHON_VERSION=Python %%V"
    )
  )
)

if defined PYTHON_CMD exit /b 0

where python >nul 2>nul
if not errorlevel 1 (
  for /f "delims=" %%V in ('python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"') do set "DETECTED_PYTHON=%%V"
  python -c "import sys; raise SystemExit(0 if (3,10) <= sys.version_info[:2] < (3,16) else 1)" >nul 2>nul
  if not errorlevel 1 (
    set "PYTHON_CMD=python"
    set "PYTHON_VERSION=Python !DETECTED_PYTHON!"
    exit /b 0
  )
)

echo [ERROR] No supported Python was found.
echo Kuroha supports Python 3.10 through 3.15.
echo Install one of these versions and try again.
exit /b 1

:wait_for_http
powershell -NoProfile -ExecutionPolicy Bypass -Command "$url=$args[0]; $deadline=(Get-Date).AddSeconds(30); do { try { $r=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 300) { exit 0 } } catch {} ; Start-Sleep -Milliseconds 300 } while ((Get-Date) -lt $deadline); Write-Error ('Timed out waiting for ' + $url); exit 1" "%~1"
if errorlevel 1 echo [ERROR] Kuroha did not become ready: %~1
exit /b %errorlevel%

:find_free_port
setlocal
set "START_PORT=%~1"
for /f "delims=" %%P in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$p=%START_PORT%; while($p -le 65535){ try { $l=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$p); $l.Start(); $l.Stop(); Write-Output $p; exit 0 } catch { $p++ } }; exit 1"') do set "FOUND_PORT=%%P"
if not defined FOUND_PORT (
  endlocal
  exit /b 1
)
endlocal & set "%~2=%FOUND_PORT%"
exit /b 0

:fail
echo.
echo Kuroha failed to start.
if not "%CHECK_ONLY%"=="1" pause
exit /b 1
