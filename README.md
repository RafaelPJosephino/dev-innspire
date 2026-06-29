# Dev Innspire — Plugin Claude Code

Workflow de desenvolvimento automatizado para tasks do ClickUp, dividido em 10 skills independentes.

---

## Começando do zero em um projeto novo

Siga estes 3 passos uma única vez por projeto.

### Passo 1 — Instalar o plugin no Claude Code

Abra o Claude Code e instale o plugin via marketplace:

```
/plugin install dev-innspire
```

Ou, se estiver usando localmente:

```bash
claude --plugin-dir /caminho/para/dev-innspire
```

### Passo 2 — Conectar o MCP do ClickUp

No Claude Code, acesse:

```
Customize → Connectors → ClickUp → Conectar
```

Faça login com sua conta do ClickUp. O MCP é necessário para ler e escrever tasks.

### Passo 3 — Configurar o projeto

Na raiz do seu projeto, rode:

```
/dev-innspire:configurar-projeto
```

Isso cria automaticamente:

- `.tasks/` — pasta de contexto persistido por task
- `tests/e2e/` — pasta onde os specs Playwright serão gerados
- `playwright.config.ts` — configuração dos testes (se não existir)
- Instala `@playwright/test` e o browser Chromium

Pronto. O projeto está configurado para usar o workflow.

---

## Usando o workflow

### Fluxo completo (recomendado)

```
/dev-innspire:executar-tarefa-clickup <TASK_ID>
```

Orquestra todos os 9 skills em sequência, do zero ao "pronto para review".

### Skills individuais

Cada fase também pode ser invocada separadamente. O contexto é salvo em `.tasks/<TASK_ID>/` entre fases.

| Skill | Fase | O que faz |
| --- | --- | --- |
| `/dev-innspire:configurar-projeto` | setup | Cria estrutura, instala Playwright, valida MCP |
| `/dev-innspire:ler-task <TASK_ID>` | 1/9 | Lê título, descrição, comentários, subtasks e campos customizados via MCP |
| `/dev-innspire:analisar-task <TASK_ID>` | 2/9 | Valida se a task tem informação suficiente — bloqueia se faltar |
| `/dev-innspire:planejar-task <TASK_ID>` | 3/9 | Cria plano técnico detalhado — requer aprovação antes de codar |
| `/dev-innspire:desenvolver-task <TASK_ID>` | 4/9 | Implementa o plano aprovado etapa por etapa e verifica o build |
| `/dev-innspire:planejar-teste-task <TASK_ID>` | 5/9 | Define cenários de teste — requer aprovação antes de gerar o spec |
| `/dev-innspire:criar-testes <TASK_ID>` | 6/9 | Gera `tests/e2e/CU-TASK_ID.spec.ts` com os cenários aprovados |
| `/dev-innspire:executar-testes <TASK_ID>` | 7/9 | Roda os testes localmente (máx. 2 tentativas de correção automática) |
| `/dev-innspire:documentar <TASK_ID>` | 8/9 | Gera documentação técnica e de QA — requer aprovação antes de publicar |
| `/dev-innspire:publicar-clickup <TASK_ID>` | 9/9 | Publica no ClickUp e move a task para "pronto para review" |

---

## Fluxo detalhado

```
/dev-innspire:configurar-projeto      (uma vez por projeto)
         ↓
/dev-innspire:ler-task              → .tasks/TASK_ID/fase1-task.md
         ↓
/dev-innspire:analisar-task         → .tasks/TASK_ID/fase2-analise.md
         ↓                            bloqueia se task incompleta
/dev-innspire:planejar-task         → .tasks/TASK_ID/fase3-plano.md
         ↓                            aguarda aprovação obrigatória
/dev-innspire:desenvolver-task      → .tasks/TASK_ID/fase4-dev.md
         ↓                            verifica build ao final
/dev-innspire:planejar-teste-task   → .tasks/TASK_ID/fase5-plano-teste.md
         ↓                            aguarda aprovação obrigatória
/dev-innspire:criar-testes          → tests/e2e/CU-TASK_ID.spec.ts
         ↓
/dev-innspire:executar-testes       → .tasks/TASK_ID/fase7-resultado.md
         ↓                            máx. 2 tentativas de correção automática
/dev-innspire:documentar            → .tasks/TASK_ID/fase8-docs.md
         ↓                            aguarda aprovação obrigatória
/dev-innspire:publicar-clickup      → comenta no ClickUp + "pronto para review"
```

---

## Variável de ambiente

```env
BASE_URL=http://localhost:3000   # URL da aplicação para os testes Playwright
```

---

## Estrutura do plugin

```
dev-innspire/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── configurar-projeto/SKILL.md
│   ├── executar-tarefa-clickup/SKILL.md
│   ├── ler-task/SKILL.md
│   ├── analisar-task/SKILL.md
│   ├── planejar-task/SKILL.md
│   ├── desenvolver-task/SKILL.md
│   ├── planejar-teste-task/SKILL.md
│   ├── criar-testes/SKILL.md
│   ├── executar-testes/SKILL.md
│   ├── documentar/SKILL.md
│   ├── publicar-clickup/SKILL.md
│   └── references/
├── agents/
├── scripts/
│   ├── playwright-install.sh
│   └── run-tests.sh
├── playwright.config.ts
└── CLAUDE.md
```
