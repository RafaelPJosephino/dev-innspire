/**
 * Invocação de subagente — cada fase roda em seu próprio processo, com seu
 * próprio contexto, e devolve custo real.
 *
 * O ponto de rodar `claude -p` em processo separado, em vez de uma única
 * sessão longa: o contexto não vaza entre fases por construção. Uma sessão
 * única acumularia task + plano + diff + logs, e a Fase 8 (que por projeto não
 * pode ver o texto da task) o teria visto de qualquer forma na própria janela.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';

/**
 * Localiza o binário do Claude Code. Não assume PATH: o CLI pode não estar lá
 * quando o pipeline roda sob a extensão de IDE, um serviço, ou cron.
 */
export function localizarClaude(override = null) {
  if (override) return override;
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN;

  const win = platform() === 'win32';
  const candidatos = win
    ? [
        // Instalação local do pipeline. Vem primeiro porque é a única que não
        // some numa atualização: o binário da extensão de IDE vive num
        // diretório com a versão no nome.
        join(homedir(), '.claude', 'bin', 'claude.exe'),
        join(process.env.APPDATA ?? '', 'npm', 'claude.cmd'),
        join(homedir(), 'AppData', 'Local', 'Programs', 'claude', 'claude.exe'),
        join(homedir(), '.local', 'bin', 'claude.exe'),
      ]
    : [
        join(homedir(), '.claude', 'bin', 'claude'),
        '/usr/local/bin/claude',
        '/usr/bin/claude',
        join(homedir(), '.local', 'bin', 'claude'),
        join(homedir(), '.npm-global', 'bin', 'claude'),
      ];

  for (const c of candidatos) if (c && existsSync(c)) return c;
  return 'claude'; // último recurso: deixa o PATH resolver
}

/**
 * Ferramentas PERMITIDAS por fase — allowlist, não negação.
 *
 * Duas razões para inverter:
 *
 * 1. Em modo `-p` o CLI pede confirmação para escrever, e não há ninguém para
 *    responder. A fase estoura o timeout com exit 0 e sem produzir artefato —
 *    o pior modo de falha possível, porque PARECE sucesso. Descoberto num
 *    smoke test com o CLI real; nenhum teste com CLI falso podia revelar isso.
 *
 * 2. Uma allowlist responde "o que esta fase pode fazer?"; uma denylist
 *    responde "o que lembramos de proibir?". Só a primeira falha fechado
 *    quando uma ferramenta nova aparece no CLI.
 *
 * A alternativa seria `--permission-mode bypassPermissions`, que desliga TODAS
 * as confirmações. O plano especifica essa flag apenas DENTRO do sandbox em
 * container (cap_drop ALL, rede internal), que ainda não existe — então aqui
 * ela seria escrita irrestrita na máquina do usuário.
 *
 * Contenção atual, em três camadas já existentes:
 *   1. cwd é o diretório isolado da fase, não o repo (isolamento.mjs)
 *   2. esta allowlist
 *   3. freeze de testes por hash, verificado a cada iteração
 * O sandbox continua sendo o item que falta (docs/pipeline-autonomo.md).
 */
const LEITURA = ['Read', 'Glob', 'Grep'];

export const TOOLS_PERMITIDAS = {
  // Busca dados no ClickUp via MCP e escreve o próprio artefato.
  '1':  [...LEITURA, 'Write', 'mcp__claude_ai_ClickUp__clickup_get_task',
         'mcp__claude_ai_ClickUp__clickup_get_task_comments',
         'mcp__claude_ai_ClickUp__clickup_get_workspace_hierarchy',
         'mcp__claude_ai_ClickUp__clickup_filter_tasks'],
  '0':  [...LEITURA, 'Write', 'Bash'],
  // Coleta contexto do repo com git; escreve só o próprio artefato.
  '1b': [...LEITURA, 'Write', 'Bash'],
  '2':  [...LEITURA, 'Write'],
  '3':  [...LEITURA, 'Write'],
  '4':  [...LEITURA, 'Write'],
  '5':  [...LEITURA, 'Write'],
  // Única fase que altera código de produção.
  '6':  [...LEITURA, 'Write', 'Edit', 'Bash'],
  // Corrige a aplicação quando o teste falha — nunca o teste (freeze cuida).
  '7':  [...LEITURA, 'Write', 'Edit', 'Bash'],
  // Revisor descreve problemas, não conserta.
  //
  // Sem Bash — e isso não é excesso de zelo: um smoke test mostrou o revisor
  // alterando um arquivo alvo mesmo sem Edit na lista, porque com Bash ele
  // simplesmente usa `echo >`. Negar Edit enquanto se concede Bash é teatro:
  // Bash é um superconjunto de quase toda ferramenta de escrita.
  //
  // O `git diff` que o revisor precisa é materializado no contexto pelo
  // orquestrador, não coletado por ele.
  '8':  [...LEITURA, 'Write'],
  '9':  [...LEITURA, 'Write'],
};

