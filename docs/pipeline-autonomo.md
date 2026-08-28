# Pipeline Autônomo de Desenvolvimento — Plano de Execução

**Objetivo:** tarefa criada no ClickUp → plano → testes → loop de desenvolvimento → PR aberto, rodando continuamente, sem intervenção humana entre a autorização e o PR.

**Contexto:** stack NestJS / AdonisJS / Vue, múltiplos repositórios em 3 organizações GitHub, ClickUp como gestor de tarefas, time revisando PRs em rodízio, empresa já aceita código gerado por IA.

**Base de construção:** o plugin **`dev-innspire` v3.0.0** já existe e já implementa o miolo do fluxo. Este plano não parte do zero — parte dele.

**Restrição descoberta:** os repositórios praticamente não têm testes hoje. Isso determina toda a ordem do plano.

## Diretrizes de projeto

Três decisões que atravessam todas as seções:

1. **Máxima autonomia possível.** Toda parada humana precisa se justificar como risco irreversível, não como conforto.
2. **Um subagente por fase, cada um com contexto próprio.** Nenhuma fase enxerga o contexto bruto da anterior — só o artefato que ela produziu. Isso é ao mesmo tempo economia de token e isolamento de segurança (§10).
3. **Estado durável com retomada.** O orquestrador pode parar a qualquer momento — kill switch, restart, crash, teto de custo — e retomar da última fase concluída, sem refazer nada (§11).

---

# 0. O que já existe vs. o que falta

Este é o ajuste mais importante do plano. A versão anterior descrevia um sistema a construir inteiro; metade dele já está pronta no plugin.

## Já pronto no `dev-innspire` v3.0.0

| Componente do plano | Onde já vive | Estado |
|---|---|---|
| Leitura da tarefa no ClickUp | `skills/ler-task` + `agents/task-reader` | ✅ pronto |
| **Fase 0 (prontidão)** | `skills/analisar-task` — 7 critérios, bloqueia se faltar | ✅ **pronto, e é o gate que decide o projeto** |
| Planner (output é contrato) | `skills/planejar-task` + `agents/software-engineer` | ✅ pronto, formato de plano já definido |
| Dev por etapas + verificação de build | `skills/desenvolver-task` + `agents/developer` | ✅ pronto |
| Test Author isolado | `skills/planejar-teste-task` → `criar-testes` | ✅ pronto |
| Loop de correção com teto de tentativas | `skills/executar-testes` — máx. 2, corrige app nunca o teste | ✅ pronto |
| Documentação técnica + QA | `skills/documentar` + `agents/documentation-analyst` | ✅ pronto |
| Publicação de volta no ClickUp | `skills/publicar-clickup` | ✅ pronto |
| **Um agente por fase, com tools restritas** | `agents/*.md` — 8 agentes | ✅ **pronto — é a base do §10** |
| **Persistência de contexto entre fases** | `.tasks/<TASK_ID>/faseN-*.md` | ✅ **pronto — é a base do §11** |
| Cada fase valida se a anterior rodou | tabela "se ausente → execute X" em cada skill | ✅ pronto |
| Não fabricar dados sem MCP | regra inviolável nº 9 do orquestrador | ✅ pronto |
| Bootstrap de projeto | `skills/configurar-projeto` | ✅ pronto |

**Consequência direta:** as Semanas 1–2 do cronograma antigo encolhem. O que era "construir cliente ClickUp e Fase 0" virou "configurar o plugin nos repos".

**E mais importante:** os dois requisitos estruturais deste plano — subagentes isolados e retomada por fase — **já têm fundação no plugin**. Não são reescrita; são endurecimento do que existe.

## Falta construir

| # | Falta | Por quê é bloqueante |
|---|---|---|
| 1 | **Camada de teste unitário + Stryker** | o plugin só faz E2E Playwright; o gate de mutation score não roda sobre E2E |
| 2 | **Modo autônomo** | 4 paradas humanas obrigatórias no fluxo atual (§2) |
| 3 | **Fluxo v0 (caracterização)** | as 9 fases pressupõem uma task no ClickUp; a v0 não tem task |
| 4 | **Freeze de testes com hash** | o plugin *instrui* "corrija o app, não o teste" — instrução não é guard |
| 5 | **Red check (Fase 2b)** | não existe |
| 6 | **Contrato `caracterizacao_afetada[]`** | não existe; sem ele todo bug fix aborta (§9) |
| 7 | **Camada git/PR** | o plugin termina em comentário no ClickUp; não toca em git |
| 8 | **Roteamento de repositório** | o plugin assume que você já está no repo certo |
| 9 | **Sandbox** | o plugin roda no seu shell, sem isolamento |
| 10 | **Daemon / claim / lease / circuit breaker** | não existe; hoje é disparo manual por comando |
| 11 | **Revisor sem o texto da tarefa** | não existe agente de revisão adversarial |
| 12 | **Manifesto de fases + checkpoint atômico** | o `.tasks/` é convenção de nomes, não máquina de estados verificável (§11) |

**Leitura:** o plugin cobre o *fluxo de execução*. O que falta é *tudo que o torna seguro rodar sozinho* — os gates, o isolamento, a retomada e o orquestrador.

---

# 1. Veredito

**É viável rodar 24h sem intervenção humana — desde que "sem intervenção" signifique até o PR, e não até o merge.**

O que torna isso possível não é a capacidade do agente de escrever código (essa parte já funciona, e o `dev-innspire` já a operacionaliza). É a densidade de **gates determinísticos** ao redor dele, e a disposição do sistema de parar e dizer "não consegui" em vez de forçar um verde.

O modo de falha mais provável não é o agente travar. É ele **entregar com confiança algo que passa em todos os testes e está errado**. Toda a arquitetura existe para tornar isso caro e visível.

**Mas há um bloqueio anterior:** sem suíte de testes, o loop de desenvolvimento não tem critério de parada.

```
Loop(desenvolve → testa → desenvolve se precisar → até passar)
                    ↑
              não existe hoje
```

Não é degradação de qualidade — é ausência da condição de saída. O agente escreveria código, `tsc` passaria, lint passaria, e ele declararia sucesso sem nenhuma evidência de correção. O resultado seria um gerador de PRs plausíveis.

**Nota sobre o plugin:** ele já tem `skills/executar-testes` com loop e teto de 2 tentativas. Mas o loop roda **E2E contra um servidor local**, e a maioria das tarefas de backend (workers, services, PDF) não tem tela para exercitar. Para essas, o loop hoje não tem gate nenhum.

---

# 2. As quatro paradas humanas — e como cada uma sai do caminho

O plugin foi desenhado para uso **assistido**: um dev conduzindo, aprovando cada etapa. O pipeline autônomo precisa do mesmo núcleo sem os prompts.

| # | Onde | O que pede hoje | Tratamento no modo autônomo |
|---|---|---|---|
| 1 | `analisar-task` §4a | task incompleta → `[A] responder aqui / [B] atualizar no ClickUp` | **Determinístico.** Sem humano no loop, a única saída é B: move para `ia-aguardando-info` com a lista de faltantes como comentário. Nunca "A". |
| 2 | `planejar-task` | `[1] aprovar / [2] ajustar / [3] cancelar` | **Substituído por validação de contrato** (abaixo) |
| 3 | `executar-testes` §3 | "o dev server precisa estar rodando — confirme" | **Substituído por health check.** O sandbox sobe o app; polling em `BASE_URL` até 200 ou timeout. Falhou → `ia-bloqueada`. Nunca pergunta. |
| 4 | `planejar-teste-task` / `documentar` | aprovação do plano de teste e da doc | **Auto-aprovado.** Ambos são artefatos de saída, não decisões irreversíveis. A doc vai no PR e no ClickUp; o revisor humano lê lá. |

## Por que o plano não é aprovado por um humano — e o que o substitui

Trocar a aprovação humana por "o agente aprova o próprio plano" seria remover o gate, não automatizá-lo. O substituto é **validação estrutural do plano como contrato**, tudo determinístico:

