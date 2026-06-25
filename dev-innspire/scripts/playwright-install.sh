#!/usr/bin/env bash
set -e

MARKER=".playwright-installed"

if [ -f "$MARKER" ]; then
  echo "✓ Playwright já instalado."
  exit 0
fi

echo "📦 Instalando @playwright/test..."
npm install --save-dev @playwright/test

echo "🌐 Instalando Chromium local..."
npx playwright install chromium --with-deps

date > "$MARKER"
echo "✅ Playwright pronto."
