#!/usr/bin/env bash
# Starts the Veritas local stack: checks tools, prepares .env, starts docker
# services, installs deps, runs migrations, then starts dev servers.
# Usage: ./init.sh [--desktop]
set -euo pipefail

cd "$(dirname "$0")"

WITH_DESKTOP=false
[[ "${1:-}" == "--desktop" ]] && WITH_DESKTOP=true

fail() { echo "init: $*" >&2; exit 1; }
has() { command -v "$1" >/dev/null 2>&1; }

has node   || fail "Node.js 24+ is required (https://nodejs.org)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 24 )) || fail "Node.js 24+ is required, found $(node -v)"
has pnpm   || fail "pnpm is required: corepack enable && corepack prepare pnpm@latest --activate"
has docker || fail "Docker is required for Postgres, Redis, MinIO and Mailpit"
docker info >/dev/null 2>&1 || fail "Docker is installed but not running"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "init: created .env from .env.example. Set GEMINI_API_KEY and auth secrets before using the agent."
fi

echo "init: starting docker services"
docker compose up -d --wait postgres redis minio mailpit

echo "init: installing dependencies"
pnpm install

if [[ -d apps/server ]]; then
  echo "init: running migrations"
  pnpm db:migrate
else
  echo "init: apps/server not built yet (F001). Services are up; skipping migrations and dev servers."
  exit 0
fi

FILTERS=(--filter @veritas/server --filter web)
$WITH_DESKTOP && FILTERS+=(--filter @veritas/desktop)

echo "init: web http://localhost:3000  api http://localhost:4000  mail http://localhost:8025"
exec pnpm turbo run dev "${FILTERS[@]}"
