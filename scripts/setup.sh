#!/usr/bin/env bash
# Cross-platform first-time setup (macOS / Linux / Git Bash on Windows)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Installing server dependencies..."
npm install --prefix "$ROOT/server"

echo "==> Installing client dependencies..."
npm install --prefix "$ROOT/client"

if [ ! -f "$ROOT/server/.env" ]; then
  cp "$ROOT/server/.env.example" "$ROOT/server/.env"
  echo "==> Created server/.env from .env.example"
  echo "    Optional: edit DEEPSEEK_API_KEY for AI analysis"
fi

echo "==> Database setup..."
npm run db:setup --prefix "$ROOT/server"

echo ""
echo "Done. Start with two terminals:"
echo "  Terminal 1: npm run dev:server"
echo "  Terminal 2: npm run dev:client"
echo "  Open http://localhost:5173"
