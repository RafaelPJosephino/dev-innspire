/**
 * Orquestrador — o processo que roda o pipeline.
 *
 * Até aqui as peças existiam soltas: manifesto sabia guardar estado, os guards
 * sabiam reprovar, o contrato de isolamento sabia quem lê o quê. Faltava o que
 * as usa. Sem isto, o "modo autônomo" seria uma folha de instruções para um
 * humano seguir à mão — que é precisamente o que ele existe para eliminar.
 *
 * O laço é sempre o mesmo, e é deliberadamente entediante:
 *
 *   1. kill switch / teto de custo   → parada limpa entre fases
 *   2. materializa contexto isolado  → o gate vira sistema de arquivos
 *   3. invoca subagente em processo próprio
 *   4. recolhe o artefato            → só o orquestrador promove resultado
 *   5. roda o gate da fase           → determinístico, sem LLM
 *   6. grava manifesto (atômico) + report
 *
 * Qualquer passo pode falhar e a execução retoma exatamente dali.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import * as M from './manifest.mjs';
import * as R from './report.mjs';
import * as ISO from './isolamento.mjs';
import { invocarSubagente, verificarDisponibilidade } from './invocar.mjs';
import * as PV from '../guards/plan-validator.mjs';
import * as FZ from '../guards/test-freeze.mjs';
import { renderizarMarkdown, PLANO_EXEMPLO } from '../spec/plano.schema.mjs';

const STOP = process.env.PIPELINE_STOP ?? '/var/pipeline/STOP';
const STOP_NOW = process.env.PIPELINE_STOP_NOW ?? '/var/pipeline/STOP-NOW';

export const MODELO_POR_FASE = {
  '0': 'haiku', '1': 'haiku', '1b': 'haiku',
  '2': 'sonnet', '3': 'opus', '4': 'sonnet', '5': 'sonnet',
  '6': 'sonnet', '7': 'haiku', '8': 'opus', '9': 'sonnet',
};

function log(...a) {
  console.log(...a);
}

/**
 * Gates determinísticos por fase. Nenhum usa LLM — um revisor por IA pode ser
 * convencido, `fs.existsSync` não pode.
 */
