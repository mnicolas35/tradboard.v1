#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/tradboard}"
APP_USER="${APP_USER:-tradboard}"
APP_HOST="${APP_HOST:-0.0.0.0}"
APP_PORT="${APP_PORT:-3000}"
APP_URL="${APP_URL:-http://127.0.0.1:${APP_PORT}}"
AUTH_SECRET="${AUTH_SECRET:?AUTH_SECRET est obligatoire}"
AUTH_COOKIE_SECURE="${AUTH_COOKIE_SECURE:-false}"
DB_HOST="${DB_HOST:?DB_HOST est obligatoire}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tradboard}"
DB_USER="${DB_USER:-tradboard}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD est obligatoire}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ARCHIVE="${ARCHIVE:-$INSTALL_DIR/package/tradboard-v1-source.tar.gz}"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?schema=public"

export DEBIAN_FRONTEND=noninteractive
apt update
apt install -y ca-certificates curl postgresql-client

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

mkdir -p "$APP_DIR"
tar -xzf "$ARCHIVE" -C "$APP_DIR" --strip-components=1

cat > "$APP_DIR/.env.production" <<EOF
NODE_ENV="production"
PORT="${APP_PORT}"
HOST="${APP_HOST}"
APP_URL="${APP_URL}"
NEXT_PUBLIC_APP_URL="${APP_URL}"
AUTH_SECRET="${AUTH_SECRET}"
AUTH_COOKIE_SECURE="${AUTH_COOKIE_SECURE}"
DATABASE_URL="${DATABASE_URL}"
EOF

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

cd "$APP_DIR"
sudo -u "$APP_USER" npm ci
sudo -u "$APP_USER" npx prisma generate
sudo -u "$APP_USER" npx prisma migrate deploy
sudo -u "$APP_USER" npx tsx prisma/bootstrap-auth.ts
sudo -u "$APP_USER" npm run build

cp "$INSTALL_DIR/systemd/tradboard.service" /etc/systemd/system/tradboard.service
sed -i "s#WorkingDirectory=/opt/tradboard#WorkingDirectory=${APP_DIR}#" /etc/systemd/system/tradboard.service
sed -i "s#EnvironmentFile=/opt/tradboard/.env.production#EnvironmentFile=${APP_DIR}/.env.production#" /etc/systemd/system/tradboard.service
sed -i "s#User=tradboard#User=${APP_USER}#" /etc/systemd/system/tradboard.service
sed -i "s#Group=tradboard#Group=${APP_USER}#" /etc/systemd/system/tradboard.service

systemctl daemon-reload
systemctl enable tradboard
systemctl restart tradboard

echo "TradBoard installe."
echo "URL: ${APP_URL}"
echo "Logs: journalctl -u tradboard -f"
