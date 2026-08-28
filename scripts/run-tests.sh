#!/usr/bin/env bash
# Uso: bash scripts/run-tests.sh CU-86abc1234
#
# Nota: NÃO usar `set -e` aqui. Com ele, um teste que falha aborta o script
# na própria linha do `npx playwright test`, antes de `EXIT=$?` — o diagnóstico
# e o caminho do relatório nunca chegam a ser impressos, que é exatamente a
# informação de que a fase de correção precisa.
set -uo pipefail

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
if [ $EXIT -eq 0 ]; then
  echo "✅ Testes passaram."
else
  echo "❌ Testes falharam (exit $EXIT). Relatório: playwright-report/${TASK_ID}"
fi

exit $EXIT
