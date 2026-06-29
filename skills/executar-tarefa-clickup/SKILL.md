---
description: Executa o workflow completo de desenvolvimento para uma task do ClickUp — lê a task, valida requisitos, planeja, desenvolve, planeja testes, gera testes, executa, documenta e publica. Orquestra os 9 skills de fase em sequência, com contexto persistido em .tasks/TASK_ID/.
---

# Skill — /executar-tarefa-clickup

Orquestra os 9 skills de desenvolvimento em sequência para entregar uma task do ClickUp completa — do zero ao "pronto para review".

## Uso

```text
/executar-tarefa-clickup <TASK_ID>
```

---

## Pré-requisitos

Antes de invocar qualquer skill, execute no terminal:

```bash
mkdir -p .tasks/<TASK_ID>
```

Crie `.tasks/.gitignore` (se não existir):

```text
*
!.gitignore
!_project-context.md
```

Crie `.tasks/<TASK_ID>/.gitignore`:

```text
*
```

---

## Fluxo de execução

Execute os skills abaixo **em ordem**, um por vez. Cada skill salva seu contexto em `.tasks/<TASK_ID>/` para o próximo consumir.

```text
/ler-task              → fase1-task.md
         ↓
/analisar-task         → fase2-analise.md        (bloqueia se task incompleta)
         ↓
/planejar-task         → fase3-plano.md           (aguarda aprovação explícita)
         ↓
/desenvolver-task      → fase4-dev.md             (verifica build ao final)
         ↓
/planejar-teste-task   → fase5-plano-teste.md     (aguarda aprovação explícita)
         ↓
/criar-testes          → fase6-testes.md
         ↓
/executar-testes       → fase7-resultado.md       (máx. 2 tentativas de correção)
         ↓
/documentar            → fase8-docs.md            (aguarda aprovação explícita)
         ↓
/publicar-clickup      → comenta no ClickUp + status "pronto para review"
```

---

## Regras invioláveis

1. **`/planejar-task` é obrigatório** — nenhuma linha de código sem aprovação do plano.
2. **`/planejar-teste-task` é obrigatório** — nenhum teste gerado sem plano aprovado.
3. **`/documentar` é obrigatório** — documentação sempre gerada, mesmo que não publicada.
4. **Nunca avance** sem confirmação explícita do usuário onde indicado.
5. **Nunca assuma** o que não está escrito — dúvida técnica = parar e perguntar.
6. **Testes rodam via bash local** — nunca peça ao usuário para testar manualmente.
7. **Máximo 2 tentativas** de correção automática em caso de falha nos testes.
8. **Falha inesperada** = informar com contexto completo antes de encerrar.
9. **`/ler-task` sem MCP** = encerrar imediatamente, nunca fabricar dados da task.

---

## Referências

Consulte os arquivos de referência conforme necessário durante cada fase:

- [`references/workflow-phases.md`](references/workflow-phases.md) — detalhes de cada fase e regras globais
- [`references/clickup-mcp-reference.md`](references/clickup-mcp-reference.md) — tools do ClickUp MCP
- [`references/playwright-reference.md`](references/playwright-reference.md) — padrões de teste e assertions
- [`references/coding-standards.md`](references/coding-standards.md) — convenções de código e build
