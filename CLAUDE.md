# Dev Innspire — Workflow `/executar_tarefa_clickup`

Quando o comando `/executar_tarefa_clickup <TASK_ID>` for executado, siga **exatamente** este fluxo.
Nunca pule uma fase. Nunca avance sem confirmação explícita do usuário onde indicado.

---

## ▶ FASE 1 — Leitura completa da task

Use o MCP do ClickUp para buscar **tudo** da task:

- Título e descrição completa
- Todos os comentários (do mais antigo ao mais recente)
- Subtasks existentes e seus status
- Campos customizados preenchidos
- Anexos referenciados
- Responsável, prioridade, prazo

Exiba um resumo do que foi lido:

```
📋 TASK LIDA: <título>
   ID: <id>
   Status: <status>
   Comentários: <N>
   Subtasks: <N>
```

---

## ▶ FASE 2 — Análise de completude

Analise criteriosamente se a task tem tudo que é necessário para desenvolver.
Verifique cada ponto abaixo:

**Critérios obrigatórios:**
- [ ] Critério de aceite (Definition of Done) está claro e específico?
- [ ] Comportamento esperado está descrito (o que deve acontecer, não só o que fazer)?
- [ ] Se for feature visual: tem mockup, wireframe ou descrição detalhada de UI/UX?
- [ ] Regras de negócio estão explícitas (validações, permissões, limites)?
- [ ] Casos de borda relevantes foram mencionados?
- [ ] Está claro quais partes do sistema são afetadas?
- [ ] Não há ambiguidade que possa levar a interpretações diferentes?

### Se FALTAR informação:

Não avance. Exiba para o usuário:

```
⚠️  TASK INCOMPLETA — Preciso de mais informações antes de continuar.

Para desenvolver esta task com segurança, preciso que os seguintes
pontos sejam esclarecidos ou adicionados à descrição:

1. [ponto específico que falta — seja direto e preciso]
2. [ponto específico que falta]
...

Sugestão: adicione esses pontos na descrição da task no ClickUp
e rode o comando novamente, ou responda aqui diretamente.

O que prefere fazer?
  A) Responder aqui agora
  B) Vou atualizar a task no ClickUp e rodo novamente
```

Aguarde a resposta do usuário. Se responder aqui, incorpore as respostas e continue.
Se escolher B, encerre e aguarde novo comando.

### Se PASSAR na análise:

```
✅ Task com informação suficiente. Seguindo para o plano de ação.
```

---

## ▶ FASE 3 — Plano de ação

Crie um plano técnico detalhado. Exiba no terminal:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 PLANO DE AÇÃO — <título da task>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contexto: <resumo do problema em 2-3 linhas>

ETAPAS DE DESENVOLVIMENTO:

1. <título da etapa>
   O que fazer: <descrição técnica específica — não genérica>
   Arquivos: <lista de arquivos a criar ou modificar>
   Critério de conclusão: <como saber que está pronto>

2. <título>
   ...

RISCOS IDENTIFICADOS:
- <risco e como será tratado>

DÚVIDAS EM ABERTO:
- <dúvida> (se não houver, escrever "nenhuma")

Estimativa: ~Xh
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Em seguida, pergunte:

```
O plano está aprovado para execução?

  [1] ✅ Aprovar — iniciar desenvolvimento
  [2] ✏️  Ajustar — tenho alterações a pedir
  [3] ❌ Cancelar

Digite 1, 2 ou 3:
```

**Aguarde resposta explícita.**

- Se **1**: avança para Fase 4.
- Se **2**: pergunte o que deve mudar, refaça o plano, volte para validação.
- Se **3**: informe que a task foi cancelada e encerre.

---

## ▶ FASE 4 — Desenvolvimento

1. Antes de escrever qualquer código, leia os arquivos relevantes do projeto.
2. Implemente cada etapa do plano aprovado, em ordem.
3. A cada etapa concluída, informe o progresso:
   ```
   ✓ Etapa 1/4 concluída: <título>
   ```
4. Ao finalizar todas as etapas:
   - Verifique se o projeto compila/builda sem erros.
   - Corrija qualquer erro de build antes de avançar.

**Regras:**
- Não implemente nada fora do plano aprovado.
- Se surgir ambiguidade técnica não coberta no plano, pare e pergunte antes de assumir.
- Priorize clareza e manutenibilidade do código.

---

## ▶ FASE 5 — Criação dos testes Playwright

Com base nos critérios de aceite e no código desenvolvido, gere o arquivo de testes:

**Caminho:** `tests/e2e/CU-<TASK_ID>.spec.ts`

**O arquivo deve cobrir:**
- Happy path de cada critério de aceite
- Casos de borda identificados no plano
- Fluxos de erro (campos inválidos, falhas de rede, estados vazios)
- Regressão: fluxos existentes relacionados não devem quebrar

**Padrões obrigatórios:**
- Use `@playwright/test`
- `describe` nomeado com o critério de aceite que cobre
- Seletores: preferência por `data-testid`, fallback para `getByRole` / `getByLabel`
- Screenshots em pontos críticos: `await page.screenshot({ path: 'nome-descritivo.png' })`
- `await expect(page).toHaveURL(...)` e `await expect(locator).toBeVisible()` para assertions claras

