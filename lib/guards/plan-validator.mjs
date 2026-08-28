/**
 * Validação do plano — Fase 3b, determinística, sem LLM.
 *
 * No modo assistido a Fase 3 pergunta "[1] aprovar / [2] ajustar / [3] cancelar".
 * Trocar isso por "o agente aprova o próprio plano" seria remover o gate, não
 * automatizá-lo. O substituto é validar o plano como CONTRATO: só checagens
 * mecânicas, nenhuma delas passível de ser convencida.
 *
 * Um revisor por IA pode ser persuadido; fs.existsSync não pode.
 *
 * O plano chega como JSON validado contra lib/spec/plano.schema.mjs. A versão
 * anterior deste arquivo parseava markdown com regex — e o custo disso era
 * visível: o check de existência de arquivo tinha um escape que o desligava
 * sempre que o texto mencionasse "criar", porque em prosa não há como separar
 * "arquivo que vou criar" de "arquivo cujo nome eu errei". Com `acao`
 * declarada, isso é dado.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { validarContra, extrairJson, formatarErros } from '../spec/validar.mjs';
import { PLANO_SCHEMA, arquivosDoPlano } from '../spec/plano.schema.mjs';

/** Paths que o pipeline nunca toca, mesmo com tudo verde. */
export const PATHS_PROIBIDOS = [
  /(^|\/)auth\//i,
  /(^|\/)billing\//i,
  /(^|\/)payment(s)?\//i,
  /(^|\/)pipeline\//i,
  // O agente tem Write/Edit e o plugin é markdown no disco. Um agente que
  // edita skills/executar-testes/SKILL.md remove o teto de 2 tentativas e
  // ninguém percebe — o comportamento muda na próxima tarefa.
  /\.claude[\\/]plugins[\\/]/i,
  /(^|\/)agents\/[\w-]+\.md$/i,
  /(^|\/)skills\/[\w-]+\/[\w-]+\.md$/i,
  /(^|\/)lib\/(autonomo|guards|spec)\//i,
  // O manifesto é escrito pelo orquestrador, nunca por um subagente. Escrever
  // "status: ok" numa fase que falhou contorna todos os gates de uma vez.
  /(^|\/)manifest\.json$/i,
];

const MIGRATION_DESTRUTIVA =
  /\b(drop\s+(table|column|database)|truncate\s+table|delete\s+from\s+\w+\s*;|dropColumn|dropTable)\b/i;

/** Teto de arquivos por tipo de tarefa. Plano que estoura virou refactor. */
export const TETO_ARQUIVOS = { 'bug-fix': 5, feature: 12, chore: 8, refactor: 15, default: 8 };

/**
 * @param plano  objeto já parseado, ou a saída crua do Planner
 * @returns { aprovado, checks, plano }
 */
