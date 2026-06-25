---
name: executar-tarefa-clickup
description: Executes the full 8-phase development workflow for a ClickUp task. Pass a ClickUp task ID to read the task, validate completeness, create a technical plan (requires approval), develop the code, generate and run Playwright E2E tests, produce technical and QA documentation, and publish everything back to ClickUp.
---

# Skill — /executar-tarefa-clickup

Executa o workflow completo de desenvolvimento para uma task do ClickUp, orquestrando 7 agentes especializados em sequência.

## Uso

```
/executar-tarefa-clickup <TASK_ID>
```

## Fluxo

```
[Fase 1] task-reader              → haiku  — recupera todos os dados da task
         ↓
[Fase 2] requirements-analyst  → sonnet — valida completude; bloqueia se faltar info
         ↓
[Fase 3] software-engineer  → opus   — cria plano técnico; aguarda aprovação
         ↓
[Fase 4] developer        → sonnet — implementa o plano aprovado
         ↓
[Fase 5] test-planner         → sonnet — define test plan; awaits approval
         ↓
[Fase 6] test-analyst         → sonnet — writes tests/e2e/CU-<ID>.spec.ts
         ↓
[Fase 7] test-runner      → haiku  — executa testes via bash (máx. 2 tentativas)
         ↓
[Fase 8] documentation-analyst → sonnet — gera doc técnica + QA; publica no ClickUp
```

## Referências

Leia os arquivos de referência antes de executar cada fase:

- `references/workflow-phases.md` — detalhes completos de cada fase e regras globais
- `references/clickup-mcp-reference.md` — tools do ClickUp MCP, padrões de leitura e escrita
- `references/playwright-reference.md` — padrões de teste, seletores, assertions e cobertura
- `references/coding-standards.md` — convenções de código, verificação de build e escopo

## Regras Invioláveis

1. Fase 3 obrigatória — nenhuma linha de código sem aprovação do plano.
2. Fase 7 obrigatória — documentação sempre gerada.
3. Nunca assuma o que não está escrito. Dúvida = perguntar.
4. Testes rodam via bash local — nunca peça ao usuário para testar manualmente.
5. Máximo 2 tentativas de correção automática em caso de falha nos testes.
6. Falha inesperada = informar com contexto completo antes de encerrar.
