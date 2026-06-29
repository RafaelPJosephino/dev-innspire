---
description: "FASE 2/9 — Analisa se a task tem informação suficiente para desenvolvimento seguro. Bloqueia se faltar critério de aceite, regras de negócio ou clareza. Requer fase1-task.md."
---

# Skill — /analisar-task · Fase 2 de 9

Valida a completude da task antes de qualquer planejamento ou código.

## Uso

```text
/analisar-task <TASK_ID>
```

---

## Execução

### 1 · Validar argumento

O argumento `$ARGUMENTS` contém o TASK_ID.
Se não foi fornecido, solicite ao usuário antes de prosseguir.

### 2 · Carregar contexto

Leia `.tasks/<TASK_ID>/fase1-task.md`.

Se o arquivo não existir:

```text
⚠️  CONTEXTO NÃO ENCONTRADO
   A Fase 1 ainda não foi executada para esta task.
   Execute primeiro: /ler-task <TASK_ID>
```

Encerre.

### 3 · Analisar completude

Verifique cada critério abaixo e registre o resultado (✅ / ❌):

| # | Critério |
| - | -------- |
| 1 | Critério de aceite (Definition of Done) está claro e específico? |
| 2 | Comportamento esperado está descrito — o que deve acontecer, não só o que fazer? |
| 3 | Se feature visual: tem mockup, wireframe ou descrição detalhada de UI/UX? |
| 4 | Regras de negócio estão explícitas — validações, permissões, limites? |
| 5 | Casos de borda relevantes foram mencionados? |
| 6 | Está claro quais partes do sistema são afetadas? |
| 7 | Não há ambiguidade que possa levar a interpretações diferentes? |

### 4a · Se FALTAR informação

Não avance. Exiba:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  FASE 2/9 — TASK INCOMPLETA

   Para desenvolver com segurança, os seguintes pontos
   precisam ser esclarecidos ou adicionados à descrição:

   1. <ponto específico — direto e preciso>
   2. <ponto específico>
   ...

   Como deseja prosseguir?
     [A] Responder aqui agora
     [B] Atualizar a task no ClickUp e rodar novamente
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- Se **A**: incorpore as respostas, salve em `fase2-analise.md` e continue.
- Se **B**: encerre e aguarde novo comando.

### 4b · Se PASSAR na análise

Salve `.tasks/<TASK_ID>/fase2-analise.md` com:

- Resultado de cada critério (✅/❌)
- Pontos confirmados
- Observações relevantes para as fases seguintes

Exiba:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FASE 2/9 CONCLUÍDA — Task aprovada

   Critérios verificados: 7/7
   Contexto salvo em: .tasks/<TASK_ID>/fase2-analise.md

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ Próxima fase: /planejar-task <TASK_ID>
```
