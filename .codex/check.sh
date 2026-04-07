#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -f package.json ]; then
  echo "package.json not found in $ROOT_DIR"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Dependencies are missing. Run: npm install"
  exit 1
fi

echo "[codex] Running typecheck"
npm run typecheck

echo "[codex] Running build"
npm run build

echo "[codex] Checks completed"
