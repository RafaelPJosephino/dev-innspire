---
description: "FASE 6/9 — Gera o arquivo tests/e2e/CU-TASK_ID.spec.ts implementando exatamente os cenários do plano aprovado na fase 5. Requer fase5-plano-teste.md."
---

# Skill — /criar-testes · Fase 6 de 9

Gera o arquivo de testes Playwright implementando todos os cenários do plano aprovado.

## Uso

```text
/criar-testes <TASK_ID>
```

---

## Execução

### 1 · Validar argumento

O argumento `$ARGUMENTS` contém o TASK_ID.
Se não foi fornecido, solicite ao usuário antes de prosseguir.

### 2 · Carregar contexto

Leia os arquivos em ordem:

| Arquivo | Fase de origem | Se ausente |
| ------- | -------------- | ---------- |
| `.tasks/<TASK_ID>/fase1-task.md` | Fase 1 | Execute `/ler-task <TASK_ID>` |
| `.tasks/<TASK_ID>/fase4-dev.md` | Fase 4 | Execute `/desenvolver-task <TASK_ID>` |
| `.tasks/<TASK_ID>/fase5-plano-teste.md` | Fase 5 | Execute `/planejar-teste-task <TASK_ID>` |

### 3 · Gerar o arquivo de testes

Crie `tests/e2e/CU-<TASK_ID>.spec.ts` implementando **exatamente** os cenários do plano aprovado.

**Padrões obrigatórios:**

| Padrão | Regra |
| ------ | ----- |
| Import | `import { test, expect } from '@playwright/test'` |
| Agrupamento | `describe` nomeado com o critério de aceite que cobre |
| Seletores | `data-testid` como primário; `getByRole` / `getByLabel` como fallback |
| Screenshots | `await page.screenshot({ path: '<nome-descritivo>.png' })` nos pontos críticos |
| URL | `await expect(page).toHaveURL(...)` |
| Visibilidade | `await expect(locator).toBeVisible()` |
| Cobertura | Cada cenário do plano deve ter um `test()` correspondente |

### 4 · Persistir contexto

Salve `.tasks/<TASK_ID>/fase6-testes.md` com:

- Caminho do arquivo gerado
- Lista de cenários implementados

### 5 · Exibir resumo

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FASE 6/9 CONCLUÍDA — Arquivo de testes gerado

   Arquivo: tests/e2e/CU-<TASK_ID>.spec.ts
   Cenários implementados: <N>
     ✓ <nome do cenário>
     ✓ <nome do cenário>
     ...

   Contexto salvo em: .tasks/<TASK_ID>/fase6-testes.md

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ Próxima fase: /executar-testes <TASK_ID>
```
