/**
 * Report — o que o pipeline mostra sobre si mesmo.
 *
 * Sem isto o pipeline é opaco: você sabe que a tarefa falhou, não sabe onde
 * nem quanto custou. O report.jsonl é a fonte de TODAS as métricas do ritual
 * semanal — sem ele, aquelas métricas são estimativa.
 *
 * Append-only, uma linha por fase, dentro do diretório da task.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { FASES } from './manifest.mjs';

export function caminhoReport(tasksDir, taskId) {
  return join(tasksDir, taskId, 'report.jsonl');
}

export function registrar(tasksDir, taskId, entrada) {
  const p = caminhoReport(tasksDir, taskId);
  mkdirSync(dirname(p), { recursive: true });
  appendFileSync(p, JSON.stringify({ em: new Date().toISOString(), ...entrada }) + '\n');
}

export function ler(tasksDir, taskId) {
  const p = caminhoReport(tasksDir, taskId);
  if (!existsSync(p)) return [];
  return readFileSync(p, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function dur(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`;
}

function usd(v) {
  return v == null ? '—' : `$${v.toFixed(2)}`;
}

/**
 * Report por tarefa — vai no corpo do PR e como comentário no ClickUp.
 */
export function renderizarTarefa({ manifesto, linhas, gates = {}, divergencias = [], prUrl = null }) {
  const porFase = new Map();
  for (const l of linhas) if (l.fase) porFase.set(l.fase, l);

  const fases = FASES.filter((f) => porFase.has(f.id)).map((f) => {
    const l = porFase.get(f.id);
    const ok = l.status === 'ok';
    const nome = f.nome.padEnd(20);
    return `  ${ok ? '✓' : '✗'} ${f.id.padEnd(3)} ${nome} ${dur(l.duracao_ms).padStart(7)}  ${usd(l.custo_usd).padStart(6)}  ${l.observacao ?? ''}`.trimEnd();
  });

  const gateLinhas = Object.entries(gates).map(
    ([k, v]) => `  ${v.ok ? '✓' : '✗'} ${k}${v.detalhe ? ` — ${v.detalhe}` : ''}`
  );

  const divLinhas = divergencias.length
    ? divergencias.map((d) => `  ⚠ ${d}`)
    : ['  (nenhuma)'];

  const totalMs = linhas.reduce((a, l) => a + (l.duracao_ms ?? 0), 0);

  return [
    '━'.repeat(60),
    `🤖 EXECUÇÃO AUTÔNOMA — ${manifesto.task_id}`,
    `   Repo: ${manifesto.repo} · Branch: ${manifesto.branch}`,
    `   Duração: ${dur(totalMs)} · Custo: ${usd(manifesto.custo_acumulado_usd)} · Tentativa ${manifesto.tentativas}`,
    manifesto.retomadas > 0
      ? `   Retomadas: ${manifesto.retomadas}`
      : '   Retomadas: nenhuma',
    '',
    'FASES',
    ...fases,
    '',
    'GATES DO VERDE',
    ...(gateLinhas.length ? gateLinhas : ['  (nenhum avaliado)']),
    '',
    'DIVERGÊNCIAS',
    ...divLinhas,
    '',
    'O QUE OS AUTOMATISMOS NÃO VERIFICAM',
    '  • se o requisito foi entendido corretamente',
    '  • impacto em consumidores externos do contrato',
    '  • decisões de arquitetura',
    prUrl ? `\nPR: ${prUrl}` : '',
    '━'.repeat(60),
  ]
    .filter((l) => l !== '')
    .join('\n');
}
