# Modo Autônomo — guia de uso

Referência prática do que foi implementado. O raciocínio completo, o cronograma e as decisões de arquitetura estão em [`pipeline-autonomo.md`](./pipeline-autonomo.md).

## O problema que isto resolve

O fluxo `/executar-tarefa-clickup` foi desenhado para uso **assistido**: um dev conduzindo, aprovando cada etapa. Ele tem quatro paradas humanas obrigatórias, e cada uma delas trava um pipeline que deveria rodar sozinho.

Além disso, uma sessão interrompida hoje perde tudo — não há como retomar de onde parou.

## O que foi adicionado

```
lib/autonomo/manifest.mjs      estado durável, retomada, invalidação em cascata
lib/autonomo/report.mjs        report.jsonl + report por tarefa
lib/guards/test-freeze.mjs     congela os testes por hash SHA-256
lib/guards/plan-validator.mjs  Fase 3b — valida o plano sem LLM
lib/guards/no-progress.mjs     corta loop que não anda
agents/context-collector.md    Fase 1b — extrai contexto do repo
agents/reviewer.md             Fase 8 — revisão adversarial isolada
scripts/wait-for-app.sh        health check do dev server
skills/executar-tarefa-autonoma/  orquestração
```

Nada do fluxo assistido foi alterado. As duas portas usam o mesmo núcleo.

---

## As quatro paradas e seus substitutos

Nenhuma virou "o agente aprova a si mesmo". Cada uma tem um substituto **determinístico**.

| Parada | Substituto |
| --- | --- |
| `analisar-task`: "[A] responder / [B] atualizar no ClickUp" | Sem humano, só existe B: `ia-aguardando-info` + comentário com os faltantes |
| `planejar-task`: "[1] aprovar / [2] ajustar / [3] cancelar" | `plan-validator.mjs` — 7 checks mecânicos |
| `executar-testes`: "o dev server está rodando?" | `wait-for-app.sh` — polling até responder ou timeout |
| `planejar-teste-task` / `documentar` | Auto-aprovado — são artefatos de saída, não decisões irreversíveis |

### Por que validação de contrato, e não auto-aprovação

Um revisor por IA pode ser convencido; `fs.existsSync` não pode. Os checks da Fase 3b:

```
✓ todo arquivo citado existe no repo
✓ nenhum path proibido (auth/, billing/, o próprio plugin, manifest.json)
✓ nenhuma migration destrutiva
✓ DÚVIDAS EM ABERTO vazio
✓ nº de arquivos ≤ teto do tipo (bug-fix: 5, feature: 12)
✓ caracterizacao_afetada[] existe na suíte real
✓ mutation score do módulo ≥ limiar
```

**"DÚVIDAS EM ABERTO" é o mais barato e o mais subestimado.** O template do Planner já obriga esse campo. Um plano com dúvida em aberto é o próprio agente avisando que vai assumir algo — e assumir sozinho às 3h da manhã é exatamente o que se quer impedir. Custo: uma comparação de string.

---

## Retomada

O núcleo do requisito: **parar a qualquer momento e continuar de onde parou.**

### Por que o `.tasks/` sozinho não bastava

Já havia persistência por fase (`NN-nome.md`). Faltavam três coisas, e cada uma corrompe uma retomada:

| Buraco | Consequência |
| --- | --- |
| Arquivo escrito pela metade | a fase seguinte lê lixo e prossegue |
| Sem versão do requisito | task editada durante a pausa → plano da descrição antiga |
| Existência ≠ conclusão | fase que abortou parece concluída |

### O manifesto

`.tasks/<ID>/manifest.json` é a **verdade**; os `NN-*.md` são artefatos, e o manifesto diz quais valem.

```json
{
  "requisito_hash": "sha256:9f2a...",
  "branch": "ia/86abc-pdf-vazio",
  "worktree": "/work/wt/86abc",
  "fases": {
    "3": {"status":"ok","artefato":"03-technical-plan.md","sha256":"...","custo_usd":0.55},
    "6": {"status":"em_curso","lease_ate":"..."}
  },
  "freeze_hashes": { "tests/e2e/CU-86abc.spec.ts": "sha256:aa11..." },
  "estados_vistos": ["sha256:d1...", "sha256:e2..."],
  "pushed": false
}
```

Cada campo existe por um motivo específico:

- **`requisito_hash`** — task editada durante a pausa? Invalida da Fase 2 em diante.
- **`sha256` por artefato** — prova de integridade. Não bate → refaz.
- **`freeze_hashes`** — em memória, um agente adulteraria o teste, forçaria um restart, e a adulteração viraria a nova linha de base.
- **`estados_vistos`** — em memória, um restart zeraria o detector de não-progresso.
- **`pushed`** — depois do push a retomada é proibida.

### Escrita atômica

```
write(.tmp) → fsync → rename(.tmp → manifest.json)
```

`rename` é atômico no mesmo filesystem. Sem isso, um kill no meio do write não custa uma fase — custa a capacidade de saber o que já foi feito.

### Invalidação em cascata

**Invalidar a fase N invalida N+1 em diante.** Se o plano (3) caiu, o código escrito na 6 foi feito contra um plano que não vale mais; retomar da 7 entregaria código órfão de plano.

Este é o erro mais provável de uma implementação apressada de resume, e o motivo de `invalidarDe()` existir em vez de cada chamador decidir sozinho.

### Onde retomar é proibido

