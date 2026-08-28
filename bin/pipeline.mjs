#!/usr/bin/env node
/**
 * CLI do pipeline autônomo.
 *
 *   node bin/pipeline.mjs run    CU-123 [--repo-root .] [--teto-custo 5]
 *   node bin/pipeline.mjs status CU-123
 *   node bin/pipeline.mjs doctor
 */

import { executar, status } from '../lib/autonomo/orquestrador.mjs';
import { verificarDisponibilidade } from '../lib/autonomo/invocar.mjs';
import { validarContrato, CONTRATO } from '../lib/autonomo/isolamento.mjs';
import { FASES } from '../lib/autonomo/manifest.mjs';

const [, , cmd, taskId, ...resto] = process.argv;

function flag(nome, padrao = null) {
  const i = resto.indexOf(`--${nome}`);
  return i >= 0 ? resto[i + 1] : padrao;
}

function uso() {
  console.log(`
Pipeline autônomo — dev-innspire

  run <TASK_ID>       inicia ou retoma a execução
  status <TASK_ID>    mostra onde parou
  doctor              verifica pré-requisitos

Opções de run:
  --repo-root <dir>     raiz do repositório alvo (padrão: cwd)
  --tasks-dir <dir>     onde vive o estado (padrão: .tasks)
  --teto-custo <usd>    parada limpa ao atingir
  --tipo <tipo>         bug-fix | feature | chore
  --manter-dirs         não apaga os diretórios isolados (debug)

Ambiente:
  CLAUDE_BIN            caminho do CLI, se não estiver no PATH
  PIPELINE_STOP         kill switch limpo   (padrão /var/pipeline/STOP)
  PIPELINE_STOP_NOW     kill switch urgente (padrão /var/pipeline/STOP-NOW)
`);
}

if (cmd === 'doctor') {
  const d = await verificarDisponibilidade();
  console.log(`Claude CLI : ${d.ok ? '✓' : '✗'} ${d.bin}${d.versao ? ' (' + d.versao + ')' : ''}`);
  if (!d.ok) console.log('             defina CLAUDE_BIN com o caminho do executável');

  const c = validarContrato(FASES);
  console.log(`Contrato   : ${c.ok ? '✓' : '✗'} ${Object.keys(CONTRATO).length} fases mapeadas`);
  if (!c.ok) {
    if (c.semContrato.length) console.log(`             sem contrato: ${c.semContrato.join(', ')}`);
    if (c.orfaos.length) console.log(`             órfãos: ${c.orfaos.join(', ')}`);
  }

  console.log('\nIsolamento por fase:');
  for (const f of FASES) {
    const ct = CONTRATO[f.id];
    if (!ct) continue;
    console.log(`  ${f.id.padEnd(3)} ${(ct.agente ?? '(determinística)').padEnd(22)} lê: ${ct.le.length ? ct.le.join(', ') : '—'}`);
  }
  process.exit(d.ok && c.ok ? 0 : 1);
}

if (cmd === 'status') {
  if (!taskId) { uso(); process.exit(1); }
  const s = await status({ taskId, tasksDir: flag('tasks-dir', '.tasks') });
  if (!s.existe) { console.log(`Sem manifesto para ${taskId} — execução nunca iniciada.`); process.exit(0); }
  console.log(`Task       : ${s.manifesto.task_id}`);
  console.log(`Branch     : ${s.manifesto.branch ?? '—'}`);
  console.log(`Custo      : $${s.manifesto.custo_acumulado_usd.toFixed(2)}`);
  console.log(`Retomadas  : ${s.manifesto.retomadas ?? 0}`);
  console.log(`Pushed     : ${s.manifesto.pushed ? 'sim (retomada bloqueada)' : 'não'}`);
  console.log('\nFases:');
  for (const f of FASES) {
    const r = s.manifesto.fases[f.id];
    const icone = !r ? '·' : r.status === 'ok' ? '✓' : r.status === 'em_curso' ? '↻' : '✗';
    console.log(`  ${icone} ${f.id.padEnd(3)} ${f.nome.padEnd(22)} ${r?.status ?? 'pendente'}`);
  }
  if (s.plano.permitido && s.plano.retomarDe) console.log(`\n▶ Retomaria da fase ${s.plano.retomarDe}`);
  else if (s.plano.completo) console.log('\n✓ Todas as fases concluídas');
  else if (!s.plano.permitido) console.log(`\n✗ Retomada bloqueada: ${s.plano.motivo}`);
  process.exit(0);
}

if (cmd === 'run') {
  if (!taskId) { uso(); process.exit(1); }
  const r = await executar({
    taskId,
    tasksDir: flag('tasks-dir', '.tasks'),
    repoRoot: flag('repo-root', process.cwd()),
    opcoes: {
      tetoCustoUsd: flag('teto-custo') ? Number(flag('teto-custo')) : undefined,
      tipoTarefa: flag('tipo', 'default'),
      manterDirs: resto.includes('--manter-dirs'),
    },
  });
  if (!r.ok) {
    console.error(`\n✗ ${r.motivo}`);
    if (r.statusClickUp) console.error(`  status sugerido no ClickUp: ${r.statusClickUp}`);
    process.exit(1);
  }
  if (r.parado) { console.log(`\n□ Parado (${r.motivo}) — retomável`); process.exit(0); }
  process.exit(0);
}

uso();
process.exit(1);
