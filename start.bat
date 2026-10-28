@echo off
setlocal enabledelayedexpansion
title SIH26264 AICTE Complaint Intelligence Launcher

echo ==============================================================================
echo   SIH26264: AICTE Complaint Intelligence Dashboard
echo   Integrated Multi-Bureau Complaint Monitoring System
echo ==============================================================================
echo.

cd /d "%~dp0"

:: 1. Validate Backend Environment
if not exist "%~dp0backend\.venv\Scripts\python.exe" (
    echo [ERROR] Backend virtual environment not found at: backend\.venv
    echo Please verify backend setup before starting.
    pause
    exit /b 1
)

:: 2. Validate Frontend Dependencies
if not exist "%~dp0frontend\node_modules" (
    echo [ERROR] Frontend node_modules not found at: frontend\node_modules
    echo Please run 'npm install' inside the frontend directory.
    pause
    exit /b 1
)

:: 3. Check and Start Backend (Port 8000)
netstat -ano | findstr ":8000 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Backend is already running on port 8000.
) else (
    echo [INFO] Starting FastAPI Backend on http://127.0.0.1:8000 ...
    start "AICTE Backend (Port 8000)" /D "%~dp0backend" .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    echo [INFO] Waiting for FastAPI server initialization...
    timeout /t 3 /nobreak >nul
)

:: 4. Automatically open default browser to the single development URL
echo [INFO] Launching Browser at http://localhost:5173 ...
start http://localhost:5173

:: 5. Check and Start Frontend (Port 5173)
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Frontend Vite server is already active on port 5173.
    echo.
    echo ==============================================================================
    echo   Application is Live!
    echo   Single Browser Access URL: http://localhost:5173
    echo   To stop all servers, run:  stop.bat
    echo ==============================================================================
    echo.
) else (
    echo [INFO] Starting Vite Frontend on http://localhost:5173 ...
    cd /d "%~dp0frontend"
    npm run dev -- --host 127.0.0.1 --port 5173
)

