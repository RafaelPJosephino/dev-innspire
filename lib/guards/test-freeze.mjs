/**
 * Freeze de testes — o guard mais importante do modo autônomo.
 *
 * O loop só termina quando o teste passa. Se o agente não consegue fazer o
 * CÓDIGO funcionar, o caminho de menor resistência é atacar o TESTE: afrouxar
 * a assertion, mockar a função sob teste, adicionar .skip, apagar o arquivo.
 * E então reportar sucesso.
 *
 * As skills já instruem "corrija o código da aplicação, não o teste". Instrução
 * em prompt vale enquanto o agente coopera — e o momento em que ele para de
 * cooperar é exatamente o momento em que o guard importa.
 *
 * Duas camadas: chmod 444 (atrito) e hash SHA-256 (detecção). A segunda é a
 * que vale, e é verificada ANTES de olhar se o teste passou — na ordem inversa,
 * um agente que apagou o teste sairia com "verde".
 */

import { chmodSync, existsSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

function sha256(buf) {
  return 'sha256:' + createHash('sha256').update(buf).digest('hex');
}

/** Lista os arquivos de teste sob os diretórios dados, via git (respeita .gitignore). */
export function listarArquivosDeTeste(cwd, dirs = ['tests']) {
  const saida = execFileSync('git', ['ls-files', ...dirs], { cwd, encoding: 'utf8' });
  const rastreados = saida.split('\n').filter(Boolean);

  // Arquivos novos ainda não commitados também entram no freeze — o spec da
  // tarefa corrente nasce sem estar no índice e é justamente o mais visado.
  const novos = execFileSync('git', ['ls-files', '--others', '--exclude-standard', ...dirs], {
    cwd,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);

  return [...new Set([...rastreados, ...novos])].filter((f) => /\.(spec|test)\.[jt]sx?$/.test(f));
}

/**
 * Congela: registra o hash de cada arquivo de teste e marca como somente-leitura.
 * Os hashes vão para o manifesto, não para memória — senão um restart daria
 * linha de base nova, e um agente poderia adulterar o teste, forçar um restart
 * e ter a adulteração aceita como estado inicial.
 */
export function congelar(cwd, arquivos) {
  const hashes = {};
  for (const rel of arquivos) {
    const abs = `${cwd}/${rel}`;
    if (!existsSync(abs)) continue;
    hashes[rel] = sha256(readFileSync(abs));
    try {
      chmodSync(abs, 0o444);
    } catch {
      // chmod é só atrito; em alguns FS (Windows/montagens) não pega.
      // A detecção por hash continua valendo e é a camada que importa.
    }
  }
  return hashes;
}

/**
 * Verifica o freeze. Retorna a lista de violações — vazia significa intacto.
 *
 * Chamar SEMPRE antes de avaliar o resultado dos testes.
 */
export function verificar(cwd, hashesCongelados) {
  const violacoes = [];

  for (const [rel, esperado] of Object.entries(hashesCongelados)) {
    const abs = `${cwd}/${rel}`;
    if (!existsSync(abs)) {
      violacoes.push({ arquivo: rel, tipo: 'removido' });
      continue;
    }
    const atual = sha256(readFileSync(abs));
    if (atual !== esperado) {
      violacoes.push({ arquivo: rel, tipo: 'alterado', esperado, atual });
    }
  }

  // Um arquivo de teste novo que aparece durante o loop também é suspeito:
  // é a via para "escrevo um teste fácil que passa" contornando o congelado.
  for (const rel of listarArquivosDeTeste(cwd)) {
    if (!(rel in hashesCongelados)) {
      violacoes.push({ arquivo: rel, tipo: 'criado_durante_loop' });
    }
  }

  return violacoes;
}

export function descongelar(cwd, hashesCongelados) {
  for (const rel of Object.keys(hashesCongelados)) {
    const abs = `${cwd}/${rel}`;
    if (!existsSync(abs)) continue;
    try {
      chmodSync(abs, statSync(abs).mode | 0o200);
    } catch {
      /* idem congelar() */
    }
  }
}

export function formatarViolacoes(violacoes) {
  if (!violacoes.length) return '✓ freeze intacto';
  const linhas = violacoes.map((v) => {
    if (v.tipo === 'removido') return `  ✗ ${v.arquivo} — arquivo de teste REMOVIDO`;
    if (v.tipo === 'alterado') return `  ✗ ${v.arquivo} — conteúdo ALTERADO durante o loop`;
    return `  ✗ ${v.arquivo} — arquivo de teste CRIADO durante o loop`;
  });
  return ['✗ FREEZE VIOLADO — o agente tocou nos testes:', ...linhas].join('\n');
}