```
□ toda etapa cita arquivos que EXISTEM no repo          (fs.exists)
□ nenhum arquivo citado está em path proibido           (auth/, billing/, pipeline/)
□ nenhuma etapa altera migration destrutiva             (regex no plano)
□ "DÚVIDAS EM ABERTO" está vazio ou == "nenhuma"        (se há dúvida → aguardando-info)
□ o módulo alvo tem mutation score ≥ limiar             (elegibilidade, §4)
□ caracterizacao_afetada[] existe na suíte real         (§9)
□ nº de arquivos tocados ≤ teto do tipo de tarefa       (bug-fix: 5, feature: 12)
```

**"DÚVIDAS EM ABERTO" é o gate mais barato e mais subestimado.** O plugin já obriga o Planner a preencher esse campo. Um plano com dúvida em aberto é o próprio agente dizendo que vai assumir algo — e assumir sozinho de madrugada é exatamente o que se quer impedir. Custo de implementação: uma comparação de string.

## O fork de modo

Duas portas de entrada, um núcleo:

```
/executar-tarefa-clickup <ID>              → modo assistido (o de hoje, intacto)
/executar-tarefa-clickup <ID> --autonomo   → modo autônomo (gates no lugar dos prompts)
                    │
                    └── mesmas skills, mesmos agentes, mesmo .tasks/<ID>/
```

Manter o modo assistido não é hesitação — é o ambiente de calibração. Quando um gate autônomo rejeita algo que você teria aprovado, você roda a mesma tarefa em modo assistido e vê onde divergiu.

---

# 3. A inversão

**Não espere ter testes para construir o pipeline. Use o pipeline para gerar os testes.**

## v0 — Pipeline gerador de testes de caracterização

| | v1 (features) | **v0 (testes)** |
|---|---|---|
| Precisa de testes para se validar | sim | **não** |
| Risco do output | altera comportamento | **só adiciona arquivo** |
| Critério de sucesso | subjetivo | **mensurável (mutation score)** |
| Revisão | lenta, exige entender o requisito | rápida |
| Reverter | exige análise | deletar arquivo |

E o principal: **produz exatamente o ativo que a v1 precisa.**

**A v0 é o melhor primeiro alvo da autonomia total.** Ela só adiciona arquivos de teste — não altera uma linha de produção. É o único ponto do sistema onde "roda sozinho a noite inteira" tem risco estruturalmente próximo de zero. Comece a autonomia por aqui, não pela v1.

## O que é teste de caracterização

O agente escreve testes que descrevem o **comportamento atual** do código — incluindo os bugs. Não o comportamento correto.

Parece errado e é o ponto: você trava o comportamento de hoje para poder mexer amanhã com segurança. Se um teste documenta um bug, quando alguém corrigir o teste vai falhar, e a mudança fica visível de propósito.

**Regra do agente na v0:** se encontrar comportamento que parece errado, escreve o teste do jeito que está e registra em `observacoes`. Não corrige.

## A v0 não passa pelas 9 fases

As skills do plugin pressupõem um `TASK_ID` do ClickUp. A v0 não tem task — o alvo é um módulo.

```
/dev-innspire:caracterizar <repo> <modulo>       ← skill nova
        │
        ├─ lê o módulo e suas dependências
        ├─ gera tests/unit/<modulo>/*.charac.spec.ts
        ├─ roda a suíte  ....................... precisa passar
        ├─ roda Stryker no módulo .............. score ≥ 60%
        ├─ verifica: 0 linhas de produção alteradas  (git diff --stat)
        └─ abre PR só-testes
```

Reaproveita `agents/test-analyst` e `agents/test-runner`. Não reaproveita `ler-task`, `analisar-task`, `planejar-task` — não há task.

Estado em `.charac/<repo>/<modulo>/`, mesmo padrão do §11: um módulo interrompido no meio da geração retoma sem regerar os testes já validados.

## O gate da v0: mutation testing

Um agente gerando testes vai produzir muita coisa assim:

```ts
it('deve funcionar', async () => {
  const r = await service.gerar(1);
  expect(r).toBeDefined();       // passa com qualquer coisa
});
```

Sem contramedida você acumula 400 testes e 70% de cobertura que não protegem nada — e liga a v1 achando que tem rede de segurança.

**Stryker altera o código de propósito** (troca `>` por `>=`, inverte condição, retorna `null`). Se o teste continua passando, é lixo.

```
Gate v0:
  ✓ suíte inteira passa
  ✓ mutation score do módulo ≥ 60%
  ✓ nenhuma linha de código de produção alterada
  ✓ toBeDefined / not.toThrow como assertion principal → rejeitado
```

**Cobertura é métrica secundária. Mutation score é a que vale.**

## Por que unitário, e não E2E

O plugin faz E2E Playwright. O gate da v0 exige unitário. Não é preferência — é viabilidade:

| | E2E Playwright (o que o plugin faz) | Unitário + Stryker (o que a v0 exige) |
|---|---|---|
| Stryker roda? | **não** — cada mutante exigiria subir o app | sim, ~s por mutante |
| Cobre worker / service sem tela? | não | sim |
| Tempo por rodada | minutos | segundos |
| Precisa de banco e servidor no ar | sim | não |

**Decisão: as duas camadas coexistem.**

- **Unitário + Stryker** → lógica: `app/services/*`, `src/workers/*`, regra de negócio. É a camada da v0 e a que define elegibilidade.
- **E2E Playwright** → fluxo de tela, e continua sendo o que a v1 gera por tarefa, exatamente como o plugin já faz.

A elegibilidade de uma tarefa olha o **mutation score unitário do módulo**, não a cobertura E2E.

## Priorização: onde cobrir primeiro

Cobrir tudo leva meses. Cobrir o que importa leva semanas.

```
prioridade = commits_90d × log10(tamanho) × (1 − cobertura_atual)
```

Churn é o melhor proxy de "onde vai chegar tarefa" e de "onde tem bug" — código que muda muito quebra muito. Módulo estável há dois anos pode esperar, mesmo sem teste nenhum.

**Se um módulo não atingir o score em 3 tentativas**, isso é informação sobre o **desenho do código**, não sobre o agente. Código difícil de testar costuma ter acoplamento demais — e essa lista, gerada automaticamente, é argumento concreto para a proposta de DevOps.

---

# 4. Cronograma

## Semana 1 — Fundação (encurtada pelo plugin)

O trabalho mais valioso agora não é construir o orquestrador. É preparar o terreno — que já melhora o uso manual do Claude Code hoje.

**1.1 `dev-innspire:configurar-projeto` em cada repo** — a skill já existe e já cria `.tasks/`, `tests/e2e/`, `playwright.config.ts` e valida o MCP. Rode e pronto. *Era um item de construção no plano antigo; hoje é um comando.*

**1.2 `CLAUDE.md` em cada repositório**

Regra de corte: *se a informação seria a mesma na próxima tarefa, ela pertence ao repo, não à tarefa.*

Preencha "Armadilhas conhecidas" com os bugs que já se repetem:
- `response.stream()` vs `response.send(buffer)` na geração de PDF
- `preload` não-recursivo do Lucid (fonte de N+1)
- `Content-Disposition` quebrando o front antigo
- variável de ambiente faltando nos workers

**Ganho imediato, sem pipeline nenhum:** o `dev-innspire` que você já usa lê esse arquivo em toda fase de planejamento.

**1.3 `dominios.yaml`** — comece pelos 5 domínios que mais geram tarefa. Marque `automatizavel: false` em tudo que você não deixaria um júnior mexer sozinho (auth, integração externa, billing).

**1.4 Campos custom no ClickUp** — apenas dois: `repositorio` e `tipo`. Dropdown, nunca texto livre. Todo campo obrigatório é atrito, e atrito produz preenchimento de má qualidade.

**1.5 Template de tarefa** — 4 seções: sintoma, critério de aceite, reprodução, fora de escopo. Alinhe com os **7 critérios que `analisar-task` já verifica** — o template deve ser o formulário que faz a Fase 0 passar.

**1.6 CI mínimo** — um workflow rodando `npm test` no PR. Poucas horas. Não é a "iniciativa de CI/CD" completa. Sem isso, os testes gerados na v0 não protegem ninguém fora do sandbox.

## Semana 2 — Medir a Fase 0 com o que já está pronto

