#!/usr/bin/env bash
set -euo pipefail

SERVER_URL="${SERVER_URL:-http://127.0.0.1:3000}"

if [[ -z "${ADMIN_TOKEN:-}" ]]; then
  echo "ADMIN_TOKEN is required" >&2
  exit 2
fi

curl -fsS \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  "$SERVER_URL/admin/monitoring/metrics"
