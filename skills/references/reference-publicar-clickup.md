# Reference — publicar-clickup (Fase 9/9)

Referência para publicação de documentação no ClickUp via MCP.

---

## MCP tools utilizados

| Tool | Finalidade |
| ---- | ---------- |
| `mcp__claude_ai_ClickUp__clickup_create_comment` | Posta documentação como comentário na task |
| `mcp__claude_ai_ClickUp__clickup_update_task` | Muda status para `pronto para review` |

---

## Chamadas MCP — sintaxe

### Postar documentação

```text
mcp__claude_ai_ClickUp__clickup_create_comment(
  task_id: "<TASK_ID>",
  comment_text: "<conteúdo formatado em markdown>"
)
```

### Mudar status

```text
mcp__claude_ai_ClickUp__clickup_update_task(
  task_id: "<TASK_ID>",
  status: "pronto para review"
)
```

**Atenção:** O nome exato do status depende do workspace. Se `pronto para review` falhar, tentar `ready for review` ou consultar os status disponíveis via `clickup_get_task`.

---

## Formato do comentário no ClickUp

Quando publicar ambos os documentos (opção [1]):

```text
## 📄 Documentação Técnica

<conteúdo completo da documentação técnica>

---

## 🧪 Documentação QA

<conteúdo completo da documentação QA>
```

Quando publicar apenas um dos documentos (opções [2] ou [3]):
- Usar apenas o bloco correspondente, sem o separador `---`.

---

## Ordem de execução

1. Postar comentário(s) com `clickup_create_comment`.
2. Confirmar que o comentário foi criado com sucesso.
3. Atualizar status com `clickup_update_task`.
4. Confirmar que o status foi atualizado.
5. Exibir resumo final do workflow.

Executar nessa ordem — não inverter: comentário primeiro, status depois.

---

## Tratamento de erros MCP

| Erro | Causa provável | Ação |
| ---- | -------------- | ---- |
| `Task não encontrada` | ID incorreto | Confirmar TASK_ID com o usuário |
| `Status inválido` | Nome diferente no workspace | Listar status disponíveis e usar o correto |
| `Permissão insuficiente` | Usuário sem acesso de escrita | Informar usuário — exibir doc no terminal como alternativa |
| `Rate limit` | Muitas chamadas | Aguardar 1s e tentar novamente |

---

## Resumo final do workflow — o que incluir

```text
🎉 WORKFLOW CONCLUÍDO — <título>

✅ Desenvolvimento:  concluído (N etapas)
✅ Testes E2E:       X/X aprovados (Xs)
✅ Documentação:     publicada no ClickUp
✅ Status da task:   pronto para review

Artefatos:
  • tests/e2e/CU-<TASK_ID>.spec.ts
  • .tasks/<TASK_ID>/ (9 arquivos de contexto)
```