Não construa nada. **Rode `/dev-innspire:analisar-task` contra 20 tarefas reais** — as últimas fechadas e as abertas agora — e conte quantas ele reprovaria.

Isso é o dry-run do plano antigo, mas sem escrever as ~150 linhas de script: a skill já faz exatamente isso e já emite a lista de faltantes.

### ⚠️ O checkpoint que decide o projeto

```
taxa de aguardando-info = reprovadas por analisar-task / total
```

| Resultado | Leitura | Ação |
|---|---|---|
| < 30% | tarefas boas | siga |
| 30–60% | normal no início | ajuste o template, siga |
| **> 60%** | **o gargalo são as tarefas** | **pare** |

Acima de 60%, construir o resto produz um pipeline caro esperando por entrada que nunca chega. O investimento certo passa a ser o template e o hábito do time.

**Este é o erro mais provável do projeto: pular esta semana por parecer pouco trabalho.** É justamente a que responde se vale construir o resto — e agora ela custa um dia, não uma semana.

## Semana 3 — Guards + camada unitária

Duas frentes, ambas sem daemon.

**3.1 Calibrar guards contra PRs históricos.** Rode os guards sobre PRs que você **já aprovou**.

- Dispara em PR bom → guard mal calibrado. Ajuste agora, não às 3h da manhã com o circuit breaker aberto.
- Não dispara em nada → provavelmente frouxo. Teste com um PR ruim de propósito.

Ordem: `test-freeze` → `forbidden-patterns` → `no-progress`.

**3.2 Instalar Vitest + Stryker** em 1 repo piloto. `stryker.conf.json` com `mutate` apontando só para o módulo alvo — rodar Stryker no repo inteiro leva horas e não serve para gate de loop.

**3.3 Implementar o freeze de hash.** O plugin diz "corrija o código da aplicação (não o teste)". É instrução em prompt — o guard é outra coisa:

```
antes do loop:  hash[f] = sha256(f) para todo arquivo de teste
a cada iteração: verifica ANTES de olhar o resultado
alterou → aborta, ia-bloqueada, motivo "test-freeze violado"
```

## Semana 4 — Sandbox

```bash
cd sandbox && docker compose build
WORKTREE_PATH=/tmp/teste docker compose run --rm agent bash
```

Rode o fluxo do `dev-innspire` **dentro** do container, em modo assistido mesmo. Vai faltar coisa: dependência do sistema, comando legítimo bloqueado pela allowlist, banco de teste que não sobe.

**Ponto específico do plugin:** `scripts/run-tests.sh` usa `BASE_URL=http://localhost:3000` e a Fase 7 hoje **pergunta se o app está no ar**. No sandbox, o compose sobe o app como serviço e o health check substitui a pergunta. Se essa parte não funcionar, o modo autônomo trava na Fase 7 em toda tarefa de front.

## Semanas 5–8 — Pipeline v0 (autônomo desde o início)

Alvo: **mutation score ≥ 60% em 3 domínios**, não em tudo.

A v0 roda **sem aprovação humana desde a primeira noite** — é o único componente onde isso é seguro por construção, porque o gate "0 linhas de produção alteradas" é verificável por `git diff` e o output é descartável.

Ordem provável pelo histórico:
1. `app/services/pdf` — gera bug com regularidade
2. `src/workers` — falha silenciosa, ninguém vê na hora
3. `app/services/apiario` — volume de tarefas

PRs pequenos, só arquivos de teste, revisão rápida.

## Semana 9 — Ponto de decisão

```
mutation score ≥ 60% em ≥ 3 domínios?
   sim → liga a v1, RESTRITA a esses domínios
   não → continua v0. Não force.
```

## Semanas 10+ — v1 com elegibilidade por cobertura

> **Uma tarefa só entra no pipeline de desenvolvimento se o módulo dela tiver mutation score acima do limiar.**

Não é burocracia — é o sistema se limitando sozinho ao território onde suas defesas funcionam. Módulo sem cobertura → `ia-aguardando-info` com "rode a v0 neste módulo antes".

O pipeline expande conforme a cobertura cresce. A v0 continua rodando em paralelo, sempre.

**Progressão:** PR em draft → concorrência 1 → só `bug-fix` → só um repo → horário comercial. Cada expansão depois de 2 semanas estáveis. **24h é o objetivo, não o ponto de partida.**

Critério para expandir: ≥ 60% dos PRs aceitos com ajuste pequeno.

---

# 5. Gatilho: duas chaves

| | Etiqueta `IA-First` | Status `pronto pra executar` |
|---|---|---|
| Significa | "pode ser feita pela IA" | "pode executar agora" |
| Quando | na criação | quando a descrição está completa |
| Natureza | classificação | **autorização** |

Nenhuma sozinha dispara nada. Etiqueta sem status = candidata parada. Status sem etiqueta = tarefa humana normal.

**Busca = `tag: IA-First` E `status: pronto pra executar`.** Nunca só a etiqueta — ela é permanente, e sem o filtro de status a tarefa é repescada a cada 5 minutos para sempre, inclusive depois do PR aberto.

Ao pegar, o daemon move para `ia-planejando` — e ela sai da query sozinha.

O daemon usa as **mesmas MCP tools que o plugin já usa** (`clickup_filter_tasks`, `clickup_update_task`, `clickup_create_task_comment`). Nada de cliente HTTP novo.

## Máquina de estados

```
[criação: etiqueta IA-First]
        ↓
[humano move: "pronto pra executar"]   ← AUTORIZAÇÃO
        ↓
   ia-planejando  ← claim
        ↓
   ┌─────┴─────┐
   ↓           ↓
ia-aguardando-info    ia-desenvolvendo → ia-revisando
(analisar-task reprovou)       ↓
   ↓                    ┌──────┴───────┐
   ↓                    ↓              ↓
   ↓               pr-aberto     ia-bloqueada
   └── humano corrige e devolve (máx. 3×) ──┘
```

Este é o estado **externo**, visível no ClickUp. O estado **interno** — em qual das 9 fases a tarefa parou — vive no manifesto do §11 e é o que permite retomar.

## Dois tipos de bloqueio, nunca um só

| | `ia-aguardando-info` | `ia-bloqueada` |
|---|---|---|
| Causa | `analisar-task` reprovou | falha técnica no meio |
| Dono | quem escreveu a tarefa | dev |
| Custo de conserto | ~2 min | ~30 min |
| Taxa alta significa | tarefas vagas demais | base quebrada / tarefas complexas |

Misturar os dois destrói a informação mais valiosa que o pipeline produz: *o problema está nas tarefas ou no pipeline?*

## Riscos do gatilho, todos tratados

| Risco | Mitigação |
|---|---|
| Repesca infinita | filtro por status + `terminalStatuses` |
| Etiqueta com case/espaço diferente | comparação normalizada |
| Tarefa pescada enquanto está sendo escrita | ignora editadas há < 2 min |
| Descrição alterada durante os ~40 min | hash do requisito no pickup, checado entre fases |
| Etiqueta removida no meio | tratado como cancelamento |
| Humano assume no meio | status fora do fluxo IA → aborta |
| 40 tarefas etiquetadas de uma vez | FIFO + concorrência 1 + circuit breaker |
| Webhook e polling pegam a mesma tarefa | claim otimista (relê → escreve → relê) |
| Ping-pong de correção | contador `ia_tentativas`, máx. 3 |
| **Retomada com contexto de execução anterior** | **manifesto invalidado por `requisito_hash` — §11** |

**Webhook + polling.** Com status dedicado, `taskStatusUpdated` é sinal preciso e o payload diz **quem autorizou** — o ClickUp não tem permissão por status, então isso é sua única auditoria. O polling continua como reconciliador: webhook perdido num deploy deixaria a tarefa parada para sempre.

---

# 6. O que a IA precisa para executar

A tentação é "vamos escrever descrições melhores". Funciona por duas semanas e degrada — depende de disciplina humana constante numa tarefa que ninguém gosta de fazer.

**Assuma que as pessoas vão escrever pouco.**

| Fonte | Volume | Estratégia |
|---|---|---|
| Humano digita | **mínimo** | 4 seções + 2 campos. Só o que só ele sabe. |
| Pipeline coleta | **máximo** | tudo derivável de código, git, logs, histórico |
| Vive no repo | **estável** | convenções. Escrito 1×, serve sempre. |