async function rodarGate({ faseId, tasksDir, taskId, repoRoot, manifesto, opcoes }) {
  const artefatoPath = (a) => join(tasksDir, taskId, a);

  if (faseId === '3b') {
    const bruto = readFileSync(artefatoPath('03-technical-plan.json'), 'utf8');
    const r = PV.validar({
      plano: bruto,
      repoRoot,
      tipoTarefa: opcoes.tipoTarefa ?? null,
      suiteDeTestes: opcoes.suiteDeTestes ?? [],
      mutationScore: opcoes.mutationScore ?? null,
    });
    writeFileSync(artefatoPath('03b-plan-validation.md'), PV.formatar(r) + '\n');

    // O markdown é DERIVADO do plano estruturado, nunca a fonte. Existe para
    // humano ler no PR e no ClickUp; todo gate lê o JSON.
    if (r.plano) {
      writeFileSync(artefatoPath('03-technical-plan.md'), renderizarMarkdown(r.plano));
    }

    return {
      ok: r.aprovado,
      motivo: r.aprovado ? null : 'plano reprovado na validação estrutural',
      statusClickUp: 'ia-aguardando-info',
      detalhe: PV.formatar(r),
    };
  }

  if (faseId === '5b') {
    // Red check: roda os testes novos sobre código INTOCADO e espera FALHA.
    // Se passou, o teste não exercita a mudança — o loop terminaria na
    // iteração 1 com verde sem o agente ter feito nada.
    const r = await opcoes.rodarTestes?.({ taskId, repoRoot });
    const falhou = r ? !r.ok : null;

    if (falhou === null) {
      writeFileSync(artefatoPath('06b-red-check.md'), '# Red check\n\nNão executado: runner de testes não fornecido.\n');
      return { ok: true, motivo: null, aviso: 'red check pulado — sem runner' };
    }

    writeFileSync(
      artefatoPath('06b-red-check.md'),
      `# Red check\n\nResultado: ${falhou ? 'FALHOU (correto)' : 'PASSOU (problema)'}\n\n` +
        (falhou
          ? 'Os testes falham sobre o código intocado, como esperado — eles de fato exercitam a mudança pendente.\n'
          : 'Os testes já passavam antes de qualquer alteração. O critério de aceite provavelmente descreve comportamento que já existe.\n') +
        `\n\`\`\`\n${(r.saida ?? '').slice(0, 4000)}\n\`\`\`\n`
    );

    return {
      ok: falhou,
      motivo: falhou ? null
        : 'red check passou — os testes não exercitam nenhuma mudança',
      statusClickUp: 'ia-bloqueada',
    };
  }

  if (faseId === '10') {
    // Publicação. O orquestrador não abre o PR sozinho: `pr.ts` ainda não
    // existe (ver docs/pipeline-autonomo.md) e, mais importante, esta é a
    // única fase que escreve fora do disco local. Sem um publicador
    // configurado, produz o report e para — nunca inventa um PR.
    const linhas = R.ler(tasksDir, taskId);
    const corpo = R.renderizarTarefa({ manifesto, linhas, gates: {}, divergencias: opcoes.divergencias ?? [] });

    if (opcoes.publicar) {
      const pub = await opcoes.publicar({ taskId, repoRoot, manifesto, corpo });
      writeFileSync(artefatoPath('10-pr.md'), `# Publicação\n\n${pub?.url ?? '(sem URL)'}\n\n${corpo}\n`);
      if (pub?.url) manifesto.pushed = true;
      return { ok: true, motivo: null };
    }

    writeFileSync(
      artefatoPath('10-pr.md'),
      `# Publicação — não executada\n\nNenhum publicador configurado (\`opcoes.publicar\`).\n` +
        `O trabalho está pronto no worktree; a abertura do PR é manual.\n\n${corpo}\n`
    );
    return { ok: true, motivo: null, aviso: 'sem publicador — PR não aberto' };
  }

  if (faseId === '6' || faseId === '7') {
    // Freeze verificado ANTES de olhar o resultado dos testes. Na ordem
    // inversa, um agente que apagou o teste sairia com "verde".
    const violacoes = FZ.verificar(repoRoot, manifesto.freeze_hashes ?? {});
    if (violacoes.length) {
      return {
        ok: false,
        motivo: 'freeze de testes violado',
        statusClickUp: 'ia-bloqueada',
        detalhe: FZ.formatarViolacoes(violacoes),
        fatal: true, // sem retomada: todo o trabalho desta execução é suspeito
      };
    }
  }

  return { ok: true, motivo: null };
}

function promptDaFase({ faseId, taskId, contrato, artefatoEsperado }) {
  const lidos = contrato.materializados.length
    ? contrato.materializados.map((a) => `- ${a}`).join('\n')
    : '- (nenhum — esta fase busca seus próprios dados)';

  const linhas = [
    `Você está executando a fase ${faseId} do pipeline autônomo para a task ${taskId}.`,
    '',
    'Contexto disponível neste diretório:',
    lidos,
    '',
    artefatoEsperado
      ? `Ao terminar, escreva o resultado em \`${artefatoEsperado}\` neste diretório.`
      : 'Esta fase não produz artefato.',
  ];

  // A Fase 3 emite um artefato ESTRUTURADO, não prosa. O schema é o contrato:
  // o gate seguinte valida contra ele, e um exemplo comunica melhor do que
  // qualquer descrição campo a campo.
  if (faseId === '3') {
    linhas.push(
      '',
      'O plano é um documento JSON conforme o schema abaixo. Escreva JSON puro,',
      'sem cercas de markdown e sem texto antes ou depois.',
      '',
      'Regras que o validador aplica, e que reprovam o plano:',
      '- `acao` de cada arquivo é "criar", "modificar" ou "deletar". Arquivo a',
      '  modificar precisa existir; arquivo a criar não pode existir.',
      '- `duvidas_em_aberto` não-vazio bloqueia a tarefa. Se você tem dúvida,',
      '  declare — é melhor bloquear que assumir. Não esvazie o campo para passar.',
      '- `caracterizacao_afetada` lista os testes que esta mudança deve',
      '  legitimamente invalidar, com o nome exato como existe na suíte.',
      '  Nome inventado reprova o plano.',
      '',
      'Exemplo de um plano válido:',
      '',
      JSON.stringify(PLANO_EXEMPLO, null, 2)
    );
  }

  linhas.push(
    '',
    'Restrições:',
    '- Trabalhe apenas com os arquivos listados acima. Não procure outros em .tasks/.',
    '- Se faltar informação para concluir, diga o que falta e pare. Não invente.',
    '- Não edite arquivos de teste.'
  );

  return linhas.join('\n');
}

