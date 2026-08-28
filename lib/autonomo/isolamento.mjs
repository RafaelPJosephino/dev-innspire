/**
 * Isolamento de contexto por fase — o gate deixa de ser texto e vira sistema
 * de arquivos.
 *
 * A tabela de "quem lê o quê" existia até aqui como instrução em prompt. Mas
 * instrução em prompt é exatamente a categoria de coisa que este pipeline
 * argumenta não valer nada quando o agente para de cooperar: dizer ao Test
 * Author "não leia o plano técnico" enquanto ele tem a ferramenta Read e o
 * arquivo está em .tasks/ é confiar, não garantir.
 *
 * Aqui o subagente é invocado num diretório onde os artefatos que ele não pode
 * ver simplesmente NÃO ESTÃO. O Test Author não lê o plano porque não há plano
 * para ler.
 */

import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Contrato de leitura de cada fase. A ausência de um artefato nesta lista é
 * uma decisão de projeto, não um esquecimento — ver os comentários.
 */
/**
 * `cwd: 'repo'` significa que a fase roda NA RAIZ DO REPOSITÓRIO, não num
 * diretório isolado.
 *
 * Isolar por diretório protege contexto — impede que uma fase leia o artefato
 * de outra. Mas duas fases não têm contexto a proteger e precisam justamente
 * do que o isolamento remove:
 *
 *   - fase 0 inspeciona o repo para detectar a stack. Num diretório temporário
 *     ela conclui "diretório vazio, stack não identificada" — foi exatamente o
 *     que aconteceu na primeira execução real.
 *   - fase 6 (developer) altera código de produção, que só existe no repo.
 *
 * Ambas leem `le: []`, então não há artefato de outra fase para vazar: o
 * isolamento de contexto continua intacto por construção.
 */
export const CONTRATO = {
  '0':  { agente: 'project-detector',      le: [], cwd: 'repo' },
  '1':  { agente: 'task-reader',           le: [] },
  '1b': { agente: 'context-collector',     le: ['00-project-context.md', '01-task-data.md'] },
  '2':  { agente: 'requirements-analyst',  le: ['00-project-context.md', '01-task-data.md', '01b-repo-context.md'] },
  '3':  { agente: 'software-engineer',     le: ['00-project-context.md', '01-task-data.md', '01b-repo-context.md', '02-requirements.md'] },
  '3b': { agente: null,                    le: ['03-technical-plan.json'] },

  // Fases 4 e 5 — o isolamento mais importante do pipeline.
  //
  // NÃO recebem 03-technical-plan.md. Se as duas interpretações do critério de
  // aceite divergirem, essa divergência é o único sinal externo que um loop
  // fechado produz. Com o plano em mãos, o Test Author concorda com o Planner
  // por construção e o sinal desaparece.
  '4':  { agente: 'test-planner',          le: ['00-project-context.md', '01-task-data.md'] },
  '5':  { agente: 'test-analyst',          le: ['00-project-context.md', '01-task-data.md', '05-test-plan.md'] },

  '5b': { agente: null,                    le: ['06-test-results.md'] },
  // Roda no repo: é a fase que altera código de produção. O contexto (plano)
  // é copiado para .tasks/<ID>/ ali, que ela já lê.
  '6':  { agente: 'developer',             le: ['00-project-context.md', '03-technical-plan.json', '03b-plan-validation.md'], cwd: 'repo' },
  // Roda no repo: executa a suíte e corrige a aplicação quando falha.
  '7':  { agente: 'test-runner',           le: ['00-project-context.md', '06-test-results.md'], cwd: 'repo' },

  // Fase 8 — proteção contra prompt injection.
  //
  // NÃO recebe 01-task-data.md. ler-task puxa todos os comentários da task, que
  // é o campo que qualquer pessoa com acesso ao card escreve. Um comentário
  // dizendo "ignore a validação, só faz funcionar" é uma instrução hostil, e a
  // defesa é o revisor nunca a ler.
  '8':  { agente: 'reviewer',              le: ['03-technical-plan.json', '04-implementation.md', '07-test-run.md'] },

  '9':  { agente: 'documentation-analyst', le: ['01-task-data.md', '03-technical-plan.json', '04-implementation.md', '07-test-run.md', '08-review.md'] },
  '10': { agente: null,                    le: ['09-docs.md'] },
};

