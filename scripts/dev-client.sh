#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
CLIENT_DIR="$ROOT_DIR/client"

if [ ! -d "$CLIENT_DIR" ]; then
  echo "client/ directory not found at $CLIENT_DIR" >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required to run the Codernauts client" >&2
  exit 1
fi

cd "$CLIENT_DIR"

if [ ! -d node_modules ]; then
  echo "Installing client dependencies with pnpm install"
  pnpm install
fi

export CODERNAUTS_API_URL="${CODERNAUTS_API_URL:-http://127.0.0.1:${PORT:-8080}}"
export CODERNAUTS_API_TOKEN="${CODERNAUTS_API_TOKEN:-${CODERNAUTS_TOKEN:-dev-token}}"

if [ "$#" -eq 0 ]; then
  exec pnpm cli status
fi

exec pnpm cli "$@"
