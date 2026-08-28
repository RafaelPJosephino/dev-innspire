/**
 * Manifesto de execução — a verdade sobre onde uma tarefa parou.
 *
 * Os artefatos `NN-nome.md` são o produto de cada fase; o manifesto diz
 * quais deles valem. Sem ele, "o arquivo existe" seria confundido com
 * "a fase concluiu" — e uma fase que abortou no meio pareceria pronta.
 *
 * Toda escrita é atômica (tmp + rename). Um kill no meio de um write
 * deixaria o manifesto corrompido, e aí não se perde uma fase: perde-se
 * a capacidade de saber o que já havia sido feito.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync, mkdirSync, openSync, fsyncSync, closeSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const SCHEMA_VERSION = 1;

/** Ordem canônica das fases do modo autônomo. Índice = ordem de execução. */
export const FASES = [
  { id: '0',  nome: 'project-context',  artefato: '00-project-context.md' },
  { id: '1',  nome: 'task-reader',      artefato: '01-task-data.md' },
  { id: '1b', nome: 'context-collector',artefato: '01b-repo-context.md' },
  { id: '2',  nome: 'requirements',     artefato: '02-requirements.md' },
  { id: '3',  nome: 'technical-plan',   artefato: '03-technical-plan.md' },
  { id: '3b', nome: 'plan-validation',  artefato: '03b-plan-validation.md', determinística: true },
  { id: '4',  nome: 'test-plan',        artefato: '05-test-plan.md' },
  { id: '5',  nome: 'test-author',      artefato: '06-test-results.md' },
  { id: '5b', nome: 'red-check',        artefato: '06b-red-check.md',      determinística: true },
  { id: '6',  nome: 'developer',        artefato: '04-implementation.md' },
  { id: '7',  nome: 'test-runner',      artefato: '07-test-run.md' },
  { id: '8',  nome: 'reviewer',         artefato: '08-review.md' },
  { id: '9',  nome: 'documentation',    artefato: '09-docs.md' },
  { id: '10', nome: 'publisher',        artefato: '10-pr.md' },
];

const ORDEM = FASES.map((f) => f.id);

export function sha256(buf) {
  return 'sha256:' + createHash('sha256').update(buf).digest('hex');
}

export function hashArquivo(caminho) {
  if (!existsSync(caminho)) return null;
  return sha256(readFileSync(caminho));
}

/**
 * Hash do requisito: descrição + critério de aceite, normalizados.
 * Se a task for editada no ClickUp durante uma pausa, este hash muda e
 * a retomada invalida o plano — senão entregaríamos código escrito
 * contra uma descrição que não existe mais.
 */
export function hashRequisito({ descricao = '', criterioAceite = '' }) {
  const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  return sha256(norm(descricao) + '\u0000' + norm(criterioAceite));
}

export function caminhoManifesto(tasksDir, taskId) {
  return join(tasksDir, taskId, 'manifest.json');
}

/** Escrita atômica: grava .tmp, fsync, renomeia. rename é atômico no mesmo FS. */
function escreverAtomico(caminho, conteudo) {
  mkdirSync(dirname(caminho), { recursive: true });
  const tmp = caminho + '.tmp';
  writeFileSync(tmp, conteudo);
  const fd = openSync(tmp, 'r+');
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, caminho);
}

export function criarManifesto({ taskId, repo, branch, worktree, requisitoHash, modo = 'autonomo' }) {
  return {
    schema: SCHEMA_VERSION,
    task_id: taskId,
    requisito_hash: requisitoHash,
    repo,
    branch,
    worktree,
    modo,
    iniciado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    fase_atual: null,
    fases: {},
    freeze_hashes: {},
    estados_vistos: [],
    custo_acumulado_usd: 0,
    tentativas: 1,
    retomadas: 0,
    pushed: false,
  };
}

export function carregar(tasksDir, taskId) {
  const p = caminhoManifesto(tasksDir, taskId);
  if (!existsSync(p)) return null;
  try {
    const m = JSON.parse(readFileSync(p, 'utf8'));
    if (m.schema !== SCHEMA_VERSION) return null;
    return m;
  } catch {
    // Manifesto corrompido é tratado como ausente: recomeça do zero.
    // Prosseguir com estado parcial seria pior que refazer.
    return null;
  }
}

export function salvar(tasksDir, taskId, manifesto) {
  manifesto.atualizado_em = new Date().toISOString();
  escreverAtomico(caminhoManifesto(tasksDir, taskId), JSON.stringify(manifesto, null, 2));
  return manifesto;
}

export function iniciarFase(manifesto, faseId, leaseMinutos = 60) {
  manifesto.fase_atual = faseId;
  manifesto.fases[faseId] = {
    status: 'em_curso',
    iniciado_em: new Date().toISOString(),
    lease_ate: new Date(Date.now() + leaseMinutos * 60_000).toISOString(),
  };
  return manifesto;
}