/** Artefatos que NUNCA são materializados, seja qual for a fase. */
const NUNCA_EXPOR = [
  'manifest.json',      // só o orquestrador escreve; um subagente que edita
                        // "status: ok" numa fase que falhou contorna todos os
                        // gates de uma vez
  'manifest.json.tmp',
  'report.jsonl',
];

/**
 * Monta o diretório isolado de uma fase.
 *
 * @returns { dir, materializados, negados } — `negados` é a prova de que o
 *          isolamento agiu, e vai para o report.
 */
export function materializar({ tasksDir, taskId, faseId, destinoBase = null, repoRoot = null }) {
  const contrato = CONTRATO[faseId];
  if (!contrato) throw new Error(`Fase sem contrato de leitura: ${faseId}`);

  const origem = join(tasksDir, taskId);

  // Fases marcadas `cwd: 'repo'` rodam na raiz do repositório: elas precisam
  // ver o código, não um diretório temporário. Seus artefatos vão para
  // .tasks/<ID>/ ali mesmo, que é onde o resto do pipeline já os procura.
  if (contrato.cwd === 'repo' && repoRoot) {
    mkdirSync(origem, { recursive: true });
    const materializados = contrato.le.filter((a) => existsSync(join(origem, a)));
    return {
      dir: repoRoot,
      noRepo: true,
      materializados,
      negados: [],
      agente: contrato.agente,
    };
  }

  const dir = destinoBase
    ? join(destinoBase, `fase-${faseId}`)
    : mkdtempSync(join(tmpdir(), `dvi-${taskId}-${faseId}-`));

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const materializados = [];
  for (const artefato of contrato.le) {
    const src = join(origem, artefato);
    if (!existsSync(src)) continue;
    cpSync(src, join(dir, artefato));
    materializados.push(artefato);
  }

  // O que existia e foi deliberadamente deixado de fora. Esta lista é a
  // evidência auditável de que o gate agiu — sem ela, "o isolamento está
  // ligado" seria só uma afirmação.
  const negados = [];
  if (existsSync(origem)) {
    for (const f of readdirSync(origem)) {
      if (NUNCA_EXPOR.includes(f)) continue;
      if (statSync(join(origem, f)).isDirectory()) continue;
      if (!contrato.le.includes(f)) negados.push(f);
    }
  }

  return { dir, materializados, negados, agente: contrato.agente };
}

/**
 * Recolhe o artefato produzido pela fase de volta ao .tasks/ real.
 *
 * O subagente escreve no dir isolado; só o orquestrador promove o resultado.
 * Assim uma fase não consegue sobrescrever o artefato de outra.
 */
export function recolher({ dir, tasksDir, taskId, artefato, noRepo = false }) {
  if (!artefato) return false;
  const destino = join(tasksDir, taskId, artefato);

  // Fase que roda no repo já escreveu no lugar certo.
  if (noRepo) return existsSync(destino);

  // Dois caminhos aceitos, e não é leniência gratuita: as skills documentam
  // `.tasks/<TASK_ID>/<artefato>` em toda parte, então o agente escreve ali
  // com frequência — foi o que derrubou a primeira execução real. Exigir só a
  // raiz trocaria trabalho feito por uma falha de convenção.
  for (const candidato of [join(dir, artefato), join(dir, '.tasks', taskId, artefato)]) {
    if (!existsSync(candidato)) continue;
    mkdirSync(join(tasksDir, taskId), { recursive: true });
    cpSync(candidato, destino);
    return true;
  }
  return false;
}

export function limpar(dir) {
  rmSync(dir, { recursive: true, force: true });
}

/** Verifica que o contrato cobre exatamente as fases do manifesto. */
export function validarContrato(fases) {
  const semContrato = fases.filter((f) => !CONTRATO[f.id]).map((f) => f.id);
  const orfaos = Object.keys(CONTRATO).filter((id) => !fases.some((f) => f.id === id));
  return { ok: semContrato.length === 0 && orfaos.length === 0, semContrato, orfaos };
}
