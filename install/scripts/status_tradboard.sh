#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-tradboard}"
PID_FILE="${PID_FILE:-/tmp/tradboard.pid}"
PORT="${PORT:-3000}"

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "${SERVICE_NAME}.service" >/dev/null 2>&1; then
  systemctl status "$SERVICE_NAME" --no-pager
  exit 0
fi

if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "TradBoard RUNNING pid=$(cat "$PID_FILE")"
else
  echo "TradBoard STOPPED"
fi

if command -v ss >/dev/null 2>&1; then
  ss -ltnp "sport = :$PORT" 2>/dev/null || true
fi
