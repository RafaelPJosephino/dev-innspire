#!/usr/bin/env bash
# Uso: bash scripts/run-tests.sh CU-86abc1234
set -e

TASK_ID="${1:?Uso: bash scripts/run-tests.sh CU-<TASK_ID>}"
SPEC="tests/e2e/${TASK_ID}.spec.ts"
BASE_URL="${BASE_URL:-http://localhost:3000}"

if [ ! -f "$SPEC" ]; then
  echo "❌ Arquivo não encontrado: $SPEC"
  exit 1
fi

echo "🎭 Playwright — $TASK_ID"
echo "   Spec: $SPEC"
echo "   URL:  $BASE_URL"
echo ""

npx playwright test "$SPEC" \
  --reporter=list \
  --output="playwright-report/${TASK_ID}" \
  --timeout=30000

EXIT=$?

echo ""
[ $EXIT -eq 0 ] && echo "✅ Testes passaram." || echo "❌ Testes falharam. Relatório: playwright-report/${TASK_ID}"

exit $EXIT
