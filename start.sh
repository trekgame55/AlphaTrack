#!/bin/bash
# ─────────────────────────────────────────────────
# Weeek — запуск всех серверов
# ─────────────────────────────────────────────────

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Kill existing processes on ports 4040 and 8000
for PORT in 4040 8000; do
  PID=$(lsof -ti :$PORT 2>/dev/null)
  if [ -n "$PID" ]; then
    echo "Останавливаю процесс на порту $PORT (PID $PID)..."
    kill -9 $PID 2>/dev/null
    sleep 0.5
  fi
done

echo ""
echo "╔════════════════════════════════════════╗"
echo "║         Weeek — Запуск серверов        ║"
echo "╠════════════════════════════════════════╣"
echo "║  Frontend  → http://0.0.0.0:4040       ║"
echo "║  Backend   → http://0.0.0.0:8000       ║"
echo "║  API docs  → http://0.0.0.0:8000/api/docs ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Start Python backend
echo "▶ Запускаю Python API (порт 8000)..."
cd "$ROOT/backend"
python3 main.py > "$ROOT/backend/backend.log" 2>&1 &
BACKEND_PID=$!
echo "  PID: $BACKEND_PID"

# Wait for backend to be ready
sleep 2
if ! curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
  echo "  ⚠ Backend не ответил, проверьте backend/backend.log"
else
  echo "  ✓ Backend запущен"
fi

# Start Next.js frontend
echo ""
echo "▶ Запускаю Next.js (порт 4040)..."
cd "$ROOT"
npm run dev &
FRONTEND_PID=$!
echo "  PID: $FRONTEND_PID"

echo ""
echo "Оба сервера запущены. Ctrl+C для остановки."
echo ""

# Wait and handle Ctrl+C
trap "echo ''; echo 'Останавливаю серверы...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
