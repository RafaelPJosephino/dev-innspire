---
description: "FASE 9/9 — Publica a documentação técnica e/ou de QA como comentário na task do ClickUp e atualiza o status para 'pronto para review'. Requer fase8-docs.md."
---

# Skill — /publicar-clickup · Fase 9 de 9

Publica a documentação no ClickUp e encerra o workflow com o status atualizado.

## Uso

```
/publicar-clickup <TASK_ID>
```

---

## Execução

### 1 · Validar argumento

O argumento `$ARGUMENTS` contém o TASK_ID.
Se não foi fornecido, solicite ao usuário antes de prosseguir.

### 2 · Carregar contexto

Leia `.tasks/<TASK_ID>/fase8-docs.md`.

Se não existir:
```
⚠️  CONTEXTO NÃO ENCONTRADO
   A Fase 8 ainda não foi executada para esta task.
   Execute primeiro: /documentar <TASK_ID>
```
Encerre.

### 3 · Confirmar o que publicar

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 FASE 9/9 — PUBLICAR NO CLICKUP

   O que deseja publicar como comentário na task?

     [1] ✅ Ambos os documentos (técnica + QA)
     [2] 📋 Só a documentação técnica
     [3] 🧪 Só a documentação de QA
     [4] ❌ Não publicar

   Digite 1, 2, 3 ou 4:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4a · Se escolher [1], [2] ou [3]

- Use o MCP do ClickUp para postar o(s) documento(s) selecionado(s) como comentário na task.
- Mude o status da task para `pronto para review`.

Exiba:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 WORKFLOW CONCLUÍDO — <título da task>

   ✅ Desenvolvimento:  concluído
   ✅ Testes E2E:       X/X aprovados
   ✅ Documentação:     publicada no ClickUp
   ✅ Status da task:   pronto para review

   Artefatos gerados:
     • tests/e2e/CU-<TASK_ID>.spec.ts
     • .tasks/<TASK_ID>/fase1-task.md
     • .tasks/<TASK_ID>/fase2-analise.md
     • .tasks/<TASK_ID>/fase3-plano.md
     • .tasks/<TASK_ID>/fase4-dev.md
     • .tasks/<TASK_ID>/fase5-plano-teste.md
     • .tasks/<TASK_ID>/fase6-testes.md
     • .tasks/<TASK_ID>/fase7-resultado.md
     • .tasks/<TASK_ID>/fase8-docs.md

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4b · Se escolher [4]

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ WORKFLOW CONCLUÍDO — Documentação não publicada

   Desenvolvimento e testes concluídos.
   Contexto completo disponível em: .tasks/<TASK_ID>/

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
