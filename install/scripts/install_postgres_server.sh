#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DB_NAME:-tradboard}"
DB_USER="${DB_USER:-tradboard}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD est obligatoire}"
APP_SERVER_IP="${APP_SERVER_IP:?APP_SERVER_IP est obligatoire}"
POSTGRES_LISTEN_ADDRESS="${POSTGRES_LISTEN_ADDRESS:-*}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export DEBIAN_FRONTEND=noninteractive
apt update
apt install -y postgresql postgresql-contrib

sudo -u postgres psql \
  -v db_name="$DB_NAME" \
  -v db_user="$DB_USER" \
  -v db_password="$DB_PASSWORD" \
  -f "$INSTALL_DIR/sql/01_create_database_and_user.sql"

PG_CONF="$(sudo -u postgres psql -Atc 'show config_file')"
PG_HBA="$(sudo -u postgres psql -Atc 'show hba_file')"

if ! grep -q "host ${DB_NAME} ${DB_USER} ${APP_SERVER_IP}/32 scram-sha-256" "$PG_HBA"; then
  echo "host ${DB_NAME} ${DB_USER} ${APP_SERVER_IP}/32 scram-sha-256" >> "$PG_HBA"
fi

if grep -q "^[# ]*listen_addresses" "$PG_CONF"; then
  sed -i "s/^[# ]*listen_addresses.*/listen_addresses = '${POSTGRES_LISTEN_ADDRESS}'/" "$PG_CONF"
else
  echo "listen_addresses = '${POSTGRES_LISTEN_ADDRESS}'" >> "$PG_CONF"
fi

systemctl enable postgresql
systemctl restart postgresql

echo "PostgreSQL pret."
echo "Connexion applicative: postgresql://${DB_USER}:***@$(hostname -I | awk '{print $1}'):5432/${DB_NAME}?schema=public"
