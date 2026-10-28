@echo off
title SIH26264 AICTE Complaint Intelligence - Server Stopper

echo ==============================================================================
echo   Stopping SIH26264 AICTE Complaint Intelligence Application
echo ==============================================================================
echo.

echo [INFO] Stopping FastAPI Backend (Port 8000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo [INFO] Stopping Vite Frontend (Port 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [SUCCESS] Both backend and frontend servers have been cleanly stopped.
timeout /t 2 >nul