export function validar({
  plano,
  repoRoot,
  tipoTarefa = null,
  suiteDeTestes = [],
  mutationScore = null,
  limiarMutation = 60,
}) {
  const checks = [];
  const add = (nome, ok, detalhe) => checks.push({ nome, ok, detalhe });

  // 0. Conformidade com a spec. Sem isto, nenhum check abaixo tem base.
  let obj = plano;
  if (typeof plano === 'string') {
    const ex = extrairJson(plano);
    if (!ex.ok) {
      add('plano é JSON válido', false, ex.erro);
      return { aprovado: false, checks, plano: null };
    }
    obj = ex.valor;
  }

  const conf = validarContra(obj, PLANO_SCHEMA);
  add('plano conforme a spec', conf.valido, conf.valido ? 'ok' : `${conf.erros.length} erro(s)`);
  if (!conf.valido) {
    return { aprovado: false, checks, plano: obj, errosSchema: conf.erros };
  }

  const arquivos = arquivosDoPlano(obj);
  const tipo = tipoTarefa ?? obj.tipo_tarefa ?? 'default';

  // 1. Arquivos a MODIFICAR ou DELETAR precisam existir; a CRIAR não podem.
  //    A distinção que o parser de prosa não conseguia fazer.
  const modificarInexistente = arquivos
    .filter((a) => a.acao !== 'criar' && !existsSync(join(repoRoot, a.caminho)))
    .map((a) => a.caminho);
  add(
    'arquivos a modificar existem',
    modificarInexistente.length === 0,
    modificarInexistente.length ? `não encontrados: ${modificarInexistente.join(', ')}` : 'ok'
  );

  const criarExistente = arquivos
    .filter((a) => a.acao === 'criar' && existsSync(join(repoRoot, a.caminho)))
    .map((a) => a.caminho);
  add(
    'arquivos a criar não existem',
    criarExistente.length === 0,
    criarExistente.length ? `já existem: ${criarExistente.join(', ')}` : 'ok'
  );

  // 2. Nenhum path proibido
  const proibidos = arquivos.filter((a) => PATHS_PROIBIDOS.some((rx) => rx.test(a.caminho))).map((a) => a.caminho);
  add('nenhum path proibido', proibidos.length === 0, proibidos.length ? proibidos.join(', ') : 'ok');

  // 3. Nenhuma migration destrutiva. Varre só os campos de texto do plano —
  //    o JSON delimita onde a prosa vive, então não há falso positivo vindo
  //    de um caminho de arquivo ou de um nome de teste.
  const prosa = [
    obj.contexto,
    ...obj.etapas.flatMap((e) => [e.titulo, e.o_que_fazer, e.criterio_conclusao]),
    ...(obj.riscos ?? []).flatMap((r) => [r.risco, r.mitigacao]),
  ].join('\n');
  const destrutiva = MIGRATION_DESTRUTIVA.test(prosa);
  add('sem migration destrutiva', !destrutiva, destrutiva ? 'plano menciona DROP/TRUNCATE/DELETE' : 'ok');

  // 4. Dúvidas em aberto.
  //    O gate mais barato e mais subestimado: um plano com dúvida em aberto é
  //    o próprio agente dizendo que vai assumir algo — e assumir sozinho às 3h
  //    da manhã é exatamente o que se quer impedir. Com a spec, é `.length`.
  add(
    'sem dúvidas em aberto',
    obj.duvidas_em_aberto.length === 0,
    obj.duvidas_em_aberto.length ? obj.duvidas_em_aberto.join(' | ').slice(0, 200) : 'ok'
  );

  // 5. Teto de arquivos
  const teto = TETO_ARQUIVOS[tipo] ?? TETO_ARQUIVOS.default;
  const unicos = new Set(arquivos.map((a) => a.caminho));
  add(`≤ ${teto} arquivos (${tipo})`, unicos.size <= teto, `${unicos.size} arquivo(s)`);

  // 6. caracterizacao_afetada[] existe na suíte real.
  //    Nome inventado faria o gate "declaradas quebraram" nunca disparar — e
  //    uma verificação morta é pior que verificação nenhuma, porque você conta
  //    com ela. Pior: é a declaração que autoriza reescrever aquele teste,
  //    então sem validação o agente contornaria o freeze por via indireta.
  if (suiteDeTestes.length) {
    const fantasmas = obj.caracterizacao_afetada
      .map((c) => c.teste)
      .filter((nome) => !suiteDeTestes.some((t) => t.includes(nome) || nome.includes(t)));
    add(
      'caracterizações declaradas existem',
      fantasmas.length === 0,
      fantasmas.length ? `não existem na suíte: ${fantasmas.join(', ')}` : `${obj.caracterizacao_afetada.length} declarada(s)`
    );
  }

  // 7. Elegibilidade por cobertura
  if (mutationScore !== null) {
    add(`mutation score ≥ ${limiarMutation}%`, mutationScore >= limiarMutation, `${mutationScore}%`);
  }

  return { aprovado: checks.every((c) => c.ok), checks, plano: obj };
}

export function formatar({ aprovado, checks, errosSchema }) {
  const linhas = checks.map((c) => `  ${c.ok ? '✓' : '✗'} ${c.nome} — ${c.detalhe}`);
  const cabecalho = aprovado
    ? `✓ FASE 3b — plano aprovado (${checks.length}/${checks.length} checks)`
    : `✗ FASE 3b — plano REPROVADO (${checks.filter((c) => c.ok).length}/${checks.length} checks)`;
  const extra = errosSchema?.length ? ['', 'Erros de schema:', formatarErros(errosSchema)] : [];
  return [cabecalho, ...linhas, ...extra].join('\n');
}