## O que só o humano sabe

| | Onde | Por que só ele |
|---|---|---|
| Repositório | campo custom | inferir = 1 em 10 tarefas no repo errado |
| Tipo | campo custom | define o fluxo permitido |
| Sintoma | descrição §1 | não está no código |
| **Critério de aceite** | descrição §2 | **é a definição de sucesso** |
| Reprodução | descrição §3 | o agente não acessa produção |
| Fora de escopo | descrição §4 | senão ele "aproveita a viagem" |

**Regra do critério de aceite: o que não vira teste não é critério.** "Melhorar a performance" não vira. "P95 de `GET /apiarios` abaixo de 400ms com 1000 registros" vira.

Sem ele, o agente inventa a definição de pronto e defende a invenção até o fim.

## O que o pipeline coleta sozinho

`ler-task` já busca **comentários, subtasks, campos custom, anexos, responsável, prioridade e prazo**. Isso é a metade barata. Falta a metade que vem do repo — e cada item aqui é uma linha que ninguém digita:

- **Stack trace → arquivo:linha + snippet** — o sinal mais barato e subaproveitado. `PdfService.generate:112` economiza a fase inteira de caçar o erro
- **Tarefas similares já resolvidas** — como o time resolveu antes vale mais que instrução genérica de estilo
- Últimos commits do módulo, migrations dos últimos 30 dias, testes existentes

**Onde isso entra:** uma **Fase 1b** com subagente próprio (§10), escrevendo `fase1b-contexto.md`. As fases seguintes já leem esse diretório — não muda nada nelas.

**É aqui que se ganha a adoção.** Se preencher a tarefa der mais trabalho que fazer o código, ninguém usa.

## O ciclo que melhora sozinho

A Fase 0 não é só um portão — é instrumento de medida. Depois de 3–4 semanas, os campos que mais aparecem em `faltando` indicam:

- **Sempre o mesmo campo** → o template pede mal. Reescreva com exemplo melhor.
- **Informação derivável** → não é problema do humano. Mova para coleta automática.

A segunda é quase sempre a resposta certa. O instinto será cobrar mais de quem preenche o card — e esse é o recurso mais escasso do sistema.

---

# 7. Roteamento: repo, branch e PR

Errar o repositório é a falha mais cara e mais silenciosa. **O plugin não tem defesa nenhuma aqui** — ele assume que você já está no diretório certo, o que é verdade no uso assistido e falso no autônomo.

Sequência real:

> agente entra no repo errado → não encontra `PdfService` → conclui que precisa **criar** o módulo → cria → escreve testes para o que ele mesmo criou → testes passam → gates passam → PR com módulo duplicado no repositório errado

Nada nessa cadeia dispara alarme. Tudo está verde.

## Declaração + verificação

**Declaração:** campo custom `repositorio`, dropdown. Texto livre vira `api-adonis`, `adonis`, `API Adonis`, `adonisjs` na mesma semana.

**Verificação:** o campo é intenção, não verdade. Extrai evidências do texto e testa contra **todos** os repos com `git grep`:

| Evidência | Peso |
|---|---|
| Caminho de arquivo (`app/services/pdf.service.ts`) | alto |
| Classe/Service/Worker (`EnvioPdfAtivaFTP`) | alto |
| Rota (`GET /apiarios/:id/relatorio`) | médio |
| Mensagem de erro literal | médio |

- Declarado tem acertos → confirmado
- Declarado tem 0 e outro tem → **bloqueia** e sugere
- Outro tem 2× mais → **bloqueia** por ambiguidade

Custo: 3 greps. Evita o pior PR possível.

**Glossário de domínios** cobre o caso em que a tarefa não tem termo técnico nenhum: *"o relatório do apiário está vindo vazio"* → `apiário` + `relatório` → `api-adonis`, módulos `app/services/apiario` e `app/services/pdf`.

## Branch e alvo do PR saem do mesmo objeto

O bug clássico de multi-repo: branchar de `develop` e abrir PR contra `main`. O diff vem com todo o delta entre as duas, ninguém revisa, o PR morre.

```ts
git worktree add -b ia/123 <path> ${repo.baseBranch}
gh pr create --base ${repo.prTarget}
```

Duas travas: `validateRegistry()` falha no **boot** se `baseBranch !== prTarget`; `openPr()` faz assert contra a branch que o worktree realmente usou.

**O worktree é o cwd do plugin.** Todas as skills operam em caminhos relativos (`.tasks/`, `tests/e2e/`) — rodar dentro do worktree isola a execução sem alterar uma linha do plugin. **E o worktree é persistente entre retomadas** (§11): destruí-lo perderia o trabalho já feito.

## Push único, force nunca

```
commits locais → rebase local → gates → push (1×) → PR
```

O branch remoto só nasce no último passo. Não há histórico remoto a reescrever, então `--force` continua banido **sem exceção** — regra de segurança com exceção não é regra de segurança.

Efeito colateral: se falhar antes do push, **não existe branch remota nenhuma**. Repositório limpo por construção. Isso também é o que torna a retomada barata: parar no meio não deixa rastro remoto.

## Nomenclatura

```
ia/{taskId}-{slug}       1ª tentativa
ia/{taskId}-{slug}-r2    retry
```

`taskId` primeiro porque é a chave de busca. Retry **nunca** reaproveita a branch anterior — misturaria o histórico da tentativa que falhou e o diff ficaria incompreensível.

**Retomada ≠ retry.** Retomar continua na mesma branch, de onde parou. Retry começa uma branch nova. Confundir os dois é como se perde trabalho — o manifesto (§11) distingue os casos.

## Conflito de rebase

Agente não resolve — resolver exige entender a intenção das duas mudanças, e é onde um agente confiante produz o merge silenciosamente errado.

**Uma exceção mecânica:** conflito só em `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` → regenera do `package.json`. Resultado determinístico, não é julgamento. Gates rodam de novo depois.

## Baseline: a base está verde antes de eu começar?

Se `develop` está quebrado, **toda** tarefa falha nos gates. O agente gasta 5 iterações consertando problema que não é dele. Depois de 3 tarefas o circuit breaker abre. Você acorda com 3 bloqueios e budget queimado por um teste flaky mergeado às 18h.

Gates rodam na base **antes**, com cache por SHA. Bônus: distingue "eu quebrei" de "já estava quebrado" — sem isso o agente recebe erro sem relação com a tarefa e mexe em código aleatório.

## Reviewers: CODEOWNERS, não lista fixa

O pior cenário de um PR automático não é ele estar errado — é ser **aprovado por quem não conhece a área**. Um PR do bot com testes verdes e descrição bem escrita convida ao "aprovar sem ler".

**A doc que `documentar` já gera vai no corpo do PR** — resumo, arquivos alterados, decisões técnicas, pontos de atenção para code review. Esse último campo já existe no template do plugin.

Além dela, o corpo do PR tem seção explícita de **o que os automatismos não verificam**:
- se o requisito foi entendido corretamente
- impacto em consumidores externos do contrato
- decisões de arquitetura

São exatamente os três pontos onde teste verde não significa nada.

---

# 8. Múltiplas organizações

| Org | Perfil | Escrita | Contexto |
|---|---|---|---|
| `InnovaConnect` | interno | ✅ | ✅ |
| `incommbr` | parceiro | ❌ leitura | ❌ isolado |
| `Unesc-PMP` | externo | ❌ leitura | ❌ |

**Perfil, não entrada solta de YAML.** Se cada org nova exigir 15 linhas de política escritas à mão, a quarta será copiada da terceira sem ninguém reler as implicações — e é assim que uma org externa acaba com permissão de escrita. Adicionar org = 6 linhas + escolher perfil.

## O sintoma que confunde

`gh` retorna **404, não 403**. O GitHub esconde repos sem acesso, então "não existe" e "não posso" são a mesma mensagem. O agente interpreta como repo errado, e você caça bug de roteamento que é bug de credencial.

`validateCredentials()` roda no boot e testa cada token contra cada repo da allowlist.

## Deny by default

