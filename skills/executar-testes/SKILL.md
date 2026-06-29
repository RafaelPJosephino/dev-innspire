---
description: "FASE 7/9 — Executa os testes Playwright localmente via bash. Corrige falhas no código da aplicação automaticamente (máx. 2 tentativas). Bloqueia e encerra se ainda falhar."
---

# Skill — /executar-testes · Fase 7 de 9

Executa os testes E2E localmente e corrige falhas no código da aplicação se necessário.

## Uso

```
/executar-testes <TASK_ID>
```

---

## Execução

### 1 · Validar argumento

O argumento `$ARGUMENTS` contém o TASK_ID.
Se não foi fornecido, solicite ao usuário antes de prosseguir.

### 2 · Carregar contexto

Leia `.tasks/<TASK_ID>/fase6-testes.md`.

Se não existir:
```
⚠️  CONTEXTO NÃO ENCONTRADO
   A Fase 6 ainda não foi executada para esta task.
   Execute primeiro: /criar-testes <TASK_ID>
```
Encerre.

### 3 · Confirmar pré-requisito

Exiba antes de executar:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  PRÉ-REQUISITO — Fase 7 (testes E2E)

   O dev server precisa estar rodando localmente.
   Suba o app e confirme quando estiver no ar:

     [1] ✅ App rodando — iniciar testes
     [2] ❌ Cancelar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Aguarde confirmação explícita do usuário antes de executar.**

### 4 · Executar os testes

```bash
bash scripts/playwright-install.sh
bash scripts/run-tests.sh CU-<TASK_ID>
```

### 5a · Se os testes PASSAREM

Salve `.tasks/<TASK_ID>/fase7-resultado.md` com resultado completo.

Exiba:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FASE 7/9 CONCLUÍDA — Testes aprovados

   Passou: X | Falhou: 0 | Tempo: Xs

   Contexto salvo em: .tasks/<TASK_ID>/fase7-resultado.md

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ Próxima fase: /documentar <TASK_ID>
```

### 5b · Se os testes FALHAREM

Exiba diagnóstico e tente corrigir o código da **aplicação** — nunca o arquivo de testes:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ FASE 7/9 — FALHA NOS TESTES (Tentativa <N>/2)

   Testes que falharam:
     • <nome do teste>
       Erro:  <mensagem de erro>
       Linha: <arquivo:linha>

   Diagnóstico:  <causa raiz identificada>
   Correção:     <o que foi ajustado no código>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Reexecute. **Máximo de 2 tentativas.**

Se após 2 tentativas ainda falhar:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 FASE 7/9 — BLOQUEIO (2/2 tentativas esgotadas)

   Testes que exigem revisão humana:
     • <teste> — <erro detalhado>

   Recomendação: <o que o desenvolvedor deve verificar>

   Corrija o problema e rode novamente: /executar-testes <TASK_ID>

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Encerre sem avançar para a documentação.
