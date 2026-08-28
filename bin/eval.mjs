#!/usr/bin/env node
/**
 * CLI do harness de eval.
 *
 *   node bin/eval.mjs                  roda os casos determinísticos
 *   node bin/eval.mjs --com-agentes    inclui casos que invocam LLM (custa $)
 *   node bin/eval.mjs --baseline       grava o resultado atual como referência
 *   node bin/eval.mjs --tipo plano     filtra por tipo
 *
 * Sai com código 1 se houver falha ou regressão — serve de gate em CI.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { carregarCasos, rodar, resumir, renderizar, salvarBaseline, compararBaseline } from '../evals/runner.mjs';
import '../evals/executores.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const BASELINE = join(RAIZ, 'evals', 'baseline.json');

const args = process.argv.slice(2);
const comAgentes = args.includes('--com-agentes');
const gravarBaseline = args.includes('--baseline');
const tipoFiltro = args.includes('--tipo') ? args[args.indexOf('--tipo') + 1] : null;

let casos = carregarCasos();
if (tipoFiltro) casos = casos.filter((c) => c.tipo === tipoFiltro);

if (!casos.length) {
  console.error('Nenhum caso encontrado em evals/casos/');
  process.exit(1);
}

const resultados = await rodar({ casos, comAgentes });
const resumo = resumir(resultados);

console.log(renderizar(resultados, resumo));

const cmp = compararBaseline(resultados, BASELINE);
if (cmp.existe) {
  console.log('');
  console.log(`Baseline de ${cmp.em.slice(0, 16).replace('T', ' ')}`);
  if (cmp.regressoes.length) {
    console.log('  REGRESSÕES:');
    for (const r of cmp.regressoes) console.log(`    ✗ ${r.nome}  (${r.de} → ${r.para})`);
  }
  if (cmp.melhorias.length) {
    console.log('  Melhorias:');
    for (const m of cmp.melhorias) console.log(`    ✓ ${m.nome}  (${m.de} → ${m.para})`);
  }
  if (cmp.novos.length) console.log(`  Novos: ${cmp.novos.length} caso(s) sem baseline`);
  if (!cmp.regressoes.length && !cmp.melhorias.length && !cmp.novos.length) {
    console.log('  sem mudança');
  }
}

if (gravarBaseline) {
  salvarBaseline(resultados, BASELINE);
  console.log(`\nBaseline gravada em evals/baseline.json`);
}

const falhou = resumo.falhou > 0 || resumo.erro > 0 || (cmp.existe && cmp.regressoes.length > 0);
process.exit(falhou ? 1 : 0);