**O token enxergar o repo não autoriza escrever nele.** O script de descoberta emite:

```
⚠️  23 repos que o token PODE escrever mas não estão habilitados
```

Esse número é a medida honesta do raio de alcance da credencial. Se der 40, um bug de roteamento tem 40 lugares onde causar dano.

Recomendação: PAT fine-grained restrito à allowlist, ou GitHub App com instalação por repo.

## Contaminação cruzada de contexto

Risco que **não existia** com uma org só. Com três, o agente tem leitura de código de entidades diferentes ao mesmo tempo, e o enriquecimento não distingue origem sozinho.

Cenário: tarefa no `api-adonis`, a Fase 1b busca "exemplos parecidos", acha trecho num repo da Unesc, agente adapta e commita. **O PR sai com código de origem acadêmica dentro de código proprietário.**

Nenhum gate pega: compila, passa nos testes, passa no gitleaks, revisor aprova porque o código está bom. É licenciamento, não bug — e vira problema jurídico meses depois.

Contexto é escopado por **perfil**: poder ler não é poder usar como fonte. **O subagente de enriquecimento (§10) recebe a allowlist de origens como parâmetro** — não é regra em prompt, é o conjunto de diretórios que ele consegue ler.

## Decisões que são suas, não do código

- **`incommbr`** — se é a org do parceiro, PR automático lá é código gerado por IA no repositório de outra empresa, sob sua credencial, sem acordo deles. `leitura` até existir acordo explícito. Ler como contexto (entender contrato de API de verdade em vez de adivinhar pela doc) tem valor real e risco zero.
- **`Unesc-PMP`** — licença pode ser incompatível com destino proprietário; se são repos de projeto de faculdade, autoria raramente está clara. Se for projeto seu hospedado lá, o caminho não é afrouxar o perfil `externo` — é mover para `interno` deliberadamente, sabendo que libera escrita **e** contexto cruzado.

**Comece com InnovaConnect e os 3 repos.** As outras ficam sem token configurado — credencial de org que você não vai usar em 2 meses é superfície de ataque parada.

---

# 9. As 8 condições do verde

Na primeira versão era uma: "os testes passam". Essa é a diferença entre um pipeline que você liga 24h e um que gera PRs plausíveis.

O `dev-innspire` hoje tem **duas** (testes da tarefa passam; build compila). As outras seis são o trabalho desta seção.

```
□ freeze intacto                  arquivos de teste não foram tocados     ← construir
✓ typecheck limpo                 zero `any` novo                          ← plugin já verifica build
✓ testes do módulo passam                                                  ← plugin (E2E); falta unit
✓ testes da tarefa passam         a mudança foi feita                      ← plugin
□ red check passou (Fase 2b)      e ela era necessária                     ← construir
□ caracterização sem regressão    nada mais quebrou                        ← construir (depende da v0)
□ declaradas quebraram            a mudança teve efeito                    ← construir
□ mutation score não caiu         o código novo tem teste                  ← construir
```

Ordem no loop: **barato → caro**. `freeze (ms) → typecheck (s) → módulo (~30s) → tarefa (~10s) → caracterização (min)`. Cada gate que falha cedo economiza os de baixo.

## Freeze de testes — o guard mais importante

O loop só termina quando o teste passa. Se o agente não consegue fazer o **código** funcionar, o caminho de menor resistência é atacar o **teste**: afrouxar assertion, mockar a função sob teste, adicionar `.skip`, deletar o arquivo. E vai reportar sucesso.

O plugin **instrui** o agente a não fazer isso ("corrija o código da aplicação, não o teste"). Instrução em prompt vale enquanto o agente coopera — e o momento em que ele para de cooperar é exatamente o momento em que o guard importa.

Duas camadas: `chmod 444` (atrito) + **hash SHA-256 verificado a cada iteração** (detecção). A segunda é a que vale.

Checado **antes** de olhar se o teste passou — invertido, um agente que apagou o teste sai com "verde".

**Interação com retomada:** os hashes vivem no manifesto (§11), não em memória. Retomar uma tarefa recarrega os hashes de antes da parada — senão um agente poderia alterar o teste, forçar um restart, e o freeze recomeçaria contando o arquivo adulterado como linha de base.

## Caracterização vs correção de bug

**O gap mais grave encontrado, e que teria quebrado o pipeline com diagnóstico enganoso.**

A v0 trava o comportamento atual **incluindo os bugs**. Chega a tarefa "corrigir o PDF vazio". Corrigir faz o teste de caracterização que travava esse bug **falhar** — corretamente. O loop veria regressão e abortaria. **Toda tarefa de bug fix seria bloqueada pela própria rede de segurança**, e o log diria "o agente quebrou o código".

Solução: o Planner declara `caracterizacao_afetada[]`. Contrato bidirecional:

| Situação | Leitura |
|---|---|
| falhou **e** estava declarada | ✅ a mudança fez efeito |
| falhou e **não** estava | ❌ regressão real → aborta |
| **não** falhou mas estava declarada | ❌ a mudança não teve efeito |

O terceiro caso é o mais valioso: pega o agente que satisfaz os testes da tarefa **sem alterar o comportamento que importava**. Verde perfeito, entrega zero.

**Onde isso entra no plugin:** `planejar-task` já emite um plano estruturado com "ETAPAS", "RISCOS" e "DÚVIDAS EM ABERTO". `caracterizacao_afetada[]` vira a quarta seção obrigatória do mesmo template.

**Validação obrigatória:** os nomes declarados precisam existir na suíte real. Nome inventado faria o Gate 5 nunca disparar — e uma verificação morta é pior que verificação nenhuma, porque você conta com ela. Pior: é a declaração que autoriza a Fase 5b a reescrever aquele teste, então sem validação o agente contornaria o freeze por via indireta.

**Fase 5b:** caracterizações legitimamente invalidadas são reescritas para o novo comportamento — apenas as declaradas, o resto continua sob freeze. Senão ficam vermelhas na base e a próxima tarefa herda.

## Red check

Se o teste do Test Author já passava antes de qualquer alteração, ele não testa a mudança. O loop terminaria na iteração 1 com verde, sem o agente ter feito nada — e o PR pareceria legítimo: tem teste, tem verde.

Roda entre Fase 2 e 3, com testes novos sobre código intocado. **Espera falha.** Sucesso ali é o problema.

Duas tentativas com feedback. Falhou de novo → bloqueia com a causa provável certa: *o critério de aceite descreve comportamento que já existe*.

**Conflito de ordem com o plugin:** hoje o fluxo é `desenvolver-task` (4) → `criar-testes` (6). O código nasce antes do teste, então não existe momento em que o teste rode sobre código intocado. **O modo autônomo inverte:** `planejar-teste-task` → `criar-testes` → **red check** → `desenvolver-task`. Sem essa inversão o red check é impossível.

## Testes flaky

Com centenas de caracterizações, é questão de tempo. Dois danos, o segundo pior:

1. Loop aborta por regressão inexistente
2. **O agente tenta consertar um teste que falha aleatoriamente**, mexendo em código correto até parecer resolvido

Detecção: falhou → roda de novo. Resultado diferente = flaky, quarentena, não bloqueia.

**Quarentena com TTL de 14 dias.** Sem prazo, "está flaky" vira desculpa permanente e em 6 meses metade da suíte está em quarentena — o mesmo que não ter suíte, com a aparência de ter.

## Detector de não-progresso

O maior desperdício não é a tarefa impossível — é ela gastar as 5 iterações completas de madrugada. Erro idêntico entre iterações, diff sem mudança, ou oscilação (volta a um estado já visitado) → aborta na iteração 2.

O plugin já limita a **2 tentativas** em `executar-testes`. O detector é ortogonal: 2 tentativas é o teto; não-progresso corta antes disso quando é óbvio que não vai andar.

**O histórico de estados visitados vai no manifesto**, senão um restart zera o detector e a tarefa recomeça a oscilar do início.

---

# 10. Arquitetura de subagentes — contexto isolado por fase

O plugin já tem 8 agentes com modelo e tools definidos. Esta seção transforma isso de *organização* em *arquitetura*: cada fase é um subagente com **contexto próprio, entrada declarada e saída declarada**.

