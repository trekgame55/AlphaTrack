#!/bin/bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

for PORT in 4040 8000; do
  PID=$(lsof -ti :$PORT 2>/dev/null)
  [ -n "$PID" ] && kill -9 $PID 2>/dev/null && sleep 0.3
done

cd "$ROOT/backend"
python3 main.py > "$ROOT/backend/backend.log" 2>&1 &
BACKEND_PID=$!
sleep 2

cd "$ROOT"
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
