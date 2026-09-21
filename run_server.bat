@echo off
title AirDrop Local Server
cd /d "%~dp0"
echo ============================================================
echo Starting AirDrop Local Server...
echo ============================================================
python app.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] Server exited with an error.
    pause
)
