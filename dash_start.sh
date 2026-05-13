#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/home/mnicolas35/tradboard.v1}"
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-3000}"
LOG_FILE="${LOG_FILE:-/tmp/tradboard-next.log}"
PID_FILE="${PID_FILE:-/tmp/tradboard-next.pid}"

cd "$APP_DIR"

usage() {
  echo "Usage: $0 {start|stop|status|restart}"
  echo
  echo "Variables optionnelles:"
  echo "  PORT=3000 HOST=0.0.0.0 LOG_FILE=/tmp/tradboard-next.log PID_FILE=/tmp/tradboard-next.pid"
}

port_pids() {
  ss -ltnp "sport = :$PORT" 2>/dev/null | sed -n 's/.*pid=\([0-9]\+\).*/\1/p' | sort -u
}

pid_is_running() {
  local pid="${1:-}"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

managed_pid() {
  if [ -f "$PID_FILE" ]; then
    cat "$PID_FILE" 2>/dev/null || true
  fi
}

status_app() {
  local pid
  pid="$(managed_pid)"

  if pid_is_running "$pid"; then
    echo "[TradBoard] RUNNING pid=$pid url=http://127.0.0.1:$PORT"
  elif ss -ltn "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
    echo "[TradBoard] RUNNING port=$PORT url=http://127.0.0.1:$PORT"
    ss -ltnp "sport = :$PORT" 2>/dev/null || true
  else
    echo "[TradBoard] STOPPED port=$PORT"
  fi
}

stop_app() {
  local pid
  pid="$(managed_pid)"

  if pid_is_running "$pid"; then
    echo "[TradBoard] Arret du processus gere pid=$pid..."
    kill "$pid" 2>/dev/null || true
  fi

  while IFS= read -r port_pid; do
    [ -n "$port_pid" ] || continue
    echo "[TradBoard] Arret du processus sur le port $PORT pid=$port_pid..."
    kill "$port_pid" 2>/dev/null || true
  done < <(port_pids)

  sleep 2

  while IFS= read -r port_pid; do
    [ -n "$port_pid" ] || continue
    echo "[TradBoard] Arret force du processus pid=$port_pid..."
    kill -KILL "$port_pid" 2>/dev/null || true
  done < <(port_pids)

  rm -f "$PID_FILE"

  if ss -ltn "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
    echo "[TradBoard] Le port $PORT est encore occupe."
    ss -ltnp "sport = :$PORT" 2>/dev/null || true
    exit 1
  fi

  echo "[TradBoard] Stop OK."
}

ensure_build() {
  if [ ! -d "$APP_DIR/.next" ]; then
    echo "[TradBoard] Build Next absent, lancement du build..."
    npm run build
  fi
}

start_app() {
  if ss -ltn "sport = :$PORT" 2>/dev/null | grep -q LISTEN; then
    echo "[TradBoard] Deja demarre sur http://127.0.0.1:$PORT"
    status_app
    exit 0
  fi

  ensure_build

  echo "[TradBoard] Demarrage sur http://127.0.0.1:$PORT ..."
  setsid bash -lc "cd '$APP_DIR' && exec npm run start -- -H '$HOST' -p '$PORT'" > "$LOG_FILE" 2>&1 < /dev/null &
  local pid="$!"
  echo "$pid" > "$PID_FILE"

  sleep 4

  if ! pid_is_running "$pid"; then
    echo "[TradBoard] Echec du demarrage. Derniers logs:"
    tail -80 "$LOG_FILE" 2>/dev/null || true
    exit 1
  fi

  if command -v node >/dev/null 2>&1; then
    node -e "fetch('http://127.0.0.1:${PORT}').then(async r=>{console.log('[TradBoard] HTTP', r.status); if(!r.ok) process.exit(1)}).catch(e=>{console.error('[TradBoard] Verification HTTP impossible:', e.message); process.exit(1)})"
  fi

  echo "[TradBoard] Start OK. Logs: $LOG_FILE"
}

case "${1:-}" in
  start)
    start_app
    ;;
  stop)
    stop_app
    ;;
  status)
    status_app
    ;;
  restart)
    stop_app
    start_app
    ;;
  *)
    usage
    exit 1
    ;;
esac
