# Reference — desenvolver-task (Fase 4/9)

Referência de padrões de implementação e verificação de build.

---

## Antes de escrever qualquer código

```bash
# 1. Ler o plano aprovado em fase3-plano.md
# 2. Ler cada arquivo que será modificado
Read("<arquivo listado no plano>")

# 3. Verificar padrões de nomenclatura existentes
Grep("<padrão a implementar>", { path: "src/" })
```

**Nunca escrever código sem ler o arquivo que será modificado.**

---

## Escopo permitido vs. proibido

| Permitido | Proibido |
| --------- | -------- |
| Implementar exatamente as etapas do plano | Adicionar features não planejadas |
| Corrigir erros de build causados pela própria implementação | Refatorar código não relacionado à task |
| Adicionar `data-testid` em elementos que serão testados | Mudar arquitetura além do necessário |
| Criar arquivos definidos no plano | Criar arquivos extras "por precaução" |

---

## Formato de progresso por etapa

A cada etapa concluída, reportar:

```text
✓ Etapa 1/4 — <título da etapa>
  Arquivos: <lista dos modificados>
  Build: ✅ OK
```

---

## Verificação de build por stack

```bash
# TypeScript / Node.js
npm run build
npm run typecheck   # se disponível no package.json

# Angular
ng build --configuration=development

# Python
python -m py_compile <arquivo>

# Go
go build ./...

# Verificar scripts disponíveis
cat package.json | grep -E '"lint"|"typecheck"|"build"'
```

**Nunca avançar para a Fase 5 com erros de build.**

---

## Tratamento de ambiguidades técnicas

Se surgir decisão técnica não coberta no plano:

```text
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

**Parar e aguardar resposta — nunca assumir e implementar.**

---

## Padrões de qualidade de código

- **Comentários:** apenas quando o "por quê" não é óbvio pelo código
- **Nomenclatura:** seguir convenções já existentes no codebase
- **Segurança:** nunca commitar secrets, API keys ou senhas; não logar dados sensíveis
- **TODO:** não deixar TODOs — registrar como observação na Fase 8 se necessário

---

## O que salvar em fase4-dev.md

```text
## Arquivos alterados
- `<caminho/arquivo>` — CRIADO: <o que faz>
- `<caminho/arquivo>` — MODIFICADO: <o que mudou>

## Resumo de mudanças por etapa
### Etapa 1: <título>
<o que foi feito>

## Resultado do build
✅ Build passou sem erros
(ou ❌ Erros encontrados e corrigidos: <descrição>)
```
