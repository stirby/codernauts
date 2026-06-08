#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
DEFAULT_PORT="${PORT:-8080}"
API_URL="${CODERNAUTS_API_URL:-http://127.0.0.1:${DEFAULT_PORT}}"
API_URL="${API_URL%/}"
TOKEN="${CODERNAUTS_API_TOKEN:-${CODERNAUTS_DEV_TOKEN:-dev-token}}"
AUTH_HEADER="Authorization: Bearer ${TOKEN}"
SERVER_PID=""
SERVER_LOG=""
STARTED_SERVER=0
HAVE_JQ=0
LAST_BODY=""
LAST_STATUS=""

if command -v jq >/dev/null 2>&1; then
  HAVE_JQ=1
fi

cleanup() {
  if [ -n "$LAST_BODY" ] && [ -f "$LAST_BODY" ]; then
    rm -f "$LAST_BODY"
  fi
  if [ "$STARTED_SERVER" -eq 1 ] && [ -n "$SERVER_PID" ]; then
    pkill -TERM -P "$SERVER_PID" >/dev/null 2>&1 || true
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
    pkill -KILL -P "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  if [ -n "$SERVER_LOG" ] && [ -f "$SERVER_LOG" ]; then
    rm -f "$SERVER_LOG"
  fi
}
trap cleanup EXIT INT TERM

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "$1 is required" >&2
    exit 1
  fi
}

new_body_file() {
  if [ -n "$LAST_BODY" ] && [ -f "$LAST_BODY" ]; then
    rm -f "$LAST_BODY"
  fi
  LAST_BODY=$(mktemp)
}

print_json_summary() {
  body_file=$1
  if [ "$HAVE_JQ" -eq 1 ]; then
    jq -c . < "$body_file" 2>/dev/null || sed -n '1,12p' "$body_file"
  else
    sed -n '1,12p' "$body_file"
  fi
}

status_allowed() {
  status=$1
  allowed=$2
  for code in $allowed; do
    if [ "$status" = "$code" ]; then
      return 0
    fi
  done
  return 1
}

request() {
  method=$1
  path=$2
  data=${3:-}
  expected=${4:-"200 201 202 204"}
  new_body_file
  headers_file=$(mktemp)

  if [ -n "$data" ]; then
    LAST_STATUS=$(curl -sS -X "$method" \
      -H "$AUTH_HEADER" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: smoke-$(date +%s)-$$" \
      -d "$data" \
      -D "$headers_file" \
      -o "$LAST_BODY" \
      -w '%{http_code}' \
      "$API_URL$path" || true)
  else
    LAST_STATUS=$(curl -sS -X "$method" \
      -H "$AUTH_HEADER" \
      -D "$headers_file" \
      -o "$LAST_BODY" \
      -w '%{http_code}' \
      "$API_URL$path" || true)
  fi

  if status_allowed "$LAST_STATUS" "$expected"; then
    printf 'ok   %s %s -> %s\n' "$method" "$path" "$LAST_STATUS"
    if [ "$LAST_STATUS" != "204" ]; then
      print_json_summary "$LAST_BODY" | sed 's/^/     /'
    fi
    rm -f "$headers_file"
    return 0
  fi

  printf 'fail %s %s -> %s\n' "$method" "$path" "$LAST_STATUS" >&2
  sed -n '1,12p' "$LAST_BODY" | sed 's/^/     /' >&2
  rm -f "$headers_file"
  return 1
}

is_healthy() {
  curl -fsS -H "$AUTH_HEADER" "$API_URL/v1/health" >/dev/null 2>&1
}

wait_for_server() {
  i=0
  while [ "$i" -lt 40 ]; do
    if is_healthy; then
      return 0
    fi
    if [ "$STARTED_SERVER" -eq 1 ] && ! kill -0 "$SERVER_PID" >/dev/null 2>&1; then
      echo "Server exited before becoming healthy" >&2
      if [ -n "$SERVER_LOG" ] && [ -f "$SERVER_LOG" ]; then
        sed -n '1,120p' "$SERVER_LOG" >&2
      fi
      exit 1
    fi
    i=$((i + 1))
    sleep 0.25
  done
  echo "Timed out waiting for $API_URL" >&2
  if [ -n "$SERVER_LOG" ] && [ -f "$SERVER_LOG" ]; then
    sed -n '1,120p' "$SERVER_LOG" >&2
  fi
  exit 1
}

start_server_if_needed() {
  if is_healthy; then
    echo "Using existing Codernauts server at $API_URL"
    return 0
  fi

  if [ -n "${CODERNAUTS_API_URL:-}" ]; then
    echo "CODERNAUTS_API_URL is set but $API_URL is not healthy" >&2
    exit 1
  fi

  require_cmd go
  SERVER_LOG=$(mktemp)
  echo "Starting local Codernauts server at $API_URL"
  (
    cd "$ROOT_DIR"
    exec go run ./cmd/codernauts-server -addr ":$DEFAULT_PORT"
  ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  STARTED_SERVER=1
  wait_for_server
}


main() {
  require_cmd curl
  if [ "$HAVE_JQ" -eq 0 ]; then
    echo "jq not found. Continuing with raw response previews."
  fi

  start_server_if_needed

  echo "Running smoke tests against $API_URL"
  request GET "/v1/health"
  request GET "/v1/status"
  request GET "/v1/sector"
  request GET "/v1/miners"

  if [ "$HAVE_JQ" -eq 1 ]; then
    STARTER_MINER_ID=$(jq -r '.miners[0].id // empty' < "$LAST_BODY")
  else
    STARTER_MINER_ID=""
  fi

  request POST "/v1/miners" "{}" "200 201 202 204 409"
  if [ "$LAST_STATUS" = "409" ]; then
    if [ "$HAVE_JQ" -eq 1 ]; then
      if [ "$(jq -r '.error.code // empty' < "$LAST_BODY")" != "insufficient_resources" ]; then
        echo "Build endpoint returned an unexpected conflict." >&2
        exit 1
      fi
      echo "ok   build endpoint reached, but this game state has insufficient resources for another miner"
    else
      echo "jq unavailable. Accepted build conflict without parsing the error code."
    fi
  elif [ "$HAVE_JQ" -eq 1 ]; then
    BUILT_MINER_ID=$(jq -r '.id // empty' < "$LAST_BODY")
  else
    BUILT_MINER_ID=""
  fi

  if [ "$HAVE_JQ" -eq 1 ] && [ -n "${STARTER_MINER_ID:-}" ]; then
    request POST "/v1/miners/${STARTER_MINER_ID}/upgrade" "{}"
  else
    echo "Skipping upgrade check because jq is unavailable or no miner ID was found."
  fi

  request POST "/v1/actions/scan" '{"direction":"north"}'
  if [ "$HAVE_JQ" -eq 1 ]; then
    ACTION_ID=$(jq -r '.id // empty' < "$LAST_BODY")
    if [ -n "$ACTION_ID" ]; then
      request GET "/v1/actions/${ACTION_ID}"
    fi
  fi
  request GET "/v1/log"
  echo "Smoke test passed"
}

main "$@"