## Por que isolar, e não passar tudo adiante

Três razões, e a terceira é a que realmente importa:

1. **Custo.** Uma tarefa completa passando contexto acumulado chega à Fase 8 carregando task + plano + diff + logs de teste. Isolado, cada fase carrega ~2 arquivos.
2. **Foco.** Um agente com 40k tokens de contexto irrelevante erra mais. O `developer` não precisa dos comentários do ClickUp.
3. **Segurança.** O isolamento **é** o gate. Se o Test Author enxerga o plano, ele concorda com o Planner por construção — e a divergência entre os dois, que é o único sinal externo que um loop fechado produz, desaparece. Isolar não é otimização; é o mecanismo de detecção.

## O contrato de cada fase

Cada subagente recebe **apenas** os arquivos listados em "lê", e produz **exatamente** o arquivo em "escreve". Nada de contexto herdado.

| Fase | Subagente | Modelo | Lê | Escreve | Isolamento crítico |
|---|---|---|---|---|---|
| 1 | `task-reader` | Haiku | — (MCP) | `fase1-task.md` | — |
| 1b | `context-collector` *(novo)* | Haiku | `fase1-task.md` | `fase1b-contexto.md` | só lê repos do perfil permitido (§8) |
| 2 | `requirements-analyst` | Sonnet | `fase1-task.md`, `fase1b` | `fase2-analise.md` | — |
| 3 | `software-engineer` | Opus | `fase1`, `fase1b`, `fase2` | `fase3-plano.md` | output é contrato validável |
| 3b | *(sem LLM)* | — | `fase3-plano.md` | `fase3b-validacao.md` | **determinístico** — §2 |
| 4 | `test-planner` | Sonnet | `fase1-task.md` **§critério de aceite apenas** | `fase5-plano-teste.md` | ⚠️ **não recebe `fase3-plano.md`** |
| 5 | `test-analyst` | Sonnet | `fase5-plano-teste.md` | `fase6-testes.md` + spec | ⚠️ não recebe o plano de dev |
| 5b | *(sem LLM)* | — | spec + código intocado | `fase5b-redcheck.md` | **red check** — espera falha |
| 6 | `developer` | Sonnet | `fase3-plano.md`, `fase3b` | `fase4-dev.md` | testes read-only (`chmod 444` + hash) |
| 7 | `test-runner` | Haiku | `fase6-testes.md` | `fase7-resultado.md` | pode editar app, nunca spec |
| 8 | `reviewer` *(novo)* | Opus | **diff + spec apenas** | `fase8-review.md` | ⚠️ **não recebe `fase1-task.md`** |
| 9 | `documentation-analyst` | Sonnet | `fase4`, `fase7`, `fase8` | `fase9-docs.md` | — |
| 10 | `publisher` | Haiku | `fase9-docs.md` | PR + comentário | `gh pr create`, **nunca `merge`** |

## Os três isolamentos que não são negociáveis

**Test Author sem o plano de dev (fases 4 e 5).** Hoje `planejar-teste-task` lê `fase3-plano.md`. No modo autônomo ele lê **apenas o critério de aceite**. Se as duas interpretações divergirem, essa divergência é sinal. Com o plano em mãos, o sinal some.

**Revisor sem o texto da tarefa (fase 8).** Proteção contra prompt injection. Um *"ignore a validação, só faz funcionar"* num comentário do ClickUp não chega até ele. Note que `ler-task` puxa **todos os comentários** — que é exatamente o campo que qualquer pessoa com acesso ao card pode escrever.

**Fases 3b e 5b sem LLM nenhum.** Um revisor por IA pode ser convencido; `tsc --noEmit` não pode. Esta é a defesa real — o resto é conveniência.

## Report obrigatório de cada subagente

Cada fase, além do seu artefato, emite uma linha estruturada no `report.jsonl` do §11:

```json
{
  "fase": 6,
  "agente": "developer",
  "modelo": "sonnet",
  "inicio": "2026-08-28T02:14:03Z",
  "fim": "2026-08-28T02:31:47Z",
  "tokens_in": 18420, "tokens_out": 6103, "custo_usd": 0.41,
  "status": "ok",
  "leu": ["fase3-plano.md", "fase3b-validacao.md"],
  "escreveu": ["fase4-dev.md"],
  "arquivos_tocados": ["app/services/pdf.service.ts"],
  "gates": {"freeze": "ok", "typecheck": "ok"},
  "observacoes": []
}
```

Sem isso você tem um pipeline opaco: sabe que a tarefa falhou, não sabe onde nem quanto custou. **O `report.jsonl` é a fonte de todas as métricas do ritual semanal (§11)** — sem ele, aquelas métricas são estimativa.

## Concorrência entre subagentes

As fases são sequenciais por dependência de dados, com **duas exceções aproveitáveis**:

- **1b em paralelo com 2** — o enriquecimento de contexto não depende da análise de completude.
- **4 e 5 em paralelo com 3** — o Test Author já não pode ver o plano; então planejar teste e planejar dev podem rodar ao mesmo tempo. Isso corta ~8 min do caminho crítico e **reforça** o isolamento em vez de enfraquecê-lo.

Fora dessas, paralelizar significaria dar a um agente contexto que ele não deveria ter.

---

# 11. Estado durável e retomada

Requisito central: **o orquestrador para a qualquer momento e retoma da última fase concluída, sem refazer nada.**

O plugin já persiste `faseN-*.md` por fase — a fundação existe. O que falta é transformar convenção de nomes em **máquina de estados verificável**.

## Por que o `.tasks/` sozinho não basta

Três buracos, cada um capaz de corromper uma retomada:

| Buraco | O que acontece hoje | Consequência |
|---|---|---|
| Arquivo escrito pela metade | crash no meio do write deixa `fase3-plano.md` truncado | a fase seguinte lê lixo e prossegue |
| Sem versão do requisito | task editada no ClickUp durante a pausa | retoma com plano da descrição antiga |
| Existência ≠ conclusão | arquivo existe → assume-se fase ok | fase que abortou parece concluída |

## O manifesto

Um único arquivo, `.tasks/<ID>/manifest.json`, é a **verdade** sobre a execução. Os `faseN-*.md` são artefatos; o manifesto diz quais valem.

```json
{
  "task_id": "86abc1234",
  "requisito_hash": "sha256:9f2a...",
  "repo": "api-adonis",
  "branch": "ia/86abc1234-pdf-vazio",
  "worktree": "/work/wt/86abc1234",
  "modo": "autonomo",
  "iniciado_em": "2026-08-28T01:02:00Z",
  "fase_atual": 6,
  "fases": {
    "1":  {"status": "ok",       "artefato": "fase1-task.md",  "sha256": "...", "concluido_em": "...", "custo_usd": 0.02},
    "2":  {"status": "ok",       "artefato": "fase2-analise.md","sha256": "...", "concluido_em": "...", "custo_usd": 0.08},
    "3":  {"status": "ok",       "artefato": "fase3-plano.md",  "sha256": "...", "concluido_em": "...", "custo_usd": 0.55},
    "6":  {"status": "em_curso", "iteracao": 2, "lease_ate": "2026-08-28T03:14:00Z"}
  },
  "freeze_hashes": {"tests/e2e/CU-86abc1234.spec.ts": "sha256:aa11..."},
  "estados_vistos": ["sha256:d1...", "sha256:e2..."],
  "custo_acumulado_usd": 1.34,
  "tentativas": 1
}
```

Campos que existem por um motivo específico:

- **`requisito_hash`** — hash da descrição + critério de aceite no pickup. Mudou durante a pausa? A retomada é inválida: invalida da Fase 2 em diante e replaneja. Sem isso você entrega o plano da descrição antiga.
- **`sha256` por artefato** — prova de que o arquivo está íntegro e é o que aquela fase produziu. Hash não bate → fase inválida, refaz.
- **`freeze_hashes`** — §9. Sem persistir, um restart daria linha de base nova para o freeze.
- **`estados_vistos`** — §9. Sem persistir, um restart zera o detector de não-progresso.
- **`worktree` e `branch`** — a retomada precisa voltar ao **mesmo** worktree. Criar um novo perderia o código já escrito.

## Escrita atômica — a parte que as pessoas pulam

