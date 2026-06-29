---
description: "FASE 4/9 — Implementa o plano aprovado na fase 3, etapa por etapa. Verifica build ao final. Não implementa nada fora do plano. Requer fase3-plano.md."
---

# Skill — /desenvolver-task · Fase 4 de 9

Implementa o código conforme o plano aprovado. Nada além do que está no plano.

## Uso

```text
/desenvolver-task <TASK_ID>
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

### 3 · Implementar o plano

Leia os arquivos citados no plano antes de escrever qualquer código.

Execute cada etapa na ordem definida. A cada etapa concluída, informe:

```text
  ✓ Etapa X/N — <título da etapa>
```

**Regras invioláveis:**

- Implementar apenas o que está no plano aprovado
- Ambiguidade técnica não coberta no plano → parar e perguntar antes de assumir
- Sem refatorações ou melhorias não relacionadas à task
- Priorizar clareza e manutenibilidade

### 4 · Verificar build

Ao concluir todas as etapas, execute o build e verifique erros.
Corrija qualquer erro de compilação antes de avançar.

### 5 · Persistir contexto

Salve `.tasks/<TASK_ID>/fase4-dev.md` com:

- Lista de arquivos criados/modificados
- Resumo de cada mudança
- Resultado do build (✅ sem erros / ❌ erros encontrados e corrigidos)

### 6 · Exibir resumo

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FASE 4/9 CONCLUÍDA — Desenvolvimento finalizado

   Etapas concluídas: N/N
   Build: ✅ sem erros

   Arquivos alterados:
     • <caminho/arquivo> — CRIADO
     • <caminho/arquivo> — MODIFICADO

   Contexto salvo em: .tasks/<TASK_ID>/fase4-dev.md

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ Próxima fase: /planejar-teste-task <TASK_ID>
```
