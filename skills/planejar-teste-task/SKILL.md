---
description: "FASE 5/9 — Define o plano de testes Playwright com cenários, estratégia de seletores e dados de teste. Requer aprovação explícita antes de gerar o arquivo spec."
---

# Skill — /planejar-teste-task · Fase 5 de 9

Define o que testar antes de escrever qualquer código de teste. Nenhum spec é gerado sem aprovação deste plano.

## Uso

```text
/planejar-teste-task <TASK_ID>
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
| `.tasks/<TASK_ID>/fase3-plano.md` | Fase 3 | Execute `/planejar-task <TASK_ID>` |
| `.tasks/<TASK_ID>/fase4-dev.md` | Fase 4 | Execute `/desenvolver-task <TASK_ID>` |

### 3 · Analisar o código implementado

Leia os arquivos criados/modificados na Fase 4 para identificar:

- Elementos de UI que serão seletores (`data-testid`, roles, labels)
- Chamadas de API e estados possíveis
- Fluxos de usuário e pontos de falha

### 4 · Criar e exibir plano de testes

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 FASE 5/9 — PLANO DE TESTES
   Task: <título> | Arquivo: tests/e2e/CU-<TASK_ID>.spec.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CENÁRIOS PLANEJADOS

  Happy Path:
    1. <descrição do cenário> — <o que valida>
    2. <descrição do cenário> — <o que valida>

  Casos de Borda:
    3. <descrição> — <o que valida>

  Fluxos de Erro:
    4. <descrição> — <o que valida>

  Regressão:
    5. <fluxo existente que pode ter sido afetado>

ESTRATÉGIA DE SELETORES
  Primário:  data-testid
  Fallback:  getByRole / getByLabel

DADOS DE TESTE
  • <usuário, estado inicial, fixtures necessárias>

FORA DE ESCOPO
  • <cenário> — <motivo: escopo / mock complexo / outro>

Total: <N> cenários
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O plano de testes está aprovado?

  [1] ✅ Aprovar — gerar o arquivo de testes
  [2] ✏️  Ajustar — tenho alterações a solicitar
  [3] ❌ Cancelar

Digite 1, 2 ou 3:
```

**Aguarde resposta explícita do usuário.**

- **[2]**: pergunte o que mudar, refaça o plano, retorne para validação.
- **[3]**: encerre.

### 5 · Se aprovado [1]

Salve `.tasks/<TASK_ID>/fase5-plano-teste.md` com o plano completo.

Exiba:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FASE 5/9 CONCLUÍDA — Plano de testes aprovado

   Cenários planejados: <N>
   Contexto salvo em: .tasks/<TASK_ID>/fase5-plano-teste.md

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ Próxima fase: /criar-testes <TASK_ID>
```
