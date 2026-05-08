#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/mnicolas35/tradboard.v1"
PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"
LOG_FILE="${LOG_FILE:-/tmp/tradboard-next.log}"
PID_FILE="${PID_FILE:-/tmp/tradboard-next.pid}"

cd "$APP_DIR"

echo "[TradBoard] Arret des anciens processus Next sur ce depot..."
if [ -f "$PID_FILE" ]; then
  old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" 2>/dev/null; then
    kill "$old_pid" 2>/dev/null || true
  fi
  rm -f "$PID_FILE"
fi

while IFS= read -r pid; do
  [ -n "$pid" ] || continue
  kill "$pid" 2>/dev/null || true
done < <(pgrep -f "node .*tradboard.v1.*next|next-server .*tradboard.v1|npm run dev.*tradboard.v1|npm run start.*tradboard.v1" || true)

for signal in TERM KILL; do
  while IFS= read -r pid; do
    [ -n "$pid" ] || continue
    kill "-$signal" "$pid" 2>/dev/null || true
  done < <(ss -ltnp "sport = :$PORT" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u)

  sleep 2

  if ! ss -ltn "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
    break
  fi
done

if ss -ltn "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
  echo "[TradBoard] Le port $PORT est encore occupe. Impossible de relancer proprement."
  ss -ltnp "sport = :$PORT" || true
  exit 1
fi

echo "[TradBoard] Nettoyage du cache Next..."
rm -rf .next

echo "[TradBoard] Build de verification..."
npm run build

echo "[TradBoard] Demarrage sur http://localhost:${PORT} ..."
setsid bash -lc "cd '$APP_DIR' && exec npm run start -- -H '$HOST' -p '$PORT'" > "$LOG_FILE" 2>&1 < /dev/null &
new_pid="$!"
echo "$new_pid" > "$PID_FILE"

sleep 5

if ! kill -0 "$new_pid" 2>/dev/null; then
  echo "[TradBoard] Echec du demarrage. Derniers logs:"
  tail -80 "$LOG_FILE" || true
  exit 1
fi

if command -v node >/dev/null 2>&1; then
  node -e "fetch('http://127.0.0.1:${PORT}').then(async r=>{console.log('[TradBoard] HTTP', r.status); if(!r.ok) process.exit(1)}).catch(e=>{console.error('[TradBoard] Verification HTTP impossible:', e.message); process.exit(1)})"
fi

if ! ss -ltn "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
  echo "[TradBoard] Le serveur a demarre puis a quitte. Derniers logs:"
  tail -80 "$LOG_FILE" || true
  exit 1
fi

echo "[TradBoard] Pret. Logs: $LOG_FILE"
