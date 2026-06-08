#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

PORT="${PORT:-8080}"
CODERNAUTS_DEV_TOKEN="${CODERNAUTS_DEV_TOKEN:-dev-token}"
export CODERNAUTS_DEV_TOKEN

echo "Starting Codernauts server on PORT=$PORT"
echo "Using development bearer token from CODERNAUTS_DEV_TOKEN"
exec go run ./cmd/codernauts-server -addr ":$PORT"
