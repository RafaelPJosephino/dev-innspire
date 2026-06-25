# Dev Innspire — Plugin Claude Code

Fluxo de desenvolvimento automatizado via `/executar_tarefa_clickup`.

## Instalação

Copie os arquivos para a raiz do seu projeto:

```bash
cp CLAUDE.md .
cp -r .claude .
cp -r scripts .
cp playwright.config.ts .
mkdir -p tests/e2e

bash scripts/playwright-install.sh
```

Garanta que o **MCP do ClickUp está ativo** no Claude Code.

## Uso

```
/executar_tarefa_clickup <TASK_ID>
```

## Fluxo completo

```
Fase 1  Lê a task completa (descrição + comentários + subtasks)
   ↓
Fase 2  Analisa se tem informação suficiente
        → se faltar: lista o que falta e pergunta como prosseguir
   ↓
Fase 3  Cria plano de ação detalhado
        → aguarda aprovação do usuário (obrigatório)
   ↓
Fase 4  Desenvolve diretamente no codebase
   ↓
Fase 5  Gera script Playwright (tests/e2e/CU-<ID>.spec.ts)
   ↓
Fase 6  Executa testes LOCALMENTE via bash (zero tokens)
        → diagnóstico em caso de falha, até 2 tentativas de correção
   ↓
Fase 7  Gera Documentação Técnica + Documentação QA
        → exibe para revisão, ajusta se necessário
   ↓
Fase 8  Pergunta se quer publicar no ClickUp
        → publica e muda status para "pronto para review"
```

## Variável de ambiente

```env
BASE_URL=http://localhost:3000   # URL da aplicação para os testes
```

## Estrutura de arquivos

```
.
├── CLAUDE.md                              # Workflow principal do agente
├── playwright.config.ts                   # Configuração dos testes E2E
├── .claude/
│   └── commands/
│       └── executar_tarefa_clickup.md     # Slash command
├── scripts/
│   ├── playwright-install.sh              # Instala Playwright (idempotente)
│   └── run-tests.sh                       # Executa testes por task ID
└── tests/
    └── e2e/                               # Specs gerados pelo agente
        └── CU-<TASK_ID>.spec.ts
```
