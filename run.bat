@echo off
title AirDrop - Local Network File Drop
cd /d "%~dp0"

echo ============================================================
echo           AIRDROP LOCAL NETWORK FILE DROP          
echo ============================================================
echo Starting server and launching browser...
echo.

python app.py

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo [!] Server exited or failed to start.
    echo Please make sure Python 3 is installed and in your PATH.
    echo ============================================================
    echo.
    pause
)