export function concluirFase(manifesto, faseId, { tasksDir, taskId, custoUsd = 0, extra = {} }) {
  const fase = FASES.find((f) => f.id === faseId);
  const artefato = fase?.artefato ?? null;
  const caminho = artefato ? join(tasksDir, taskId, artefato) : null;

  if (caminho && !existsSync(caminho)) {
    throw new Error(`Fase ${faseId} declarou conclusão sem produzir ${artefato}`);
  }

  manifesto.fases[faseId] = {
    status: 'ok',
    artefato,
    sha256: caminho ? hashArquivo(caminho) : null,
    concluido_em: new Date().toISOString(),
    custo_usd: custoUsd,
    ...extra,
  };
  manifesto.custo_acumulado_usd = Number((manifesto.custo_acumulado_usd + custoUsd).toFixed(4));
  return manifesto;
}

export function falharFase(manifesto, faseId, motivo) {
  manifesto.fases[faseId] = {
    status: 'falhou',
    motivo,
    em: new Date().toISOString(),
  };
  return manifesto;
}

/**
 * Invalidação em cascata — a regra que faz a retomada ser correta.
 *
 * Invalidar a fase N invalida N+1 em diante. Se o plano (3) caiu, o código
 * escrito na 6 foi feito contra um plano que não vale mais; retomar da 7
 * entregaria código órfão de plano. Este é o erro mais provável de uma
 * implementação apressada de resume.
 */
export function invalidarDe(manifesto, faseId) {
  const i = ORDEM.indexOf(faseId);
  if (i < 0) throw new Error(`Fase desconhecida: ${faseId}`);
  const invalidadas = [];
  for (const id of ORDEM.slice(i)) {
    if (manifesto.fases[id]) {
      delete manifesto.fases[id];
      invalidadas.push(id);
    }
  }
  return invalidadas;
}

/**
 * Decide onde retomar. Percorre as fases em ordem e para na primeira
 * que não pode ser aproveitada.
 */
export function planejarRetomada({ manifesto, tasksDir, taskId, requisitoHashAtual, worktreeOk }) {
  const avisos = [];

  if (manifesto.pushed) {
    return {
      permitido: false,
      motivo:
        'Execução já passou do push. Retomar exigiria um segundo push na mesma branch, ' +
        'e a regra de push único é o que garante que --force nunca seja necessário.',
      avisos,
    };
  }

  if (requisitoHashAtual && manifesto.requisito_hash !== requisitoHashAtual) {
    const inv = invalidarDe(manifesto, '2');
    manifesto.requisito_hash = requisitoHashAtual;
    avisos.push(`Requisito mudou durante a pausa — invalidadas as fases: ${inv.join(', ')}`);
  }

  if (!worktreeOk) {
    const inv = invalidarDe(manifesto, '6');
    if (inv.length) avisos.push(`Worktree ausente ou em branch errada — invalidadas: ${inv.join(', ')}`);
  }

  for (const { id, artefato } of FASES) {
    const reg = manifesto.fases[id];
    if (!reg) return { permitido: true, retomarDe: id, avisos };

    if (reg.status === 'em_curso') {
      // Nunca se sabe onde uma fase em curso parou. Sempre refaz.
      const inv = invalidarDe(manifesto, id);
      avisos.push(`Fase ${id} estava em curso — invalidadas: ${inv.join(', ')}`);
      return { permitido: true, retomarDe: id, avisos };
    }

    if (reg.status !== 'ok') {
      const inv = invalidarDe(manifesto, id);
      avisos.push(`Fase ${id} com status "${reg.status}" — invalidadas: ${inv.join(', ')}`);
      return { permitido: true, retomarDe: id, avisos };
    }

    if (artefato) {
      const caminho = join(tasksDir, taskId, artefato);
      const hashAtual = hashArquivo(caminho);
      if (hashAtual === null) {
        const inv = invalidarDe(manifesto, id);
        avisos.push(`Artefato ${artefato} sumiu — invalidadas: ${inv.join(', ')}`);
        return { permitido: true, retomarDe: id, avisos };
      }
      if (hashAtual !== reg.sha256) {
        const inv = invalidarDe(manifesto, id);
        avisos.push(`Artefato ${artefato} foi alterado fora do pipeline — invalidadas: ${inv.join(', ')}`);
        return { permitido: true, retomarDe: id, avisos };
      }
    }
  }

  return { permitido: true, retomarDe: null, avisos, completo: true };
}

export function registrarEstado(manifesto, assinatura) {
  const h = sha256(assinatura);
  const repetido = manifesto.estados_vistos.includes(h);
  if (!repetido) manifesto.estados_vistos.push(h);
  return { repetido, hash: h };
}