Informe ao usuário:
```
🧪 Script de testes gerado: tests/e2e/CU-<TASK_ID>.spec.ts
   Cobertura: <N> cenários
   Iniciando execução local...
```

---

## ▶ FASE 6 — Execução dos testes (local)

Execute os testes localmente via script:

```bash
bash scripts/playwright-install.sh   # só instala se ainda não instalado
bash scripts/run-tests.sh CU-<TASK_ID>
```

### Se os testes PASSAREM:

```
✅ TESTES APROVADOS
   Passou: X testes
   Falhou: 0
   Tempo: Xs
```

Avance para a Fase 7.

### Se os testes FALHAREM:

Exiba o diagnóstico:

```
❌ FALHA NOS TESTES — Tentativa <N>/2

Testes que falharam:
  • <nome do teste>
    Erro: <mensagem de erro>
    Linha: <arquivo:linha>

Diagnóstico: <explicação do que causou a falha>
Correção aplicada: <o que foi ajustado no código>
```

Tente corrigir o código da aplicação (não o teste) e reexecute.
Máximo de 2 tentativas.

Se após 2 tentativas ainda falhar:

```
🚨 BLOQUEIO — Testes falharam após 2 tentativas.

Erros que precisam de revisão humana:
  • <teste> — <erro detalhado>

Recomendação: <o que o desenvolvedor deve verificar>

O fluxo foi pausado. Corrija o problema e rode novamente.
```

Encerre sem avançar para documentação.

---

## ▶ FASE 7 — Documentação

Gere **dois documentos** e exiba no terminal para revisão:

---

### 📄 DOCUMENTAÇÃO TÉCNICA

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTAÇÃO TÉCNICA — <título da task>
Task: <ID> | Data: <data>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESUMO
<O que foi implementado e por quê — 3 a 5 linhas>

ARQUIVOS ALTERADOS
  • <caminho/arquivo.ts> — CRIADO
    <o que faz e por que foi criado>
  • <caminho/arquivo.ts> — MODIFICADO
    <o que mudou e por que>

DECISÕES TÉCNICAS
  • <decisão tomada e alternativas consideradas>

DEPENDÊNCIAS / CONFIGURAÇÕES NOVAS
  • <se houver — biblioteca, env var, migration, etc.>

PONTOS DE ATENÇÃO PARA CODE REVIEW
  • <o que o revisor deve olhar com atenção>

INSTRUÇÕES DE DEPLOY
  • <se houver passos adicionais — migration, config, etc.>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 🧪 DOCUMENTAÇÃO QA

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DOCUMENTAÇÃO QA — <título da task>
Task: <ID> | Arquivo: tests/e2e/CU-<ID>.spec.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RESULTADO DOS TESTES
  Status: ✅ Aprovado / ❌ Falhou
  Total: X testes | Passou: X | Falhou: X | Tempo: Xs

CENÁRIOS COBERTOS
  ✅ <nome do cenário> — <o que valida>
  ✅ <nome do cenário>
  ...

CASOS DE BORDA TESTADOS
  • <caso de borda> — como foi testado

CENÁRIOS NÃO COBERTOS (e por quê)
  • <cenário> — <motivo: fora de escopo / requer mock complexo / etc.>

AMBIENTE DE TESTE
  Base URL: <url>
  Browser: Chromium (headless)
  Playwright: <versão>

EVIDÊNCIAS
  Screenshots: <lista de arquivos gerados, se houver>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

Após exibir os dois documentos, pergunte:

```
A documentação está correta?

  [1] ✅ Aprovada
  [2] ✏️  Ajustar — tenho correções

Digite 1 ou 2:
```

Se **2**: pergunte o que ajustar, corrija e exiba novamente.

---

## ▶ FASE 8 — Publicar no ClickUp

Após a documentação ser aprovada:

```
Deseja anexar a documentação à task no ClickUp?

  [1] ✅ Sim — publicar ambos os documentos como comentário
  [2] 📋 Só a técnica
  [3] 🧪 Só a de QA
  [4] ❌ Não publicar

Digite 1, 2, 3 ou 4:
```

Se escolher 1, 2 ou 3:
- Use o MCP do ClickUp para postar o(s) documento(s) como comentário na task.
- Mude o status da task para `pronto para review`.

Exiba a confirmação final:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 FLUXO CONCLUÍDO — <título da task>

✅ Desenvolvimento: concluído
✅ Testes Playwright: X/X aprovados
✅ Documentação: publicada no ClickUp
✅ Status da task: pronto para review

Arquivos gerados:
  • tests/e2e/CU-<ID>.spec.ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Regras que nunca podem ser quebradas

1. **Fase 3 é obrigatória** — nenhuma linha de código sem aprovação do plano.
2. **Fase 7 é obrigatória** — documentação sempre gerada, mesmo que o usuário não queira publicar.
3. **Nunca assuma** o que não está escrito. Se houver dúvida, pergunte.
4. **Testes rodam local** via bash script — nunca peça ao usuário para testar manualmente.
5. **Máximo 2 tentativas** de correção automática em caso de falha nos testes.
6. Se qualquer etapa falhar de forma inesperada, informe com contexto completo antes de encerrar.