/** Fase sem entrada explícita: só leitura e o próprio artefato. Falha fechado. */
const PADRAO = [...LEITURA, 'Write'];

/**
 * @returns { ok, saida, erro, codigo, custoUsd, tokensIn, tokensOut, duracaoMs }
 */
export function invocarSubagente({
  agente,
  faseId = null,
  prompt,
  cwd,
  binario = null,
  timeoutMs = 45 * 60_000,
  modelo = null,
  ferramentasExtra = [],
}) {
  return new Promise((resolve) => {
    const bin = localizarClaude(binario);
    const inicio = Date.now();

    const args = ['-p', '--output-format', 'json'];
    // `--agent` (singular) seleciona um agente por NOME, de ~/.claude/agents/.
    // `--agents` (plural) espera um objeto JSON definindo agentes inline, e
    // passar um nome ali faz o CLI abortar com erro de parse.
    if (agente) args.push('--agent', agente);
    if (modelo) args.push('--model', modelo);

    // Allowlist indexada por FASE, não por agente. A versão anterior usava o
    // nome do agente como chave enquanto as entradas eram números de fase —
    // então nenhuma nunca casava, e a restrição do revisor não se aplicava.
    const permitidas = new Set([...(TOOLS_PERMITIDAS[faseId] ?? PADRAO), ...ferramentasExtra]);
    args.push('--allowedTools', [...permitidas].join(','));

    const filho = spawn(bin, args, {
      cwd,
      shell: platform() === 'win32',
      env: { ...process.env, CLAUDE_NONINTERACTIVE: '1' },
    });

    let saida = '';
    let erro = '';
    let encerrado = false;

    const timer = setTimeout(() => {
      encerrado = true;
      filho.kill('SIGKILL');
      resolve({
        ok: false,
        saida,
        erro: `timeout após ${Math.round(timeoutMs / 1000)}s`,
        codigo: null,
        duracaoMs: Date.now() - inicio,
      });
    }, timeoutMs);

    filho.stdout.on('data', (d) => (saida += d));
    filho.stderr.on('data', (d) => (erro += d));

    filho.on('error', (e) => {
      if (encerrado) return;
      clearTimeout(timer);
      resolve({
        ok: false,
        saida,
        erro: `falha ao executar "${bin}": ${e.message}`,
        codigo: null,
        duracaoMs: Date.now() - inicio,
      });
    });

    filho.on('close', (codigo) => {
      if (encerrado) return;
      clearTimeout(timer);

      let custoUsd = 0;
      let tokensIn = 0;
      let tokensOut = 0;
      let texto = saida;

      try {
        const j = JSON.parse(saida);
        custoUsd = j.total_cost_usd ?? j.cost_usd ?? 0;
        tokensIn = j.usage?.input_tokens ?? 0;
        tokensOut = j.usage?.output_tokens ?? 0;
        texto = j.result ?? saida;
      } catch {
        // Saída não-JSON (versão antiga do CLI, ou erro antes do handshake).
        // Não é fatal: o gate real é o artefato ter sido produzido, não o
        // formato da saída.
      }

      resolve({
        ok: codigo === 0,
        saida: texto,
        erro,
        codigo,
        custoUsd,
        tokensIn,
        tokensOut,
        duracaoMs: Date.now() - inicio,
      });
    });

    if (prompt) {
      filho.stdin.write(prompt);
      filho.stdin.end();
    }
  });
}

export function verificarDisponibilidade(binario = null) {
  return new Promise((resolve) => {
    const bin = localizarClaude(binario);
    const filho = spawn(bin, ['--version'], { shell: platform() === 'win32' });
    let out = '';
    filho.stdout.on('data', (d) => (out += d));
    filho.on('error', () => resolve({ ok: false, bin, versao: null }));
    filho.on('close', (c) => resolve({ ok: c === 0, bin, versao: out.trim() || null }));
  });
}
