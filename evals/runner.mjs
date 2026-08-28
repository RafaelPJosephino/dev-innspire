/**
 * Harness de eval — mede se uma mudança nos agentes melhorou ou piorou.
 *
 * Sem isto, editar `agents/reviewer.md` é uma aposta: não há como saber se
 * ficou melhor a não ser rodando em produção e esperando. Os testes dos guards
 * cobrem código determinístico; nada cobria o comportamento dos agentes.
 *
 * ## Uma ressalva honesta sobre os casos atuais
 *
 * Os casos em `casos/` são SINTÉTICOS — escritos por quem escreveu o pipeline.
 * Um eval calibrado contra casos inventados dá confiança falsa, que é pior que
 * não ter eval. Por isso todo relatório marca a proveniência de cada caso, e o
 * resumo separa `sintetico` de `real`.
 *
 * O plano (docs/pipeline-autonomo.md, Semana 2) manda rodar `analisar-task`
 * contra 20 tarefas reais antes de construir o resto. ESSAS são os casos de
 * referência de verdade — com resultado conhecido, de graça, sem inventar
 * nada. Quando existirem, entram em `casos/` com `proveniencia: "real"` e o
 * runner passa a reportá-las em separado, sem nenhuma mudança de código.
 *
 * ## Dois modos
 *
 *   --deterministico  (padrão) só casos que não invocam LLM. Rápido, grátis,
 *                     roda em CI. Cobre os gates e a spec.
 *   --com-agentes     invoca os subagentes de verdade. Custa dinheiro e exige
 *                     CLAUDE_BIN. É o modo que mede prompt.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

export function carregarCasos(dir = join(AQUI, 'casos')) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const caso = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      return { arquivo: f, ...caso };
    });
}

/**
 * Compara resultado obtido com o esperado.
 *
 * O esperado é declarado por CHAVE, não por igualdade profunda: um eval que
 * quebra porque a mensagem de erro mudou de texto mede formatação, não
 * comportamento — e aí as pessoas passam a ignorá-lo.
 */
function comparar(obtido, esperado) {
  const falhas = [];
  for (const [chave, valorEsperado] of Object.entries(esperado)) {
    const valorObtido = chave.split('.').reduce((o, k) => o?.[k], obtido);

    if (Array.isArray(valorEsperado)) {
      const set = new Set(Array.isArray(valorObtido) ? valorObtido : []);
      const faltando = valorEsperado.filter((v) => !set.has(v));
      if (faltando.length) falhas.push(`${chave}: faltando [${faltando.join(', ')}]`);
    } else if (valorObtido !== valorEsperado) {
      falhas.push(`${chave}: esperado ${JSON.stringify(valorEsperado)}, obtido ${JSON.stringify(valorObtido)}`);
    }
  }
  return falhas;
}

/** Registro de executores por tipo de caso. */
const EXECUTORES = {};

export function registrarExecutor(tipo, fn) {
  EXECUTORES[tipo] = fn;
}

export async function rodar({ casos, comAgentes = false, contexto = {} }) {
  const resultados = [];

  for (const caso of casos) {
    if (caso.requer_llm && !comAgentes) {
      resultados.push({ ...caso, status: 'pulado', motivo: 'requer --com-agentes' });
      continue;
    }

    const exec = EXECUTORES[caso.tipo];
    if (!exec) {
      resultados.push({ ...caso, status: 'erro', motivo: `sem executor para tipo "${caso.tipo}"` });
      continue;
    }

    const inicio = Date.now();
    try {
      const obtido = await exec(caso, contexto);
      const falhas = comparar(obtido, caso.esperado);
      resultados.push({
        ...caso,
        status: falhas.length ? 'falhou' : 'passou',
        falhas,
        obtido,
        duracaoMs: Date.now() - inicio,
      });
    } catch (e) {
      resultados.push({ ...caso, status: 'erro', motivo: e.message, duracaoMs: Date.now() - inicio });
    }
  }

  return resultados;
}

