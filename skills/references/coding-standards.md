# Coding Standards Reference

Convenções e padrões de desenvolvimento seguidos pelo agente na Fase 4.

---

## Princípios Gerais

1. **Clareza > Esperteza** — código legível por qualquer dev do time é melhor que código "inteligente"
2. **Mínimo necessário** — implementar exatamente o que o plano pede, sem extras não solicitados
3. **Consistência** — seguir os padrões já existentes no codebase antes de criar novos
4. **Reversibilidade** — mudanças fáceis de desfazer em caso de problema

---

## Antes de Escrever Qualquer Código

```bash
# 1. Mapear estrutura do projeto
Glob("**/*.{ts,tsx,js,jsx,py,go}", { ignore: ["node_modules", ".git", "dist"] })

# 2. Entender convenções existentes
Read("<arquivo mais relevante para a task>")

# 3. Verificar padrões de imports, nomenclatura, estrutura
Grep("<padrão a implementar>", { path: "src/" })
```

Nunca escrever código sem antes ler o que já existe. O codebase é a fonte de verdade para convenções.

---

## Verificação de Build

Ao final da Fase 4, executar via `Bash`:

```bash
# TypeScript / Node.js
npm run build
npm run typecheck   # se disponível

# Python
python -m py_compile <arquivo>
# ou
mypy <arquivo>      # se disponível

# Go
go build ./...

# Genérico — checar se existe script de lint
cat package.json | grep -E '"lint"|"typecheck"|"build"'
```

**Nunca avançar para a Fase 5 com erros de build.**

---

## Tratamento de Ambiguidades Técnicas

Se durante o desenvolvimento surgir qualquer decisão técnica **não coberta no plano aprovado**:

1. **Parar imediatamente**
2. Descrever a ambiguidade de forma clara
3. Apresentar as opções com prós e contras
4. Aguardar decisão do usuário

```
⚠️  AMBIGUIDADE TÉCNICA — Decisão necessária

Situação: <descrição do problema>

Opção A: <solução> 
  → Prós: ...
  → Contras: ...

Opção B: <solução>
  → Prós: ...
  → Contras: ...

Qual caminho seguir?
```

**Nunca assumir e implementar sem confirmar.**

---

## Escopo da Implementação

| Permitido | Não permitido |
|---|---|
| Implementar etapas do plano aprovado | Adicionar features não planejadas |
| Corrigir erros de build introduzidos pela própria implementação | Refatorar código não relacionado |
| Adicionar `data-testid` em elementos que serão testados | Mudar arquitetura além do necessário |
| Criar arquivos definidos no plano | Criar arquivos extras "por precaução" |

---

## Progresso por Etapa

A cada etapa do plano concluída, reportar:

```
✓ Etapa 1/4 concluída: <título da etapa>
  Arquivos modificados: <lista>
  Status do build: ✅ OK / ⚠️ Pendente
```

---

## Documentação no Código

- **Comentários:** Apenas quando o "por quê" não é óbvio pelo código
- **JSDoc/docstrings:** Para funções públicas e APIs
- **TODO:** Não deixar TODOs — se algo ficou fora do escopo, registrar como observação na Fase 7

---

## Segurança Básica

- Nunca commitar secrets, API keys ou senhas
- Validar inputs de usuário antes de usar
- Não logar dados sensíveis (senhas, tokens, PII)
- Seguir as práticas de segurança já existentes no codebase
