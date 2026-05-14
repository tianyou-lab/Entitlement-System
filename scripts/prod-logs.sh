#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
SERVICE="${1:-server}"
TAIL="${TAIL:-200}"
FOLLOW="${FOLLOW:-0}"

case "$SERVICE" in
  server|admin|license-ui|postgres|all) ;;
  *)
    echo "usage: $0 [server|admin|license-ui|postgres|all]" >&2
    exit 2
    ;;
esac

args=(--env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail "$TAIL")
if [[ "$FOLLOW" == "1" || "$FOLLOW" == "true" ]]; then
  args+=(-f)
fi
if [[ "$SERVICE" != "all" ]]; then
  args+=("$SERVICE")
fi

docker compose "${args[@]}"
