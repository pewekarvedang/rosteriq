@echo off
title RosterIQ - Intelligent Workforce Planning & Roster Optimization
cd /d "%~dp0"

echo ==============================================================================
echo   RosterIQ - Smart Roster Management System
echo   Intelligent Workforce Planning & Deterministic Roster Optimization
echo ==============================================================================
echo.

:: 1. Locate Python executable
python --version >nul 2>&1
if not errorlevel 1 (
    set PY_CMD=python
    goto :PYTHON_FOUND
)

py -3.14 --version >nul 2>&1
if not errorlevel 1 (
    set PY_CMD=py -3.14
    goto :PYTHON_FOUND
)

py -3.12 --version >nul 2>&1
if not errorlevel 1 (
    set PY_CMD=py -3.12
    goto :PYTHON_FOUND
)

py --version >nul 2>&1
if not errorlevel 1 (
    set PY_CMD=py
    goto :PYTHON_FOUND
)

echo [ERROR] Python 3.10+ is required but was not found on your system.
echo Please download and install Python from https://www.python.org/downloads/
echo Make sure to check "Add Python to PATH" during installation.
echo.
pause
exit /b 1

:PYTHON_FOUND
echo [OK] Using Python: 
%PY_CMD% --version
echo.

:: 2. Check and install dependencies if missing
echo [1/4] Checking application dependencies...
%PY_CMD% -c "import fastapi, ortools, sqlalchemy, pydantic" >nul 2>&1
if errorlevel 1 (
    echo [Setup] First-time setup detected. Installing required Python dependencies...
    echo This may take 1-2 minutes depending on your internet connection.
    %PY_CMD% -m pip install -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies. Please run manually: pip install -r requirements.txt
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed successfully.
) else (
    echo [OK] All dependencies are already installed.
)
echo.

:: 3. Run database initialization and idempotent seeder
cd "%~dp0backend"
echo [2/4] Initializing database and verifying records...
%PY_CMD% seed.py
if errorlevel 1 (
    echo [WARNING] Database initialization notice. Continuing startup...
)
echo.

:: 4. Launch unified full-stack server
echo [3/4] Launching RosterIQ application server on http://127.0.0.1:8000 ...
start "RosterIQ Server" /b %PY_CMD% -m uvicorn app.main:app --host 127.0.0.1 --port 8000

:: 5. Wait for server health endpoint
echo [4/4] Connecting to application...
powershell -Command "for ($i = 0; $i -lt 30; $i++) { try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8000/health' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { break } } catch { Start-Sleep -Milliseconds 500 } }"

:: 6. Launch in Native Desktop App Window mode
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://127.0.0.1:8000 --window-size=1440,900
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://127.0.0.1:8000 --window-size=1440,900
) else (
    start http://127.0.0.1:8000
)

echo.
echo ==============================================================================
echo   RosterIQ Application is running!
echo.
echo   * Main Application:  http://127.0.0.1:8000
echo   * API Documentation: http://127.0.0.1:8000/docs
echo   * Health Check:      http://127.0.0.1:8000/health
echo ==============================================================================
echo.
echo (Keep this window open or minimized while using the application)
echo.
cmd /k
