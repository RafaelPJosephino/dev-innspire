---
description: "FASE 1/9 — Lê todos os dados da task do ClickUp via MCP e salva em .tasks/TASK_ID/fase1-task.md. Pré-requisito para todas as demais fases."
---

# Skill — /ler-task · Fase 1 de 9

Recupera o conteúdo completo da task do ClickUp e persiste o contexto para as fases seguintes.

## Uso

```text
/ler-task <TASK_ID>
```

---

## Execução

### 1 · Validar argumento

O argumento `$ARGUMENTS` contém o TASK_ID.
Se não foi fornecido, solicite ao usuário antes de prosseguir.

### 2 · Buscar dados via MCP

Use o MCP do ClickUp para recuperar **todos** os dados da task:

| Dado | O que buscar |
| ---- | ------------ |
| Título | Nome completo da task |
| Descrição | Texto integral, sem truncar |
| Comentários | Do mais antigo ao mais recente |
| Subtasks | Lista com status de cada uma |
| Campos customizados | Todos os campos preenchidos |
| Responsável | Nome e ID do assignee |
| Prioridade | Nível definido |
| Prazo | Data de entrega ou ausência dela |

**Validações obrigatórias antes de prosseguir:**

- MCP foi chamado de verdade (`tool_uses > 0`)
- Título retornado não está vazio
- ID retornado corresponde ao TASK_ID solicitado

Se qualquer validação falhar: encerrar com erro — **nunca fabricar dados**.

### 3 · Persistir contexto

Crie `.tasks/<TASK_ID>/` se não existir.

Salve `.tasks/<TASK_ID>/fase1-task.md` com todo o conteúdo bruto:
título, descrição completa, comentários numerados, subtasks, campos customizados, responsável, prioridade e prazo.

### 4 · Exibir resumo

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 FASE 1/9 CONCLUÍDA — Task lida

   Título:      <título>
   ID:          <id>
   Status:      <status>
   Responsável: <nome>
   Prioridade:  <prioridade>
   Prazo:       <data ou "não definido">
   Comentários: <N>
   Subtasks:    <N>

   Contexto salvo em: .tasks/<TASK_ID>/fase1-task.md

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ Próxima fase: /analisar-task <TASK_ID>
```
