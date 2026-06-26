# Workflow Phases

Referência completa das 8 fases do dev-agent e como os agentes se encadeiam.

---

## Visão Geral

```
[Fase 1] task-reader              → haiku   — recupera dados do ClickUp
         ↓
[Fase 2] requirements-analyst  → sonnet  — valida completude da task
         ↓ (bloqueia se faltar info)
[Fase 3] software-engineer  → opus    — cria plano técnico detalhado
         ↓ (aguarda aprovação explícita)
[Fase 4] developer        → sonnet  — implementa o código
         ↓
[Fase 5] test-analyst      → sonnet  — gera tests/e2e/CU-<ID>.spec.ts
         ↓
[Fase 6] test-runner      → haiku   — roda testes via bash local
         ↓ (máx. 2 tentativas de correção)
[Fase 7] documentation-analyst → sonnet — gera doc técnica + QA
         ↓ (publica no ClickUp se aprovado)
[Fase 8] Publicação automática      → ClickUp MCP — muda status para pronto para review
```

---

## Fase 1 — Leitura da task

**Modelo:** Haiku (tarefa mecânica de I/O)
**MCP tools:** `get_task`, `get_task_comments`, `get_workspace_hierarchy`, `filter_tasks`

Recupera tudo antes de qualquer análise. Sem contexto completo, as fases seguintes são inúteis.

**Validação obrigatória antes de prosseguir:**
- O MCP foi chamado de verdade (`tool_uses > 0`)
- O título retornado não está vazio
- O ID retornado corresponde ao ID solicitado

Se qualquer validação falhar: encerrar com erro — nunca fabricar dados.

**O que buscar:**
- Título e descrição completa
- Comentários do mais antigo ao mais recente (contexto de decisões)
- Subtasks e seus status atuais
- Campos customizados (critérios de aceite, tipo de task, ambiente)
- Responsável, prioridade e prazo

**Saída esperada:**

```text
📋 TASK LIDA: <título>
   ID: <id> | Status: <status> | Prioridade: <prioridade>
   Responsável: <nome> | Prazo: <data ou "não definido">
   Comentários: <N> | Subtasks: <N>
```

---

## Fase 2 — Análise de completude

**Modelo:** Sonnet (julgamento qualitativo)
**Tools:** Read, Grep

Analista de Requisitos Sênior — não deixa task incompleta passar para desenvolvimento.

**Checklist obrigatório:**
1. Definition of Done claro e específico?
2. Comportamento esperado descrito?
3. Se feature visual: mockup ou descrição de UI/UX?
4. Regras de negócio explícitas?
5. Casos de borda mencionados?
6. Partes do sistema afetadas identificadas?
7. Sem ambiguidade que leve a interpretações diferentes?

**Se FALTAR informação:** Exibe lista de gaps e oferece duas opções ao usuário:
- A) Responder diretamente na conversa
- B) Atualizar a task no ClickUp e rodar novamente

**Nunca prosseguir com task incompleta.**

---

## Fase 3 — Plano de ação

**Modelo:** Opus (raciocínio técnico profundo)
**Tools:** Read, Glob, Grep

Engenheiro de Software Sênior — lê o codebase antes de planejar qualquer coisa.

**Fluxo:**
1. `Glob` para mapear estrutura do projeto
2. `Read` + `Grep` para entender arquivos afetados
3. Cria plano técnico com etapas, arquivos e critérios de conclusão
4. Apresenta plano e **aguarda aprovação explícita**

**Regra inviolável:** Sem aprovação do plano, a Fase 4 não começa.

---

## Fase 4 — Desenvolvimento

**Modelo:** Sonnet (geração de código)
**Tools:** Read, Write, Edit, Bash, Glob, Grep

Desenvolvedor Sênior — implementa exatamente o plano aprovado.

**Fluxo:**
1. Lê arquivos relevantes antes de escrever
2. Implementa etapa por etapa, reportando progresso
3. Verifica build ao final (`Bash`)

**Regras:**
- Nada fora do plano aprovado
- Ambiguidade técnica → parar e perguntar
- Sem refatoração não relacionada à task

---

## Fase 4b — Verificação visual local (obrigatória)

**Responsável:** Orquestrador (não há agente dedicado)
**Quando:** Imediatamente após build OK na Fase 4, antes de qualquer teste

Após o build passar, exibir ao usuário:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Fase 4 concluída — build OK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de seguir para os testes, valide a implementação localmente:

