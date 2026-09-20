#!/usr/bin/env bash
# AirDrop Local Network File Drop - macOS & Linux Launcher
cd "$(dirname "$0")"
echo "==================================================="
echo "    Starting AirDrop Local Network File Drop..."
echo "==================================================="
echo ""

if command -v python3 &>/dev/null; then
    python3 app.py
elif command -v python &>/dev/null; then
    python app.py
else
    echo "Error: Python is not installed. Please install Python 3.8+ to run this application."
    exit 1
fi
