#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"
if [ ! -d venv ]; then
  python -m venv venv
fi
./venv/Scripts/python.exe -m pip install --quiet -r requirements.txt 2>/dev/null || venv/bin/python -m pip install --quiet -r requirements.txt
if [ -f venv/Scripts/python.exe ]; then
  ./venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
else
  ./venv/bin/python -m uvicorn app.main:app --reload --port 8000
fi
