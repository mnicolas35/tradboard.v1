#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
"$SCRIPT_DIR/stop_tradboard.sh" || true
"$SCRIPT_DIR/start_tradboard.sh"
