#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tradboard}"
SERVICE_NAME="${SERVICE_NAME:-tradboard}"
PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"
LOG_FILE="${LOG_FILE:-/var/log/tradboard.log}"
PID_FILE="${PID_FILE:-/tmp/tradboard.pid}"

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "${SERVICE_NAME}.service" >/dev/null 2>&1; then
  sudo systemctl start "$SERVICE_NAME"
  sudo systemctl status "$SERVICE_NAME" --no-pager
  exit 0
fi

cd "$APP_DIR"
if [ ! -d .next ]; then
  npm run build
fi

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "TradBoard est deja demarre: pid=$(cat "$PID_FILE")"
  exit 0
fi

nohup npm run start -- -H "$HOST" -p "$PORT" > "$LOG_FILE" 2>&1 &
echo "$!" > "$PID_FILE"
echo "TradBoard demarre sur http://${HOST}:${PORT} pid=$(cat "$PID_FILE") logs=$LOG_FILE"
