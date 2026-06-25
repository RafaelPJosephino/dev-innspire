# ClickUp MCP Reference

Como usar o MCP do ClickUp no dev-agent — tools disponíveis, padrões de uso e tratamento de erros.

---

## Tools por Fase

### Fase 1 — Leitura

| Tool | Uso |
|---|---|
| `mcp__claude_ai_ClickUp__clickup_get_task` | Busca título, descrição, status, prioridade, responsável, prazo e campos customizados |
| `mcp__claude_ai_ClickUp__clickup_get_task_comments` | Busca todos os comentários em ordem cronológica |
| `mcp__claude_ai_ClickUp__clickup_get_workspace_hierarchy` | Mapeia spaces, folders e lists para contexto |
| `mcp__claude_ai_ClickUp__clickup_filter_tasks` | Lista subtasks relacionadas |

### Fase 7 — Publicação

| Tool | Uso |
|---|---|
| `mcp__claude_ai_ClickUp__clickup_create_comment` | Posta documentação técnica e/ou QA como comentário |
| `mcp__claude_ai_ClickUp__clickup_update_task` | Muda status para `pronto para review` |

---

## Padrões de Leitura

### Buscar task completa

```
mcp__claude_ai_ClickUp__clickup_get_task(task_id: "<TASK_ID>")
```

Retorna: `id`, `name`, `description`, `status`, `priority`, `assignees`, `due_date`, `custom_fields`, `list`, `folder`, `space`.

### Buscar comentários

```
mcp__claude_ai_ClickUp__clickup_get_task_comments(task_id: "<TASK_ID>")
```

Retorna array de comentários com `comment_text`, `user`, `date`. Sempre leia do mais antigo ao mais recente — comentários antigos têm contexto de decisões importantes.

### Buscar subtasks

```
mcp__claude_ai_ClickUp__clickup_filter_tasks(list_id: "<LIST_ID>", parent: "<TASK_ID>")
```

---

## Padrões de Escrita

### Postar documentação como comentário

```
mcp__claude_ai_ClickUp__clickup_create_comment(
  task_id: "<TASK_ID>",
  comment_text: "<conteúdo da documentação formatado em markdown>"
)
```

**Formato recomendado para o comentário:**
```
## 📄 Documentação Técnica
[conteúdo]

---

## 🧪 Documentação QA
[conteúdo]
```

### Mudar status

```
mcp__claude_ai_ClickUp__clickup_update_task(
  task_id: "<TASK_ID>",
  status: "pronto para review"
)
```

**Importante:** O nome exato do status depende do workspace. Se `pronto para review` falhar, tente `ready for review` ou consulte os status disponíveis via `get_task`.

---

## Tratamento de Erros

| Erro | Causa provável | Ação |
|---|---|---|
| Task não encontrada | ID incorreto ou sem permissão | Confirmar ID com o usuário |
| Status inválido | Nome do status diferente no workspace | Listar status disponíveis e usar o correto |
| Comentário não criado | Task fechada ou permissão insuficiente | Informar o usuário e exibir doc no terminal |
| Rate limit | Muitas chamadas simultâneas | Aguardar 1s e tentar novamente |

---

## Preflight do ClickUp

Antes de qualquer chamada MCP na Fase 1, verificar se o conector está ativo:

1. Tentar `mcp__claude_ai_ClickUp__clickup_get_task` com o TASK_ID fornecido
2. Se retornar auth error → informar que o conector ClickUp precisa estar conectado em **Customize → Connectors**
3. Nunca prosseguir sem dados reais da task

---

## Campos Customizados Relevantes

Campos comuns em workspaces de desenvolvimento — verificar se existem na task:

| Campo | O que indica |
|---|---|
| `Critério de Aceite` | Definition of Done — fundamental para Fase 2 |
| `Ambiente` | Staging, produção, local — afeta testes |
| `Tipo` | Bug, feature, chore — afeta plano de ação |
| `Sprint` | Contexto de urgência e prioridade |
| `PR/Branch` | Se já tem desenvolvimento iniciado |

Se o campo `Critério de Aceite` estiver vazio, é um sinal de alerta imediato para a Fase 2.
