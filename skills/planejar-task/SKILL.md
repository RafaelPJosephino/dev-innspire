---
description: "FASE 3/9 — Cria o plano técnico detalhado explorando o codebase. Define etapas, arquivos afetados, riscos e estimativa. Requer aprovação explícita antes de qualquer código."
---

# Skill — /planejar-task · Fase 3 de 9

Produz o plano técnico de desenvolvimento. Nenhuma linha de código é escrita sem aprovação deste plano.

## Uso

```text
/planejar-task <TASK_ID>
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
| `.tasks/<TASK_ID>/fase2-analise.md` | Fase 2 | Execute `/analisar-task <TASK_ID>` |

### 3 · Explorar o codebase

Antes de planejar, leia os arquivos relevantes do projeto:

- Estrutura de pastas (`Glob`)
- Arquivos que serão afetados (`Read`, `Grep`)
- Padrões e convenções já adotados

### 4 · Criar e exibir plano técnico

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 FASE 3/9 — PLANO DE AÇÃO
   Task: <título>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXTO
<Resumo do problema em 2-3 linhas — o que precisa ser feito e por quê>

ETAPAS DE DESENVOLVIMENTO

  1. <título da etapa>
     O que fazer:  <descrição técnica específica — nunca genérica>
     Arquivos:     <lista de arquivos a criar ou modificar>
     Conclusão:    <como verificar que está pronto>

  2. <título>
     ...

RISCOS IDENTIFICADOS
  • <risco identificado e como será tratado>

DÚVIDAS EM ABERTO
  • <dúvida> (se nenhuma: "nenhuma")

Estimativa: ~Xh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O plano está aprovado para execução?

  [1] ✅ Aprovar — salvar e iniciar desenvolvimento
  [2] ✏️  Ajustar — tenho alterações a solicitar
  [3] ❌ Cancelar

Digite 1, 2 ou 3:
```

**Aguarde resposta explícita do usuário.**

- **[2]**: pergunte o que mudar, refaça o plano, retorne para validação.
- **[3]**: informe cancelamento e encerre.

### 5 · Se aprovado [1]

Salve o plano completo em `.tasks/<TASK_ID>/fase3-plano.md`.

Exiba:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FASE 3/9 CONCLUÍDA — Plano aprovado

   Etapas:     <N>
   Estimativa: ~Xh
   Contexto salvo em: .tasks/<TASK_ID>/fase3-plano.md

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ Próxima fase: /desenvolver-task <TASK_ID>
```
