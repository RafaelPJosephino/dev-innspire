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
        join(process.env.APPDATA ?? '', 'npm', 'claude.cmd'),
        join(homedir(), 'AppData', 'Local', 'Programs', 'claude', 'claude.exe'),
        join(homedir(), '.local', 'bin', 'claude.exe'),
      ]
    : [
        '/usr/local/bin/claude',
        '/usr/bin/claude',
        join(homedir(), '.local', 'bin', 'claude'),
        join(homedir(), '.npm-global', 'bin', 'claude'),
      ];

  for (const c of candidatos) if (c && existsSync(c)) return c;
  return 'claude'; // último recurso: deixa o PATH resolver
}

/**
 * Ferramentas negadas por fase, como segunda camada.
 *
 * A primeira camada é o diretório isolado (o arquivo não está lá). Esta é
 * defesa em profundidade: mesmo que um artefato vaze para o dir por engano, o
 * revisor não pode editar nada e o test-runner não pode reescrever specs.
 */
export const TOOLS_NEGADAS = {
  '1b': ['Write', 'Edit'],          // coleta contexto; escreve só o próprio artefato via Write permitido abaixo
  '8':  ['Write', 'Edit', 'NotebookEdit'], // revisor descreve problemas, não conserta
};

/** O revisor precisa de Write para o próprio laudo — liberado por exceção explícita. */
const WRITE_PERMITIDO_PARA_ARTEFATO = new Set(['1b', '8']);

/**
 * @returns { ok, saida, erro, codigo, custoUsd, tokensIn, tokensOut, duracaoMs }
 */
export function invocarSubagente({
  agente,
  prompt,
  cwd,
  binario = null,
  timeoutMs = 45 * 60_000,
  modelo = null,
  permitirEdicao = true,
}) {
  return new Promise((resolve) => {
    const bin = localizarClaude(binario);
    const inicio = Date.now();

    const args = ['-p', '--output-format', 'json'];
    if (agente) args.push('--agents', agente);
    if (modelo) args.push('--model', modelo);

    const negadas = new Set(TOOLS_NEGADAS[agente] ?? []);
    if (!permitirEdicao) ['Edit', 'NotebookEdit'].forEach((t) => negadas.add(t));
    if (negadas.size) args.push('--disallowedTools', [...negadas].join(','));

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