/**
 * Executa uma fase de ponta a ponta.
 */
async function executarFase({ faseId, tasksDir, taskId, repoRoot, manifesto, opcoes }) {
  const fase = M.FASES.find((f) => f.id === faseId);
  const inicio = Date.now();

  M.iniciarFase(manifesto, faseId);
  M.salvar(tasksDir, taskId, manifesto);

  const ctx = ISO.materializar({ tasksDir, taskId, faseId });
  log(`\n▶ Fase ${faseId} — ${fase.nome}`);
  log(`   contexto: ${ctx.materializados.length ? ctx.materializados.join(', ') : '(vazio)'}`);
  if (ctx.negados.length) log(`   negados:  ${ctx.negados.join(', ')}  ← isolamento`);

  let resultado = { ok: true, custoUsd: 0, tokensIn: 0, tokensOut: 0, duracaoMs: 0 };

  try {
    if (ctx.agente) {
      // Fases com LLM rodam em processo próprio, no dir isolado.
      resultado = await invocarSubagente({
        agente: ctx.agente,
        prompt: promptDaFase({ faseId, taskId, contrato: ctx, artefatoEsperado: fase.artefato }),
        cwd: ctx.dir,
        binario: opcoes.claudeBin,
        modelo: MODELO_POR_FASE[faseId],
        timeoutMs: opcoes.timeoutFaseMs ?? 45 * 60_000,
      });

      if (!resultado.ok) {
        throw new Error(`subagente falhou (exit ${resultado.codigo}): ${(resultado.erro || resultado.saida || '').slice(0, 300)}`);
      }

      ISO.recolher({ dir: ctx.dir, tasksDir, taskId, artefato: fase.artefato });
    }

    const gate = await rodarGate({ faseId, tasksDir, taskId, repoRoot, manifesto, opcoes });

    if (!gate.ok) {
      M.falharFase(manifesto, faseId, gate.motivo);
      M.salvar(tasksDir, taskId, manifesto);
      R.registrar(tasksDir, taskId, {
        fase: faseId, agente: ctx.agente, modelo: MODELO_POR_FASE[faseId] ?? null,
        duracao_ms: Date.now() - inicio, custo_usd: resultado.custoUsd,
        tokens_in: resultado.tokensIn, tokens_out: resultado.tokensOut,
        status: 'gate_reprovou', leu: ctx.materializados, negados: ctx.negados,
        observacao: gate.motivo,
      });
      if (gate.detalhe) log(gate.detalhe);
      return { parar: true, motivo: gate.motivo, statusClickUp: gate.statusClickUp, fatal: gate.fatal };
    }

    M.concluirFase(manifesto, faseId, {
      tasksDir, taskId, custoUsd: resultado.custoUsd,
      extra: { tokens_in: resultado.tokensIn, tokens_out: resultado.tokensOut, negados: ctx.negados },
    });
    M.salvar(tasksDir, taskId, manifesto);

    R.registrar(tasksDir, taskId, {
      fase: faseId, agente: ctx.agente, modelo: MODELO_POR_FASE[faseId] ?? null,
      duracao_ms: Date.now() - inicio, custo_usd: resultado.custoUsd,
      tokens_in: resultado.tokensIn, tokens_out: resultado.tokensOut,
      status: 'ok', leu: ctx.materializados, negados: ctx.negados,
      escreveu: fase.artefato ? [fase.artefato] : [],
      observacao: gate.aviso ?? '',
    });

    log(`   ✓ ${fase.artefato ?? '(sem artefato)'}  ${resultado.custoUsd ? '$' + resultado.custoUsd.toFixed(3) : ''}`);
    return { parar: false };
  } catch (e) {
    M.falharFase(manifesto, faseId, e.message);
    M.salvar(tasksDir, taskId, manifesto);
    R.registrar(tasksDir, taskId, {
      fase: faseId, agente: ctx.agente, duracao_ms: Date.now() - inicio,
      status: 'erro', leu: ctx.materializados, negados: ctx.negados, observacao: e.message,
    });
    log(`   ✗ ${e.message}`);
    return { parar: true, motivo: e.message, statusClickUp: 'ia-bloqueada' };
  } finally {
    if (!opcoes.manterDirs) ISO.limpar(ctx.dir);
  }
}

/**
 * Ponto de entrada. Inicia ou retoma.
 */
