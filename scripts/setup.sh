#!/bin/bash
set -euo pipefail

echo "=== ApplyQueue Local Setup ==="
echo ""

command -v node >/dev/null 2>&1 || { echo "Node.js is required. Install from https://nodejs.org/"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "Installing pnpm..."; npm install -g pnpm; }
command -v firebase >/dev/null 2>&1 || { echo "Installing Firebase CLI..."; npm install -g firebase-tools; }

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "Node.js 20+ is required. Current: $(node -v)"
  exit 1
fi

echo "Installing dependencies..."
pnpm install

if [ ! -f .env.local ]; then
  echo "Creating .env.local from template..."
  cp .env.example .env.local
  echo ""
  echo "!! Edit .env.local with your Firebase config before starting !!"
  echo "   Get config from: Firebase Console → Project Settings → Web App"
  echo ""
fi

echo "Building shared packages..."
pnpm --filter @applyqueue/shared build

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Edit .env.local with your Firebase config"
echo "  2. Run: firebase emulators:start"
echo "  3. Run: pnpm dev"
echo "  4. Open: http://localhost:5173"
echo ""
