# Reference — ler-task (Fase 1/9)

Referência técnica para leitura de tasks via MCP do ClickUp.

---

## MCP tools utilizados

| Tool | Finalidade |
| ---- | ---------- |
| `mcp__claude_ai_ClickUp__clickup_get_task` | Título, descrição, status, prioridade, responsável, prazo, campos customizados |
| `mcp__claude_ai_ClickUp__clickup_get_task_comments` | Todos os comentários em ordem cronológica |
| `mcp__claude_ai_ClickUp__clickup_get_workspace_hierarchy` | Contexto de space, folder e list |
| `mcp__claude_ai_ClickUp__clickup_filter_tasks` | Subtasks vinculadas à task principal |

---

## Chamadas MCP — sintaxe

```text
mcp__claude_ai_ClickUp__clickup_get_task(task_id: "<TASK_ID>")
```

Retorna: `id`, `name`, `description`, `status`, `priority`, `assignees`, `due_date`, `custom_fields`, `list`, `folder`, `space`.

```text
mcp__claude_ai_ClickUp__clickup_get_task_comments(task_id: "<TASK_ID>")
```

Retorna array com `comment_text`, `user`, `date`. Ler do mais antigo ao mais recente — comentários antigos contêm contexto de decisões importantes.

```text
mcp__claude_ai_ClickUp__clickup_filter_tasks(list_id: "<LIST_ID>", parent: "<TASK_ID>")
```

---

## Preflight — verificar conexão antes de qualquer leitura

1. Tentar `clickup_get_task` com o TASK_ID fornecido.
2. Se retornar erro de autenticação → informar: *"O conector ClickUp precisa estar conectado em Customize → Connectors"*.
3. **Nunca prosseguir sem dados reais.** Fabricar dados é proibido.

---

## Validações obrigatórias antes de encerrar a fase

| Validação | O que verificar |
| --------- | --------------- |
| MCP chamado | `tool_uses > 0` — a chamada realmente aconteceu |
| Título presente | `name` não está vazio nem `null` |
| ID correto | ID retornado corresponde ao TASK_ID solicitado |

Se qualquer validação falhar: encerrar com erro explícito.

---

## Campos customizados relevantes

| Campo | Importância |
| ----- | ----------- |
| `Critério de Aceite` | Fundamental para Fase 2 — se vazio, alerta imediato |
| `Ambiente` | Afeta configuração de testes (Fase 7) |
| `Tipo` | Bug, feature, chore — afeta estratégia do plano (Fase 3) |
| `Sprint` | Contexto de urgência e prioridade |
| `PR/Branch` | Indica se já existe desenvolvimento iniciado |

---

## Tratamento de erros MCP

| Erro | Causa provável | Ação |
| ---- | -------------- | ---- |
| Task não encontrada | ID incorreto ou sem permissão | Confirmar TASK_ID com o usuário |
| Auth error | Conector não autenticado | Instruir usuário a conectar em Customize → Connectors |
| Rate limit | Muitas chamadas | Aguardar 1s e tentar novamente |
