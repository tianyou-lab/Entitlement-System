#!/usr/bin/env bash
set -euo pipefail

ADMIN_URL="${ADMIN_URL:-http://127.0.0.1:8080}"
SERVER_URL="${SERVER_URL:-http://127.0.0.1:3000}"
LICENSE_UI_URL="${LICENSE_UI_URL:-http://127.0.0.1:8081}"

curl -fsS "$ADMIN_URL/index.html" >/dev/null
curl -fsS "$SERVER_URL/health" >/dev/null
curl -fsS "$LICENSE_UI_URL/index.html" >/dev/null
docker compose --env-file "${ENV_FILE:-.env.production}" -f "${COMPOSE_FILE:-docker-compose.prod.yml}" ps