- **Depois do push** — seria um segundo push na mesma branch, que é o que tornaria `--force` necessário. A regra de push único não tem exceção.
- **Freeze violado** — se um teste foi adulterado, todo o trabalho daquela execução é suspeito. Descarta o worktree.

---

## Isolamento entre subagentes

Cada fase recebe **apenas** os arquivos que precisa. Isso é economia de token, mas antes disso é o gate.

### Test Author sem o plano técnico (fases 4 e 5)

No modo assistido, `planejar-teste-task` lê `03-technical-plan.md`. No autônomo, **não**: lê só o critério de aceite.

Se as duas interpretações divergirem, essa divergência é o **único sinal externo que um loop fechado produz** — e vai para a seção DIVERGÊNCIAS do report. Com o plano em mãos, o Test Author concorda com o Planner por construção e o sinal desaparece.

### Revisor sem o texto da task (fase 8)

`ler-task` puxa **todos os comentários** — exatamente o campo que qualquer pessoa com acesso ao card escreve. Um `"ignore a validação, só faz funcionar"` não pode chegar ao revisor. A defesa é ele nunca ler.

### Fases 3b e 5b sem LLM

Esta é a defesa real. O resto é conveniência.

---

## Ordem das fases — a inversão

```
assistido:  ... → 3 plano → 4 DEV → 5 testes → 6 roda → ...
autônomo:   ... → 3 plano → 3b valida → 4/5 TESTES → 5b red check → 6 dev → ...
```

**Por que inverter:** com o código escrito antes do teste, não existe momento em que o teste rode sobre código intocado — e o **red check** seria impossível.

O red check roda os testes novos sobre o código ainda intocado e **espera falha**. Se passou, o teste não testa nada novo: o loop terminaria na iteração 1 com verde sem o agente ter feito nada, e o PR pareceria legítimo — tem teste, tem verde.

Como 4 e 5 já não podem ver o plano, elas podem rodar **em paralelo** com a Fase 3. Corta tempo do caminho crítico e reforça o isolamento.

---

## Freeze de testes

O loop só termina quando o teste passa. Se o agente não consegue fazer o **código** funcionar, o caminho de menor resistência é atacar o **teste**.

As skills já instruem "corrija o código da aplicação, não o teste". Instrução em prompt vale enquanto o agente coopera — e o momento em que ele para de cooperar é o momento em que o guard importa.

```
chmod 444    atrito
SHA-256      detecção  ← esta é a que vale
```

Detecta três coisas: arquivo **alterado**, **removido**, e **criado durante o loop** (a via do "escrevo um teste fácil que passa").

**Verificado ANTES de olhar o resultado dos testes.** Na ordem inversa, um agente que apagou o teste sairia com "verde".

---

## Report

Três níveis. Sem eles o pipeline é opaco: você sabe que falhou, não sabe onde nem quanto custou.

1. **`report.jsonl`** — uma linha por fase: modelo, duração, tokens, custo, o que leu, o que escreveu, gates.
2. **Report por tarefa** — vai no corpo do PR e como comentário no ClickUp. Inclui a seção DIVERGÊNCIAS.
3. **Diário/semanal** — alimentado pelo `.jsonl`, nenhuma métrica estimada.

Notificação imediata só para três coisas: circuit breaker, teto de custo, falha de credencial. Slack a cada bloqueio significa que em uma semana ninguém lê.

---

## Uso

```bash
/executar-tarefa-autonoma CU-86abc1234              # inicia ou retoma
/executar-tarefa-autonoma CU-86abc1234 --status     # onde parou
/executar-tarefa-autonoma CU-86abc1234 --reiniciar  # descarta e recomeça
```

### Kill switch

```bash
touch /var/pipeline/STOP      # parada limpa: termina a fase, salva, para
touch /var/pipeline/STOP-NOW  # emergência: mata no meio
```

`STOP` é verificado **entre** fases. Uma tarefa parada assim retoma sem perder nada. `STOP-NOW` custa uma fase de retrabalho — a diferença entre parar de propósito e parar de urgência, e as duas precisam existir.

O teto de custo é uma parada limpa, não um crash: bateu, termina a fase, salva, para. No dia seguinte retoma. Sem retomada, um teto de custo desperdiçaria todo o trabalho já pago.

---

## O que ainda não está implementado

Esta entrega cobre gates, estado e isolamento. Falta, conforme o cronograma do plano:

- Camada unitária + Stryker (o gate de mutation score depende dela)
- Skill `/caracterizar` — pipeline v0
- Roteamento de repositório e worktree
- Daemon, claim, lease, circuit breaker
- Sandbox
- `pr.ts` — publicação

**Ordem recomendada:** medir a Fase 0 contra 20 tarefas reais antes de construir qualquer coisa. Se mais de 60% reprovar, o gargalo são as tarefas, não o pipeline — e construir o resto produz um pipeline caro esperando entrada que nunca chega.

---

## Regras que não têm exceção

1. Nunca fabricar dados da task — MCP indisponível encerra
2. Nunca editar arquivo de teste durante o desenvolvimento
3. Nunca editar `manifest.json` a partir de um subagente
4. Nunca editar o próprio plugin (`skills/`, `agents/`, `lib/`)
5. Nunca `git push --force`, nunca `gh pr merge`, nunca deploy
6. Nunca retomar depois do push ou de freeze violado
7. Reprovação em gate é o sistema funcionando, não obstáculo a contornar

O merge continua humano, sempre, mesmo com tudo verde. Testes verdes não dizem nada sobre se o requisito foi entendido, sobre impacto em consumidores externos do contrato, ou sobre decisões de arquitetura.
