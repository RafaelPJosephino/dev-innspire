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
         ↓ (BLOQUEIA se MCP indisponível ou título vazio)
[Fase 2] requirements-analyst  → sonnet — valida completude; bloqueia se faltar info
         ↓
[Fase 3] software-engineer  → opus   — cria plano técnico; aguarda aprovação
         ↓
[Fase 4] developer        → sonnet — implementa o plano aprovado
         ↓
[Fase 4b] verificação visual local — usuário confirma app rodando e feature OK
         ↓
[Fase 5] test-planner         → sonnet — define test plan; aguarda aprovação
         ↓
[Fase 6] test-analyst         → sonnet — escreve e2e/specs/CU-<ID>.spec.ts
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

## Validações entre fases

**Fase 1 → Fase 2:**
Antes de passar para a Fase 2, verificar:
- `tool_uses > 0` na Fase 1 (MCP foi chamado de verdade)
- Título da task não está vazio
- ID retornado corresponde ao ID solicitado

Se qualquer verificação falhar: encerrar com erro explícito, não passar dados para a Fase 2.

**Fase 4 → Fase 5 (Fase 4b obrigatória):**
Após build OK na Fase 4, exibir ao usuário:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Fase 4 concluída — build OK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de seguir para os testes, valide a implementação localmente:

1. Suba o app (exemplo Angular): ng serve --configuration=development
2. Acesse a rota da funcionalidade implementada
3. Verifique manualmente os critérios de aceite:
   [ ] <critério 1 da task>
   [ ] <critério 2 da task>

Confirme para prosseguir:
  [1] ✅ Validado — seguir para Fase 5 (test-planner)
  [2] ⚠️  Encontrei um problema — descreva para corrigir
```

Aguardar resposta explícita. Se [2]: corrigir e repetir Fase 4b.

**Fase 6 → Fase 7 (pré-requisito do test-runner):**
Antes de lançar o test-runner, exibir ao usuário:

```
⚠️  PRÉ-REQUISITO — Fase 7 (testes E2E)
O dev server precisa estar rodando localmente.

Exemplo Angular: ng serve --configuration=development
Exemplo Next.js: npm run dev

Confirme quando o app estiver no ar:
  [1] ✅ App rodando — iniciar testes
  [2] ❌ Cancelar
```

Aguardar confirmação antes de executar os testes.

## Regras Invioláveis

1. Fase 3 obrigatória — nenhuma linha de código sem aprovação do plano.
2. Fase 8 obrigatória — documentação sempre gerada.
3. Nunca assuma o que não está escrito. Dúvida = perguntar.
4. Testes rodam via bash local — nunca peça ao usuário para testar manualmente.
5. Máximo 2 tentativas de correção automática em caso de falha nos testes.
6. Falha inesperada = informar com contexto completo antes de encerrar.
7. Fase 1 sem MCP = encerrar imediatamente, nunca fabricar dados.
