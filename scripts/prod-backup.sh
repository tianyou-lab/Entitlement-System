#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
BACKUP_DIR="${BACKUP_DIR:-backups}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgres pg_dump -U entitlement entitlement > "$BACKUP_DIR/entitlement-$TIMESTAMP.sql"
echo "$BACKUP_DIR/entitlement-$TIMESTAMP.sql"
