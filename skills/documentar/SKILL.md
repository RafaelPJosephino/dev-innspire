---
description: "FASE 8/9 — Gera documentação técnica e de QA com base no desenvolvimento e testes. Exibe para revisão e aguarda aprovação antes de avançar para publicação."
---

# Skill — /documentar · Fase 8 de 9

Gera e valida a documentação técnica e de QA. Obrigatório mesmo que não seja publicada.

## Uso

```
/documentar <TASK_ID>
```

---

## Execução

### 1 · Validar argumento

O argumento `$ARGUMENTS` contém o TASK_ID.
Se não foi fornecido, solicite ao usuário antes de prosseguir.

### 2 · Carregar contexto

Leia os arquivos em ordem:

| Arquivo | Fase de origem | Se ausente |
|---------|---------------|-----------|
| `.tasks/<TASK_ID>/fase1-task.md` | Fase 1 | Execute `/ler-task <TASK_ID>` |
| `.tasks/<TASK_ID>/fase3-plano.md` | Fase 3 | Execute `/planejar-task <TASK_ID>` |
| `.tasks/<TASK_ID>/fase4-dev.md` | Fase 4 | Execute `/desenvolver-task <TASK_ID>` |
| `.tasks/<TASK_ID>/fase5-plano-teste.md` | Fase 5 | Execute `/planejar-teste-task <TASK_ID>` |
| `.tasks/<TASK_ID>/fase7-resultado.md` | Fase 7 | Execute `/executar-testes <TASK_ID>` |

### 3 · Gerar e exibir os documentos

#### 📄 Documentação Técnica

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTAÇÃO TÉCNICA
Task: <ID> — <título> | Data: <data>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMO
<O que foi implementado e por quê — 3 a 5 linhas>

ARQUIVOS ALTERADOS
  • <caminho/arquivo> — CRIADO
    <o que faz e por que foi criado>
  • <caminho/arquivo> — MODIFICADO
    <o que mudou e por que>

DECISÕES TÉCNICAS
  • <decisão tomada e alternativas consideradas>

DEPENDÊNCIAS / CONFIGURAÇÕES NOVAS
  • <biblioteca, env var, migration, etc. — ou "nenhuma">

PONTOS DE ATENÇÃO PARA CODE REVIEW
  • <o que o revisor deve olhar com atenção>

INSTRUÇÕES DE DEPLOY
  • <passos adicionais — migration, config, variáveis — ou "nenhum">
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 🧪 Documentação QA

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTAÇÃO QA
Task: <ID> — <título> | Arquivo: tests/e2e/CU-<ID>.spec.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULTADO DOS TESTES
  Status:  ✅ Aprovado / ❌ Falhou
  Total:   X testes | Passou: X | Falhou: X | Tempo: Xs

CENÁRIOS COBERTOS
  ✅ <nome do cenário> — <o que valida>
  ✅ <nome do cenário>
  ...

CASOS DE BORDA TESTADOS
  • <caso de borda> — <como foi testado>

CENÁRIOS NÃO COBERTOS
  • <cenário> — <motivo: fora de escopo / mock complexo / etc.>

AMBIENTE DE TESTE
  Browser:    Chromium (headless)
  Playwright: <versão>

EVIDÊNCIAS
  Screenshots: <lista de arquivos gerados, se houver>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4 · Aguardar aprovação

```
A documentação está correta?

  [1] ✅ Aprovada
  [2] ✏️  Ajustar — tenho correções

Digite 1 ou 2:
```

Se **[2]**: pergunte o que ajustar, corrija e exiba novamente.

### 5 · Se aprovada [1]

Salve `.tasks/<TASK_ID>/fase8-docs.md` com os dois documentos completos.

Exiba:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ FASE 8/9 CONCLUÍDA — Documentação aprovada

   Contexto salvo em: .tasks/<TASK_ID>/fase8-docs.md

📊 Tokens — entrada: ~X | saída: ~X
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ Próxima fase: /publicar-clickup <TASK_ID>
```
