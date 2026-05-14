#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-tradboard}"
PID_FILE="${PID_FILE:-/tmp/tradboard.pid}"

if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "${SERVICE_NAME}.service" >/dev/null 2>&1; then
  sudo systemctl stop "$SERVICE_NAME"
  exit 0
fi

if [ -f "$PID_FILE" ]; then
  pid="$(cat "$PID_FILE")"
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    echo "TradBoard arrete: pid=$pid"
  fi
  rm -f "$PID_FILE"
else
  echo "Aucun PID file trouve: $PID_FILE"
fi
