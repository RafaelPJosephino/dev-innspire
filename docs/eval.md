# Spec-Driven Development e Harness de Eval

Duas peças que faltavam, e o que cada uma resolve.

---

# 1. Spec-Driven Development

## O problema

O plano técnico da Fase 3 era **markdown livre**, e o validador tentava adivinhar a intenção com regex — procurava crases, cabeçalhos, listas. Isso é o oposto de spec-driven: escrever um parser para inferir o que um LLM quis dizer em prosa.

O sintoma era concreto. O check "arquivos citados existem" tinha este escape:

```js
add('arquivos citados existem',
    inexistentes.length === 0 || Boolean(novosDeclarados),  // ← desliga o gate
    ...)
```

Ele existia porque em texto livre **não há como distinguir** "arquivo que vou criar" de "arquivo cujo nome eu errei". Bastava o plano mencionar "criar" em qualquer lugar para o gate parar de valer — inclusive no caso que ele existe para pegar: o agente entrou no repo errado, não achou o módulo, e concluiu que precisava criá-lo.

O mesmo valia para `caracterizacao_afetada[]` — o contrato bidirecional mais importante do pipeline dependia de o Planner escrever um cabeçalho que o regex reconhecesse.

## A solução

O plano passa a ser **JSON validado contra um schema**. `lib/spec/plano.schema.mjs` é a fonte:

```json
{
  "schema": 1,
  "contexto": "...",
  "etapas": [{
    "titulo": "...",
    "o_que_fazer": "...",
    "arquivos": [{ "caminho": "app/services/pdf.service.ts", "acao": "modificar" }],
    "criterio_conclusao": "..."
  }],
  "duvidas_em_aberto": [],
  "caracterizacao_afetada": [{ "teste": "...", "por_que": "..." }]
}
```

O que isso destrava, check por check:

| Antes (regex sobre prosa) | Agora (spec) |
| --- | --- |
| "arquivo existe?" com escape que desligava o gate | `acao: criar` → **não pode** existir; `modificar` → **precisa** existir |
| `duvidas` comparado contra "nenhuma", "nenhum", "n/a", "-", … | `duvidas_em_aberto.length === 0` |
| `caracterizacao` dependia de o cabeçalho casar | lista tipada, validada contra a suíte real |
| migration destrutiva varria o texto inteiro | varre só os campos de prosa — sem falso positivo vindo de caminho de arquivo |

**O markdown continua existindo** — para humano ler no PR e no ClickUp — mas é **derivado** do JSON por `renderizarMarkdown()`, nunca a fonte.

## Detalhes que importam

**Sem dependências.** Puxar `ajv` para validar quatro schemas estáveis custaria mais em superfície do que resolve. Estes schemas *são* o contrato do pipeline: se mudam, é decisão de projeto, não upgrade transitivo.

**Erros são caminhados.** A mensagem volta para um LLM que precisa consertar o próprio output:

```
$.etapas[0].arquivos[0].acao: valor "editar" fora de [criar, modificar, deletar]
```

"campo inválido" não ajuda ninguém.

**`extrairJson()` é tolerante.** Modelos cercam JSON em markdown ou escrevem uma frase antes. Rejeitar isso trocaria um problema real por um de etiqueta, então tenta: JSON puro → bloco cercado → primeiro objeto balanceado (respeitando chaves dentro de strings).

**O exemplo vai no prompt.** `PLANO_EXEMPLO` é injetado na Fase 3 — um exemplo comunica melhor que qualquer descrição campo a campo.

---

# 2. Harness de Eval

## O problema

Não havia nenhum. Os testes cobriam os *guards* — código determinístico. Nada cobria se uma mudança em `agents/reviewer.md` melhorou ou piorou as coisas.

Sem eval, editar um prompt é uma aposta: você só descobre em produção.

## Como usar

```bash
node bin/eval.mjs                  # casos determinísticos — rápido, grátis, CI
node bin/eval.mjs --com-agentes    # inclui casos que invocam LLM (custa $)
node bin/eval.mjs --baseline       # grava o resultado atual como referência
node bin/eval.mjs --tipo plano     # filtra
```

Sai com **código 1** se houver falha ou **regressão** — serve de gate em CI.

## O que ele mede

22 casos em cinco tipos, mais invariantes:

| Tipo | Mede |
| --- | --- |
| `plano` | o gate da Fase 3b reprova o que deve e aprova o que deve |
| `spec` | o schema aceita o válido, rejeita o inválido, com caminho no erro |
| `isolamento` | cada fase vê exatamente o que deve, e nada além |
| `freeze` | detecta teste alterado, removido e criado durante o loop |
| `no-progress` | corta o que não anda, deixa passar o que anda |
| `invariante` | propriedades que valem para **qualquer** fase, presente ou futura |

**Invariantes merecem destaque.** Um caso por fase testa uma fase; um invariante testa a propriedade:

```json
{
  "nome": "nenhuma fase de teste ve o plano de dev (invariante)",
  "fases": ["4", "5"],
  "artefato_proibido": "03-technical-plan.json",
  "esperado": { "violacoes": [] }
}
```

Uma fase nova que violasse a regra passaria despercebida por casos individuais. O invariante pega.

## Regressão é o sinal que importa

Um eval que só reporta valor absoluto não responde "minha mudança piorou alguma coisa?". A comparação com baseline responde:

```
Baseline de 2026-08-28 18:21
  REGRESSÕES:
    ✗ fase 4 (test-planner) nao ve o plano tecnico  (passou → falhou)
```

Isso foi produzido de propósito, adicionando `03-technical-plan.json` ao contrato da fase 4 — o eval pegou o enfraquecimento do isolamento mais importante do pipeline. Uma segunda sabotagem (desligar o gate de dúvidas em aberto) também foi detectada, com `exit 1`.

## Comparação por chave, não igualdade profunda

```json
"esperado": { "aprovado": false, "checks_falhos": ["sem dúvidas em aberto"] }
```

Um eval que quebra porque a mensagem de erro mudou de texto mede **formatação**, não comportamento — e aí as pessoas passam a ignorá-lo. Listas são comparadas por conter, não por igualdade.

---

## ⚠️ A ressalva honesta: os casos atuais são sintéticos

**Todos os 22 casos foram escritos por quem escreveu o pipeline.** Um eval calibrado contra casos inventados dá confiança falsa, que é pior que não ter eval.

Por isso todo relatório marca a proveniência e separa no resumo:

```
  22/22 passou
  sintetico  22/22  ← escrito por quem fez o pipeline

  Nenhum caso real ainda.
```

O `~` ao lado de cada caso é a marca de sintético.

**O que esses casos realmente cobrem:** que os *guards determinísticos* se comportam como especificado, e que uma mudança futura não os enfraquece silenciosamente. Isso tem valor real — as duas sabotagens acima foram pegas.

**O que eles não cobrem:** se os *agentes* produzem bom trabalho. Nenhum caso invoca LLM ainda.

## Como os casos reais entram

O plano ([`pipeline-autonomo.md`](./pipeline-autonomo.md), Semana 2) manda rodar `/analisar-task` contra **20 tarefas reais** antes de construir o resto. Essas são as referências de verdade: resultado conhecido, de graça, sem inventar nada.

Quando existirem, entram em `evals/casos/` com `"proveniencia": "real"` e o runner passa a reportá-las em separado — **sem nenhuma mudança de código**.

É também por isso que a recomendação de ordem não mudou: medir a Fase 0 contra tarefas reais continua sendo o próximo passo, e agora ele rende duas coisas ao invés de uma.
