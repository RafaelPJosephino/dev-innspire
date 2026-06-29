# Reference — planejar-task (Fase 3/9)

Referência para criação do plano técnico de desenvolvimento.

---

## Sequência de exploração do codebase

Antes de escrever qualquer etapa do plano, executar nesta ordem:

```bash
# 1. Mapear estrutura geral
Glob("**/*.{ts,tsx,js,jsx,py,go,cs}", { ignore: ["node_modules", ".git", "dist", "build"] })

# 2. Identificar arquivos diretamente afetados pela task
Grep("<termo relacionado à feature>", { path: "src/" })

# 3. Ler arquivos-chave para entender convenções
Read("<arquivo mais relevante para a task>")
```

O codebase é a fonte de verdade para convenções, nomenclatura e padrões. Nunca planejar sem ler antes.

---

## Estrutura de uma etapa bem definida

Uma etapa genérica **não** é aceitável. Cada etapa deve ter:

| Campo | Ruim | Bom |
| ----- | ---- | --- |
| **O que fazer** | "Criar componente" | "Criar `TaskCardComponent` em `src/app/tasks/` com inputs `title`, `status`, `assignee`" |
| **Arquivos** | "Alguns arquivos" | `src/app/tasks/task-card/task-card.component.ts`, `.html`, `.scss` |
| **Conclusão** | "Quando estiver pronto" | "Componente renderiza sem erro de build e exibe os três campos" |

---

## Identificação de riscos

Verificar ativamente:

- **Dependências externas** — biblioteca nova, endpoint de API que pode não existir
- **Conflito com código existente** — naming collision, override de comportamento global
- **Migração de dados** — mudança de schema, formato de armazenamento
- **Permissões/autenticação** — feature com controle de acesso não mapeado
- **Performance** — queries sem índice, loops desnecessários em listas grandes

---

## O que salvar em fase3-plano.md

```text
## Contexto
<resumo do problema — 2 a 3 linhas>

## Etapas

### 1. <título>
- O que fazer: <descrição técnica específica>
- Arquivos: <lista>
- Critério de conclusão: <como verificar>

### 2. <título>
...

## Riscos
- <risco>: <como será tratado>

## Dúvidas em aberto
- <dúvida> (ou "nenhuma")

## Estimativa
~Xh
```

---

## Tratamento de ambiguidades durante o planejamento

Se surgir decisão técnica não coberta nos requisitos:

1. Parar imediatamente.
2. Descrever a ambiguidade de forma clara.
3. Apresentar opções com prós e contras.
4. Aguardar decisão do usuário — nunca assumir.