export function resumir(resultados) {
  const porProveniencia = {};
  for (const r of resultados) {
    const p = r.proveniencia ?? 'sintetico';
    porProveniencia[p] ??= { total: 0, passou: 0, falhou: 0, erro: 0, pulado: 0 };
    porProveniencia[p].total++;
    porProveniencia[p][r.status]++;
  }

  const total = resultados.length;
  const passou = resultados.filter((r) => r.status === 'passou').length;
  const avaliados = resultados.filter((r) => r.status !== 'pulado').length;

  return {
    total,
    avaliados,
    passou,
    falhou: resultados.filter((r) => r.status === 'falhou').length,
    erro: resultados.filter((r) => r.status === 'erro').length,
    pulado: resultados.filter((r) => r.status === 'pulado').length,
    taxa: avaliados ? passou / avaliados : 0,
    porProveniencia,
  };
}

export function renderizar(resultados, resumo) {
  const l = [];
  const icone = { passou: '✓', falhou: '✗', erro: '!', pulado: '·' };

  const grupos = {};
  for (const r of resultados) (grupos[r.tipo] ??= []).push(r);

  for (const [tipo, rs] of Object.entries(grupos)) {
    l.push(`\n${tipo}`);
    for (const r of rs) {
      const marca = r.proveniencia === 'real' ? '' : ' ~';
      l.push(`  ${icone[r.status]} ${r.nome}${marca}`);
      if (r.status === 'falhou') for (const f of r.falhas) l.push(`      ${f}`);
      if (r.status === 'erro') l.push(`      ${r.motivo}`);
    }
  }

  l.push('');
  l.push('─'.repeat(58));
  l.push(`  ${resumo.passou}/${resumo.avaliados} passou` + (resumo.pulado ? `  (${resumo.pulado} pulado)` : ''));

  for (const [prov, s] of Object.entries(resumo.porProveniencia)) {
    const nota = prov === 'sintetico' ? '  ← escrito por quem fez o pipeline' : '';
    l.push(`  ${prov.padEnd(10)} ${s.passou}/${s.total - s.pulado}${nota}`);
  }

  if (resumo.porProveniencia.real === undefined) {
    l.push('');
    l.push('  Nenhum caso real ainda. Ver docs/eval.md — a Semana 2 do plano');
    l.push('  produz 20 casos reais de graça, e eles entram sem mudar código.');
  }

  return l.join('\n');
}

export function salvarBaseline(resultados, caminho) {
  mkdirSync(dirname(caminho), { recursive: true });
  const dados = {
    em: new Date().toISOString(),
    resultados: resultados.map((r) => ({ nome: r.nome, tipo: r.tipo, status: r.status })),
  };
  writeFileSync(caminho, JSON.stringify(dados, null, 2) + '\n');
  return dados;
}

/**
 * Compara com a baseline. Regressão é o sinal que importa: um eval que só
 * reporta valor absoluto não responde "minha mudança piorou alguma coisa?".
 */
export function compararBaseline(resultados, caminho) {
  if (!existsSync(caminho)) return { existe: false };
  const base = JSON.parse(readFileSync(caminho, 'utf8'));
  const antes = new Map(base.resultados.map((r) => [r.nome, r.status]));

  const regressoes = [];
  const melhorias = [];
  for (const r of resultados) {
    const a = antes.get(r.nome);
    if (a === undefined) continue;
    if (a === 'passou' && r.status !== 'passou') regressoes.push({ nome: r.nome, de: a, para: r.status });
    if (a !== 'passou' && r.status === 'passou') melhorias.push({ nome: r.nome, de: a, para: r.status });
  }

  const novos = resultados.filter((r) => !antes.has(r.nome)).map((r) => r.nome);
  return { existe: true, em: base.em, regressoes, melhorias, novos };
}