```
write(manifest.tmp) → fsync → rename(manifest.tmp → manifest.json)
```

`rename` é atômico no mesmo filesystem. Sem isso, um kill no meio do write deixa o manifesto corrompido — e aí você não perdeu uma fase, perdeu a tarefa inteira, e pior: perdeu a capacidade de saber o que já tinha sido feito.

Mesma regra para os artefatos: escreve `.tmp`, depois renomeia. **Um artefato só existe se está completo.**

## O protocolo de retomada

```
retomar(task_id):
  1. carrega manifest.json           ← ausente/corrompido → recomeça do zero, log de aviso
  2. relê a task no ClickUp
  3. requisito_hash mudou?           → invalida fase ≥ 2, replaneja
  4. worktree existe e é da branch?  → não: recria do baseBranch, invalida fase ≥ 6
  5. para cada fase com status "ok":
       artefato existe? sha256 bate? → não: invalida esta e todas as seguintes
  6. fase com status "em_curso"      → sempre invalidada (nunca se sabe onde parou)
  7. lease expirado + outro worker   → aborta, não rouba a tarefa
  8. retoma na primeira fase inválida
```

**Regra de ouro: invalidar uma fase invalida todas as posteriores.** Se a Fase 3 caiu, o plano mudou, e o código da Fase 6 foi escrito contra o plano antigo. Retomar da 7 entregaria código órfão de plano. Isso é o erro mais provável de uma implementação apressada de resume.

## Onde a retomada NÃO é permitida

Duas situações em que retomar é pior que recomeçar:

- **Depois do push.** Passou do push, existe branch remota e possivelmente PR. Retomar viraria segundo push na mesma branch, e a regra de push único (§7) é o que garante que `--force` nunca seja necessário. Falhou depois do push → intervenção humana, sempre.
- **Freeze violado.** Se um teste foi adulterado, todo o trabalho daquela execução é suspeito. Descarta o worktree, `ia-bloqueada`, tentativa nova do zero.

## Duas camadas de estado, papéis distintos

| | Redis | `.tasks/<ID>/manifest.json` |
|---|---|---|
| Responde | *quais tarefas existem e quem as tem* | *onde esta tarefa parou* |
| Escopo | global, todas as tarefas | local, uma tarefa |
| Vive em | servidor | dentro do worktree |
| Perder significa | reconciliação no boot resolve | **a tarefa recomeça do zero** |

Redis guarda lease, fila, circuit breaker, custo global. **Não guarda progresso de fase** — isso vive junto dos artefatos que descreve, senão os dois divergem e o manifesto que importa é o que está ao lado dos arquivos.

**Reconciliação no boot:** tarefas em status de IA sem lease ativo → tenta retomar pelo manifesto; sem manifesto válido → volta para `pronto pra executar` com comentário explicando.

## Kill switch com parada limpa

```
touch /var/pipeline/STOP
```

Verificado **entre fases**, não no meio de uma. A fase corrente termina, escreve seu artefato e o manifesto, e só então o orquestrador para. Uma tarefa parada assim retoma sem perder nada.

Para emergência real (`STOP-NOW`), mata no meio — e a fase `em_curso` é invalidada na retomada, custando uma fase de retrabalho. É a diferença entre parar de propósito e parar de urgência, e as duas precisam existir.

---

# 12. Report — o que o pipeline mostra sobre si mesmo

Requisito: **todo ponto reportado.** Três níveis, audiências diferentes.

## Nível 1 — Por fase (`report.jsonl`)

Uma linha por fase, formato do §10. Append-only, dentro do worktree. É a matéria-prima de tudo abaixo.

## Nível 2 — Por tarefa (comentário no ClickUp + corpo do PR)

Gerado ao final, some ao que `documentar` já produz:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 EXECUÇÃO AUTÔNOMA — CU-86abc1234
   Repo: api-adonis · Branch: ia/86abc1234-pdf-vazio
   Duração: 38min · Custo: US$ 1,87 · Tentativa 1/3
   Retomadas: 1 (restart às 02:31, retomou da fase 6)

FASES
  ✓ 1  Leitura                   12s    $0.02
  ✓ 1b Contexto do repo          31s    $0.04   3 commits, 1 stack trace
  ✓ 2  Completude                48s    $0.08   7/7 critérios
  ✓ 3  Plano                    3m02s   $0.55   4 etapas · 2 caracterizações declaradas
  ✓ 3b Validação (determinística) 1s     —      7/7 checks
  ✓ 4  Plano de teste           1m14s   $0.11   ⚠ isolado do plano de dev
  ✓ 5  Testes gerados           2m41s   $0.19   6 cenários
  ✓ 5b Red check                 22s     —      falhou como esperado ✓
  ✓ 6  Desenvolvimento         17m44s   $0.41   1 arquivo · iteração 2/5
  ✓ 7  Execução dos testes      4m18s   $0.06   6/6 · 1 flaky em quarentena
  ✓ 8  Revisão adversarial      3m50s   $0.38   2 apontamentos, 0 bloqueantes
  ✓ 9  Documentação             2m10s   $0.13
  ✓ 10 PR aberto                  8s    $0.01   #1247 (draft)

GATES DO VERDE                          DIVERGÊNCIAS
  ✓ freeze intacto                        ⚠ Test Author cobriu cenário
  ✓ typecheck limpo                         ausente do plano de dev:
  ✓ testes do módulo                        "PDF com 0 páginas"
  ✓ testes da tarefa                        → revisar
  ✓ red check
  ✓ caracterização sem regressão
  ✓ declaradas quebraram (2/2)
  ✓ mutation score 64% (era 62%)

O QUE OS AUTOMATISMOS NÃO VERIFICAM
  • se o requisito foi entendido corretamente
  • impacto em consumidores externos do contrato
  • decisões de arquitetura
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**A coluna "DIVERGÊNCIAS" é o item mais valioso do report.** É onde o isolamento do §10 vira informação: o Test Author testou algo que o Planner não previu. Nenhum gate reprova isso — e é exatamente o tipo de coisa que o revisor humano precisa ver.

## Nível 3 — Diário e semanal

**Diário (Slack, 1×/dia):** tarefas processadas, PRs abertos, bloqueios por tipo, custo do dia, saldo do teto mensal.

**Notificação imediata só para três coisas:** circuit breaker aberto, teto de custo batido, falha de credencial. Slack a cada bloqueio significa que em uma semana ninguém lê.

---

# 13. Regras invioláveis

Nenhum agente pode aprovar, mesmo com tudo verde.

| Regra | Onde |
|---|---|
| ❌ Merge automático | conta bot sem permissão + `gh pr create` apenas |
| ❌ Deploy | fora do escopo |
| ❌ Qualquer acesso a produção | rede `internal`, sem secrets de prod |
| ❌ Migration destrutiva | regex no diff → sempre humano |
| ❌ Auth, billing, pagamento | path proibido + CODEOWNERS |
| ❌ Alteração de dependência major | bloqueia |
| ❌ Agente editando o próprio pipeline | path proibido — **inclui `~/.claude/plugins/`** |
| ❌ **Agente editando o manifesto** | **path proibido — §11** |
| ❌ Cross-repo e cross-org | exige PRs coordenados |
| ❌ Hotfix (sai de `master`) | risco alto |
| ❌ `git push --force` | sem exceção, garantido pelo push único |

**Path proibido inclui o próprio plugin.** O agente roda com Write e Edit; o plugin é um diretório de markdown no disco. Um agente que edita `skills/executar-testes/SKILL.md` remove o teto de 2 tentativas e ninguém percebe — o comportamento simplesmente muda na próxima tarefa.

**Path proibido inclui o manifesto.** O manifesto é escrito pelo orquestrador, nunca pelos subagentes. Um agente que escreve `"status": "ok"` numa fase que falhou contorna todos os gates de uma vez — é o equivalente de estado ao freeze de testes.

**Sandbox:** container efêmero, usuário sem privilégio, `cap_drop: ALL`, banco de teste em tmpfs, rede `internal: true`, allowlist de bash no PATH (bloqueia inclusive `chmod` em `*.spec.ts`, que contornaria o freeze).

