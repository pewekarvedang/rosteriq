#!/usr/bin/env bash
# ==============================================================================
# RosterIQ - Setup and Launch Script for macOS and Linux
# ==============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=============================================================================="
echo "  RosterIQ - Smart Roster Management System"
echo "  Setting up and starting application on macOS/Linux..."
echo "=============================================================================="
echo ""

# Locate Python 3
if command -v python3 &>/dev/null; then
    PY_CMD="python3"
elif command -v python &>/dev/null; then
    PY_CMD="python"
else
    echo "[ERROR] Python 3.10+ is required but was not found."
    exit 1
fi

echo "[1/4] Found Python: $($PY_CMD --version)"

# Create virtual environment if not present
if [ ! -d "venv" ]; then
    echo "[2/4] Setting up Python virtual environment (venv)..."
    $PY_CMD -m venv venv
fi

source venv/bin/activate

# Install dependencies
echo "[2/4] Checking and installing dependencies..."
pip install -r requirements.txt

# Run database seeder
echo "[3/4] Initializing database and seeding realistic records..."
cd backend
python seed.py

# Start Uvicorn
echo "[4/4] Starting RosterIQ full-stack application on http://127.0.0.1:8000 ..."
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 &
SERVER_PID=$!

sleep 2

# Open in default browser
if command -v open &>/dev/null; then
    open http://127.0.0.1:8000
elif command -v xdg-open &>/dev/null; then
    xdg-open http://127.0.0.1:8000
fi

echo ""
echo "=============================================================================="
echo "  RosterIQ Application is running!"
echo "  * Web Application:   http://127.0.0.1:8000"
echo "  * API Documentation: http://127.0.0.1:8000/docs"
echo "  Press Ctrl+C to stop the application."
echo "=============================================================================="

wait $SERVER_PID
