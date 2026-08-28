/**
 * Executores de eval — um por tipo de caso.
 *
 * Cada executor recebe o caso e devolve um objeto plano; o runner compara com
 * `esperado` por chave. Manter os executores burros é deliberado: se o
 * executor interpretar, o eval passa a medir o executor.
 */

import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

import { registrarExecutor } from './runner.mjs';
import * as PV from '../lib/guards/plan-validator.mjs';
import * as NP from '../lib/guards/no-progress.mjs';
import * as FZ from '../lib/guards/test-freeze.mjs';
import * as ISO from '../lib/autonomo/isolamento.mjs';
import * as M from '../lib/autonomo/manifest.mjs';
import { validarContra, extrairJson } from '../lib/spec/validar.mjs';
import { PLANO_SCHEMA } from '../lib/spec/plano.schema.mjs';

/** Cria um repo falso com os arquivos que o caso declara existir. */
function repoTemporario(arquivos = []) {
  const dir = mkdtempSync(join(tmpdir(), 'eval-repo-'));
  for (const rel of arquivos) {
    const abs = join(dir, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, '// fixture\n');
  }
  return dir;
}

/**
 * Valida um plano contra a Fase 3b.
 * Mede: o gate reprova o que deve e aprova o que deve.
 */
registrarExecutor('plano', async (caso) => {
  const repo = repoTemporario(caso.repo_arquivos ?? []);
  try {
    const r = PV.validar({
      plano: caso.plano,
      repoRoot: repo,
      tipoTarefa: caso.tipo_tarefa ?? null,
      suiteDeTestes: caso.suite ?? [],
      mutationScore: caso.mutation_score ?? null,
    });
    return {
      aprovado: r.aprovado,
      checks_falhos: r.checks.filter((c) => !c.ok).map((c) => c.nome),
      total_checks: r.checks.length,
    };
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

/**
 * Valida conformidade com a spec isoladamente.
 * Mede: o schema aceita o válido e rejeita o inválido, com caminho no erro.
 */
registrarExecutor('spec', async (caso) => {
  let obj = caso.entrada;
  if (typeof obj === 'string') {
    const ex = extrairJson(obj);
    if (!ex.ok) return { valido: false, extraiu: false, erro: ex.erro };
    obj = ex.valor;
  }
  const r = validarContra(obj, PLANO_SCHEMA);
  return {
    valido: r.valido,
    extraiu: true,
    n_erros: r.erros.length,
    campos_com_erro: [...new Set(r.erros.map((e) => e.split(':')[0]))],
  };
});

/**
 * Detector de não-progresso.
 * Mede: corta o que não anda, deixa passar o que anda.
 */
registrarExecutor('no-progress', async (caso) => {
  const hist = caso.historico.map((h) => ({
    erro: NP.assinaturaErro(h.erro),
    diff: NP.assinaturaDiff(h.diff),
  }));
  const atual = { erro: NP.assinaturaErro(caso.atual.erro), diff: NP.assinaturaDiff(caso.atual.diff) };
  const r = NP.avaliar(hist, atual);
  return { parar: r.parar, tem_motivo: Boolean(r.motivo) };
});

/**
 * Contrato de isolamento.
 * Mede: cada fase vê exatamente o que deve, e nada além.
 */
registrarExecutor('isolamento', async (caso) => {
  const tasks = mkdtempSync(join(tmpdir(), 'eval-iso-'));
  const id = 'CU-EVAL';
  mkdirSync(join(tasks, id), { recursive: true });
  for (const f of M.FASES) if (f.artefato) writeFileSync(join(tasks, id, f.artefato), 'x');
  writeFileSync(join(tasks, id, 'manifest.json'), '{}');
  writeFileSync(join(tasks, id, 'report.jsonl'), '{}');

  try {
    const c = ISO.materializar({ tasksDir: tasks, taskId: id, faseId: caso.fase });
    const vazouSegredo =
      existsSync(join(c.dir, 'manifest.json')) || existsSync(join(c.dir, 'report.jsonl'));
    const r = {
      ve: c.materializados.sort(),
      nao_ve: caso.esperado.nao_ve ? caso.esperado.nao_ve.filter((a) => !c.materializados.includes(a)) : [],
      vazou_segredo: vazouSegredo,
    };
    ISO.limpar(c.dir);
    return r;
  } finally {
    rmSync(tasks, { recursive: true, force: true });
  }
});

/**
 * Freeze de testes.
 * Mede: detecta alteração, remoção e criação durante o loop.
 */
registrarExecutor('freeze', async (caso) => {
  const { execFileSync } = await import('node:child_process');
  const repo = mkdtempSync(join(tmpdir(), 'eval-frz-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: repo });
    mkdirSync(join(repo, 'tests/e2e'), { recursive: true });
    for (const [nome, conteudo] of Object.entries(caso.specs_iniciais)) {
      writeFileSync(join(repo, 'tests/e2e', nome), conteudo);
    }
    execFileSync('git', ['add', '-A'], { cwd: repo });
    execFileSync('git', ['-c', 'user.email=e@e', '-c', 'user.name=e', 'commit', '-qm', 'i'], { cwd: repo });

    const hashes = FZ.congelar(repo, FZ.listarArquivosDeTeste(repo));

    for (const acao of caso.acoes ?? []) {
      const alvo = join(repo, 'tests/e2e', acao.arquivo);
      const fs = await import('node:fs');
      try { fs.chmodSync(alvo, 0o666); } catch { /* pode não existir */ }
      if (acao.tipo === 'alterar') writeFileSync(alvo, acao.conteudo);
      if (acao.tipo === 'remover') rmSync(alvo, { force: true });
      if (acao.tipo === 'criar') writeFileSync(alvo, acao.conteudo);
    }

    const v = FZ.verificar(repo, hashes);
    return { n_violacoes: v.length, tipos: [...new Set(v.map((x) => x.tipo))].sort() };
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

/**
 * Invariantes do contrato de isolamento.
 *
 * Os casos por fase testam uma fase de cada vez. Este testa a PROPRIEDADE:
 * "nenhuma fase que planeja teste pode ver o plano de dev", independente de
 * quantas fases existam. Um caso por fase deixaria passar uma fase nova que
 * violasse a regra.
 */
registrarExecutor('invariante', async (caso) => {
  const violacoes = [];
  for (const [fase, c] of Object.entries(ISO.CONTRATO)) {
    if (caso.fases.includes(fase) && c.le.includes(caso.artefato_proibido)) {
      violacoes.push(fase);
    }
  }
  return { violacoes: violacoes.sort() };
});

/**
 * Allowlist de ferramentas por fase.
 *
 * Invariante que um smoke test com o CLI real revelou: conceder Bash a uma
 * fase que não pode editar torna a negação de Edit decorativa — com Bash o
 * agente usa `echo >`. Bash é superconjunto de quase toda ferramenta de escrita.
 */
registrarExecutor('tools', async (caso) => {
  const { TOOLS_PERMITIDAS } = await import('../lib/autonomo/invocar.mjs');
  const lista = TOOLS_PERMITIDAS[caso.fase] ?? [];
  return {
    tem: caso.deve_ter ? caso.deve_ter.filter((t) => lista.includes(t)) : [],
    nao_tem: caso.nao_deve_ter ? caso.nao_deve_ter.filter((t) => lista.includes(t)) : [],
  };
});