export async function executar({
  taskId,
  tasksDir = '.tasks',
  repoRoot = process.cwd(),
  requisito = null,
  repo = null,
  branch = null,
  opcoes = {},
}) {
  const disp = await verificarDisponibilidade(opcoes.claudeBin);
  if (!disp.ok && !opcoes.simular) {
    return { ok: false, motivo: `Claude Code CLI não encontrado (tentado: ${disp.bin}). Defina CLAUDE_BIN.` };
  }

  mkdirSync(join(tasksDir, taskId), { recursive: true });

  let manifesto = M.carregar(tasksDir, taskId);
  const requisitoHash = requisito ? M.hashRequisito(requisito) : null;
  let retomarDe = null;

  if (manifesto) {
    const plano = M.planejarRetomada({
      manifesto, tasksDir, taskId,
      requisitoHashAtual: requisitoHash,
      worktreeOk: !manifesto.worktree || existsSync(manifesto.worktree),
    });

    if (!plano.permitido) {
      return { ok: false, motivo: plano.motivo };
    }
    for (const a of plano.avisos) log(`⚠ ${a}`);
    if (plano.completo) return { ok: true, completo: true, manifesto };

    retomarDe = plano.retomarDe;
    manifesto.retomadas = (manifesto.retomadas ?? 0) + 1;
    log(`↻ Retomando ${taskId} da fase ${retomarDe} (retomada #${manifesto.retomadas})`);
  } else {
    manifesto = M.criarManifesto({
      taskId, repo, branch, worktree: repoRoot,
      requisitoHash: requisitoHash ?? 'sha256:sem-requisito',
    });
    log(`▸ Iniciando ${taskId}`);
  }
  M.salvar(tasksDir, taskId, manifesto);

  const ordem = M.FASES.map((f) => f.id);
  const inicio = retomarDe ? ordem.indexOf(retomarDe) : 0;

  for (const faseId of ordem.slice(inicio)) {
    if (manifesto.fases[faseId]?.status === 'ok') continue;

    // Kill switch entre fases, nunca no meio de uma. Uma parada assim retoma
    // sem perder nada: a fase corrente terminou e gravou.
    if (existsSync(STOP_NOW)) {
      log('■ STOP-NOW — parada de emergência');
      return { ok: false, parado: true, motivo: 'STOP-NOW', manifesto };
    }
    if (existsSync(STOP)) {
      log('□ STOP — parada limpa entre fases; retomável');
      return { ok: true, parado: true, motivo: 'STOP', manifesto };
    }

    const teto = opcoes.tetoCustoUsd ?? Infinity;
    if (manifesto.custo_acumulado_usd >= teto) {
      log(`□ Teto de custo atingido ($${manifesto.custo_acumulado_usd.toFixed(2)}) — parada limpa`);
      return { ok: true, parado: true, motivo: 'teto de custo', manifesto };
    }

    // Congela os testes antes da primeira fase que pode tocá-los.
    if (faseId === '6' && !Object.keys(manifesto.freeze_hashes ?? {}).length) {
      const arquivos = FZ.listarArquivosDeTeste(repoRoot);
      manifesto.freeze_hashes = FZ.congelar(repoRoot, arquivos);
      M.salvar(tasksDir, taskId, manifesto);
      log(`   ⛁ freeze: ${arquivos.length} arquivo(s) de teste congelados`);
    }

    const r = await executarFase({ faseId, tasksDir, taskId, repoRoot, manifesto, opcoes });
    if (r.parar) {
      return { ok: false, motivo: r.motivo, statusClickUp: r.statusClickUp, fatal: r.fatal, manifesto };
    }
  }

  const linhas = R.ler(tasksDir, taskId);
  log('\n' + R.renderizarTarefa({ manifesto, linhas, gates: {}, divergencias: [] }));
  return { ok: true, completo: true, manifesto };
}

export async function status({ taskId, tasksDir = '.tasks' }) {
  const manifesto = M.carregar(tasksDir, taskId);
  if (!manifesto) return { existe: false };
  const plano = M.planejarRetomada({
    manifesto: JSON.parse(JSON.stringify(manifesto)),
    tasksDir, taskId, requisitoHashAtual: null,
    worktreeOk: !manifesto.worktree || existsSync(manifesto.worktree),
  });
  return { existe: true, manifesto, plano, linhas: R.ler(tasksDir, taskId) };
}