1. Suba o app:
   ng serve --configuration=development   (Angular)
   npm run dev                            (Next.js / outros)

2. Acesse a rota da funcionalidade implementada

3. Verifique manualmente os critérios de aceite:
   [ ] <critério 1 da task>
   [ ] <critério 2 da task>

Confirme para prosseguir:
  [1] ✅ Validado — seguir para Fase 5 (test-planner)
  [2] ⚠️  Encontrei um problema — descreva para corrigir
```

Aguardar resposta explícita. Se [2]: corrigir e repetir esta fase.

**Propósito:** Garantir que falhas nos testes automatizados sejam de lógica — não de ambiente ou renderização.

---

## Fase 5 — Testes Playwright

**Modelo:** Sonnet
**Tools:** Read, Write, Glob, Grep

Analista de Testes Sênior — gera `tests/e2e/CU-<TASK_ID>.spec.ts`.

**Cobertura obrigatória:**
- Happy path de cada critério de aceite
- Casos de borda do plano
- Fluxos de erro (input inválido, falha de rede, estado vazio)
- Regressão em fluxos relacionados

**Padrões:**
- `@playwright/test` com `describe` nomeado pelo critério
- Seletores: `data-testid` > `getByRole` > `getByLabel`
- Screenshots em pontos críticos
- Assertions: `toHaveURL`, `toBeVisible`

---

## Fase 6 — Execução dos testes

**Modelo:** Haiku (execução mecânica)
**Tools:** Bash, Read, Edit

Executa testes localmente via `npx` — nunca pede ao usuário para testar manualmente.

**Pré-requisito obrigatório:** Antes de lançar o test-runner, exibir:

```text
⚠️  PRÉ-REQUISITO — Fase 6 (testes E2E)
O dev server precisa estar rodando localmente.

  Angular:  ng serve --configuration=development
  Next.js:  npm run dev

Confirme quando o app estiver no ar:
  [1] ✅ App rodando — iniciar testes
  [2] ❌ Cancelar
```

Aguardar confirmação explícita antes de executar.

**Comandos de execução:**

```bash
npx playwright install --with-deps chromium
npx playwright test tests/e2e/CU-<TASK_ID>.spec.ts --config=playwright.config.ts
```

**Política de falha:**
- Máximo 2 tentativas de correção automática
- Corrige o código da aplicação — nunca o teste
- Falha por ambiente (app não rodando, porta errada) → informar usuário, não tentar corrigir código
- Após 2 falhas de código: bloqueia com diagnóstico detalhado

---

## Fase 7 — Documentação

**Modelo:** Sonnet
**Tools:** Read, Write, Glob + ClickUp MCP

Analista de Documentação Sênior — gera dois documentos para revisão antes de publicar.

**Documentos gerados:**
1. **Documentação Técnica:** resumo, arquivos alterados, decisões, dependências, pontos de atenção, deploy
2. **Documentação QA:** resultado dos testes, cenários cobertos, borda, não cobertos, ambiente, evidências

Após aprovação do usuário, publica no ClickUp e muda status para `pronto para review`.

---

## Regras Globais

1. **Fase 3 é obrigatória** — zero código sem aprovação do plano
2. **Fase 7 é obrigatória** — documentação sempre gerada
3. **Nunca assuma** — dúvida técnica = parar e perguntar
4. **Testes rodam local** — nunca peça ao usuário para testar
5. **Máximo 2 tentativas** de autocorreção nos testes
6. **Falha inesperada** — informar com contexto completo antes de encerrar

---

## Fase 5b — Plano de testes (test-planner)

**Modelo:** Sonnet (estratégia e planejamento)
**Tools:** Read, Glob, Grep

Test Planner Sênior — define **o que** testar antes de escrever qualquer código de teste.

**Fluxo:**
1. Lê o código implementado na Fase 4
2. Identifica elementos de UI, chamadas de API e interações do usuário
3. Cruza com os critérios de aceite da task
4. Produz plano estruturado com cenários, seletores, dados de teste e escopo
5. **Aguarda aprovação explícita** antes de passar para test-analyst

**Plano deve conter:**
- Cenários: happy path, edge cases, error flows, regressão
- Seletores identificados no código
- Dados de teste válidos, inválidos e de borda
- O que está fora do escopo e por quê

**Regra inviolável:** test-analyst não começa sem plano aprovado.
