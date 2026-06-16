#!/usr/bin/env bash
# Start the SYC OS Form Assistant (POC).
# Installs deps on first run, generates the specimen documents if missing,
# then launches the Vite dev server.
set -euo pipefail

cd "$(dirname "$0")"

# 1. Dependencies
if [ ! -d node_modules ]; then
  echo "→ Installing npm dependencies…"
  npm install
fi

# 2. API key check
if [ ! -f .env.local ] && [ -z "${VITE_OPENAI_API_KEY:-}" ]; then
  echo "⚠  No .env.local found. Create one with:"
  echo "     VITE_OPENAI_API_KEY=sk-..."
  echo "   (AI features are disabled without it.)"
fi

# 3. Specimen documents (need Chromium once)
if [ ! -d resources ] || [ -z "$(ls -A resources 2>/dev/null)" ]; then
  echo "→ Generating specimen documents…"
  npx playwright install chromium >/dev/null 2>&1 || true
  npm run gen:resources
fi

# 4. Run
echo "→ Starting dev server…"
npm run dev &
dev_pid=$!

cleanup() {
  if kill -0 "$dev_pid" 2>/dev/null; then
    echo
    echo "→ Stopping dev server (PID $dev_pid)…"
    kill "$dev_pid" 2>/dev/null || true
    wait "$dev_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM
wait "$dev_pid"
