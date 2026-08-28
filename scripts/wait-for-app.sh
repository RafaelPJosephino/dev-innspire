#!/usr/bin/env bash
# Health check do dev server — substitui a confirmação manual da Fase 7.
#
# No modo assistido a skill pergunta "o app está rodando? [1] sim [2] cancelar".
# No autônomo não há ninguém para responder às 3h da manhã: ou o app sobe e o
# polling confirma, ou a tarefa vai para ia-bloqueada com motivo claro.
#
# Uso: bash scripts/wait-for-app.sh [URL] [TIMEOUT_SEGUNDOS]
set -uo pipefail

URL="${1:-${BASE_URL:-http://localhost:3000}}"
TIMEOUT="${2:-120}"
INTERVALO=2

echo "⏳ Aguardando app em $URL (timeout ${TIMEOUT}s)"

INICIO=$(date +%s)
while :; do
  CODIGO=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$URL" 2>/dev/null || echo 000)

  # Qualquer resposta HTTP serve: significa que há um servidor atendendo.
  # Exigir 200 quebraria apps cuja raiz redireciona para login.
  if [ "$CODIGO" != "000" ]; then
    echo "✅ App respondeu HTTP $CODIGO após $(( $(date +%s) - INICIO ))s"
    exit 0
  fi

  AGORA=$(date +%s)
  if [ $(( AGORA - INICIO )) -ge "$TIMEOUT" ]; then
    echo "❌ App não respondeu em ${TIMEOUT}s — $URL"
    echo "   Motivo provável: dev server não subiu, porta errada, ou build falhou."
    exit 1
  fi

  sleep "$INTERVALO"
done