Nunca confie só na config do agente — ela vive no mesmo lugar onde o agente opera. `--disallowedTools` é a segunda camada; a primeira é a allowlist do container.

---

# 14. Operação

| Controle | Valor inicial |
|---|---|
| Concorrência | 1 |
| Iterações máximas | 5 |
| Timeout por tarefa | 45 min |
| Budget de tokens/tarefa | teto configurado |
| **Teto de custo diário e mensal** | pausa ao bater |
| **PRs abertos simultâneos** | **5** |
| Circuit breaker | 3 bloqueios seguidos |
| Lease TTL | 60 min |
| Reentradas por tarefa | 3 |
| **Retomadas por tarefa** | **5** (distinto de reentradas — §7) |
| Horário | **comercial primeiro** |

**O limite de PRs abertos é o freio mais importante.** Sem ele o pipeline produz mais rápido do que o time consome, e o gargalo fica invisível até virar 15 PRs velhos com conflito.

**PR parado:** 7 dias sem review → cobra no Slack. 14 dias → fecha, deleta branch, tarefa volta para `ia-aguardando-info`.

**Teto de custo é uma parada limpa, não um crash.** Bateu o teto → termina a fase corrente, salva o manifesto, para. No dia seguinte retoma exatamente de onde parou. Sem retomada, um teto de custo desperdiçaria todo o trabalho já pago.

**Dono:** uma pessoa responsável. "Roda sozinho" não significa "não tem dono". Se ela sair de férias sem substituto, **desligue**.

## Ritual semanal — 30 min, sexta

Todas as métricas saem do `report.jsonl` (§12) — nenhuma é estimada.

| Métrica | Alerta |
|---|---|
| PRs aceitos sem alteração | **a métrica principal** |
| Taxa `aguardando-info` | > 60% → problema nas tarefas |
| Taxa `ia-bloqueada` | subindo → base ou pipeline |
| Custo por PR aceito | — |
| **Fase que mais consome** | onde otimizar contexto ou trocar modelo |
| **Taxa de retomada** | subindo → instabilidade de infra, não do agente |
| **Divergências Planner × Test Author** | subindo → critérios de aceite ambíguos |
| **Bugs em staging vindos de PR do bot** | subindo → **problema nos gates**, não no agente |

## Quando um PR do bot causa problema

Duas ações obrigatórias:
1. Linha nova no checklist do Revisor (fase 8)
2. Linha nova em "Armadilhas conhecidas" do `CLAUDE.md` do repo

O checklist do revisor é o único lugar do sistema que aprende com o histórico. Sem isso, o mesmo erro repete.

---

# 15. Ordem de construção

| # | Componente | Semana | Estado | Por quê |
|---|---|---|---|---|
| 1 | `configurar-projeto` nos repos | 1 | ✅ existe | um comando, não um projeto |
| 2 | `CLAUDE.md` nos repos | 1 | construir | ganho hoje, sem pipeline |
| 3 | `dominios.yaml` + campos custom | 1 | construir | roteamento depende |
| 4 | CI mínimo | 1 | construir | testes precisam rodar em algum lugar |
| 5 | **Medir `analisar-task` em 20 tarefas** | 2 | ✅ existe | **o checkpoint que decide o projeto** |
| 6 | Vitest + Stryker no repo piloto | 3 | construir | sem isso não há gate de v0 |
| 7 | Guards (freeze com hash, hard stops, progresso) | 3 | construir | calibrar antes de automatizar |
| 8 | **Manifesto + escrita atômica + retomada** | 3 | construir | **antes do daemon: sem isso toda parada custa a tarefa inteira** |
| 9 | Sandbox + health check do dev server | 4 | construir | isolamento antes de autonomia |
| 10 | **Skill `/caracterizar` + v0 autônoma** | 5–8 | construir | constrói o ativo que a v1 precisa |
| 11 | `report.jsonl` + report por tarefa | 5 | construir | junto com a v0 — é o primeiro consumidor |
| 12 | Roteamento de repo, worktree, baseline | 9 | construir | — |
| 13 | Modo `--autonomo` (4 paradas → gates) | 9 | construir | §2 |
| 14 | Subagentes 1b, 3b, 5b, 8 + isolamentos | 10 | construir | §10 |
| 15 | Orquestrador (daemon, claim, lease, breaker) | 10 | construir | só faz sentido com o resto pronto |
| 16 | Red check + inversão dev/teste + `caracterizacao_afetada[]` | 10 | construir | o fluxo em si |
| 17 | `pr.ts` (publicação) | 11 | construir | **último: é o único que escreve fora do disco** |

**Por que o manifesto vem na Semana 3, antes do daemon:** ele é útil no modo assistido também. Uma sessão interrompida hoje já perde tudo. E construir retomada depois do daemon significa retrofitar estado em código que assumiu execução contínua — sempre mais caro.

Cada etapa entrega valor sozinha. Se você parar na 10, ainda ganhou uma suíte de testes que não existia. Isso não é motivacional — é proteção: projeto que só entrega valor no fim é projeto que morre no meio.

---

# 16. Checklist antes de ligar

- [ ] Semana 2 concluída: taxa de reprovação do `analisar-task` abaixo de 60%
- [ ] Mutation score ≥ 60% em pelo menos 3 módulos
- [ ] CI mínimo rodando testes no PR
- [ ] Guards calibrados contra PRs históricos
- [ ] **Freeze por hash implementado e testado** (não só a instrução em prompt)
- [ ] **Manifesto com escrita atômica; retomada testada com `kill -9` no meio de cada fase**
- [ ] **Invalidação em cascata verificada** (invalidar fase N invalida N+1..)
- [ ] **`requisito_hash` invalidando plano quando a task muda durante a pausa**
- [ ] **Health check do dev server substituindo a confirmação manual da Fase 7**
- [ ] **`caracterizacao_afetada[]` validado contra a suíte real**
- [ ] **Isolamentos verificados:** Test Author sem plano, Revisor sem texto da tarefa
- [ ] **`report.jsonl` emitindo linha por fase, com custo**
- [ ] **Paths proibidos incluem o plugin e o manifesto**
- [ ] Branch protection; bot sem permissão de merge nem de aprovar o próprio PR
- [ ] `validateCredentials()` passando no boot
- [ ] Conta bot separada, PAT fine-grained restrito à allowlist
- [ ] `gitleaks` no gate obrigatório
- [ ] Teto de custo diário e mensal configurados
- [ ] Kill switch (`STOP` limpo e `STOP-NOW`) acessível do celular
- [ ] Dono definido
- [ ] Estado em Redis, com reconciliação no boot
- [ ] Horário comercial. 24h só depois de 2 semanas estáveis.

---

# 17. Os quatro erros mais prováveis

**1. Construir tudo e ligar.** Quando algo der errado — e vai — você não saberá qual das 17 peças causou.

**2. Pular a Semana 2** por parecer pouco trabalho. É exatamente a semana que responde se vale construir o resto — e agora ela custa um dia, porque a skill já existe.

**3. Confundir o que o plugin instrui com o que ele garante.** "Corrija o código da aplicação, não o teste", "não implemente nada fora do plano", "nunca fabrique dados da task" — são as regras certas, escritas no lugar certo, e valem enquanto o agente coopera. No uso assistido você é o guard. No autônomo, às 3h da manhã, não há guard nenhum. **Toda regra do plugin que você quiser manter no modo autônomo precisa de uma contraparte determinística.**

**4. Implementar retomada como "o arquivo existe, então pula a fase".** É o atalho natural e produz o pior bug do sistema: uma fase que abortou no meio parece concluída, a seguinte roda sobre um artefato truncado, e o PR sai com código escrito contra um plano pela metade. Retomada exige as três coisas juntas — hash de integridade, invalidação em cascata, e escrita atômica. Duas de três não é retomada, é corrupção com aparência de continuidade.

---

# 18. O que o pipeline nunca garante

- Que o requisito foi entendido corretamente
- Impacto em consumidores externos do contrato
- Decisões de arquitetura

Esses três estão escritos no corpo de todo PR gerado. São o motivo de a revisão humana continuar sendo o portão final, e de o merge nunca ser automático.

Testes verdes não dizem nada sobre eles.
