/**
 * Validação do plano — Fase 3b, determinística, sem LLM.
 *
 * No modo assistido a Fase 3 pergunta "[1] aprovar / [2] ajustar / [3] cancelar".
 * Trocar isso por "o agente aprova o próprio plano" seria remover o gate, não
 * automatizá-lo. O substituto é validar o plano como CONTRATO: só checagens
 * mecânicas, nenhuma delas passível de ser convencida.
 *
 * Um revisor por IA pode ser persuadido; fs.existsSync não pode.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Paths que o pipeline nunca toca, mesmo com tudo verde. */
export const PATHS_PROIBIDOS = [
  /(^|\/)auth\//i,
  /(^|\/)billing\//i,
  /(^|\/)payment(s)?\//i,
  /(^|\/)pipeline\//i,
  // O agente tem Write/Edit e o plugin é markdown no disco. Um agente que
  // edita skills/executar-testes/SKILL.md remove o teto de 2 tentativas e
  // ninguém percebe — o comportamento muda na próxima tarefa.
  //
  // Precisa casar tanto o caminho absoluto quanto o relativo: um plano cita
  // "skills/executar-testes/SKILL.md", não o caminho completo do plugin.
  /\.claude[\\/]plugins[\\/]/i,
  // agents/<nome>.md (um nível) e skills/<nome>/SKILL.md (dois níveis)
  /(^|\/)agents\/[\w-]+\.md$/i,
  /(^|\/)skills\/[\w-]+\/[\w-]+\.md$/i,
  /(^|\/)lib\/(autonomo|guards)\//i,
  // O manifesto é escrito pelo orquestrador, nunca por um subagente. Escrever
  // "status: ok" numa fase que falhou contorna todos os gates de uma vez.
  /(^|\/)manifest\.json$/i,
];

const MIGRATION_DESTRUTIVA =
  /\b(drop\s+(table|column|database)|truncate\s+table|delete\s+from\s+\w+\s*;|dropColumn|dropTable)\b/i;

/** Teto de arquivos por tipo de tarefa. Plano que estoura é plano que virou refactor. */
export const TETO_ARQUIVOS = { 'bug-fix': 5, bugfix: 5, bug: 5, feature: 12, chore: 8, default: 8 };

/**
 * Extrai as seções do plano gerado por planejar-task.
 * O template já emite ETAPAS / ARQUIVOS / RISCOS / DÚVIDAS EM ABERTO.
 */
export function parsearPlano(markdown) {
  const arquivos = new Set();
  // Caminhos citados em `crase`, em listas ou após "Arquivos:"
  const rxCrase = /`([^`\n]+\.[a-z0-9]{1,5})`/gi;
  const rxLista = /^\s*[-*•]\s*([\w./@-]+\.[a-z0-9]{1,5})\s*(?:—|-|:)?/gim;
  for (const m of markdown.matchAll(rxCrase)) arquivos.add(m[1].trim());
  for (const m of markdown.matchAll(rxLista)) arquivos.add(m[1].trim());

  const secao = (titulo) => {
    const rx = new RegExp(`${titulo}[^\\n]*\\n([\\s\\S]*?)(?=\\n#{1,4}\\s|\\n[A-ZÀ-Ú][A-ZÀ-Ú \\t]{4,}\\n|$)`, 'i');
    const m = markdown.match(rx);
    return m ? m[1].trim() : '';
  };

  const duvidas = secao('DÚVIDAS EM ABERTO');
  const caracterizacao = secao('CARACTERIZAÇÃO AFETADA') || secao('caracterizacao_afetada');

  return {
    arquivos: [...arquivos].filter((f) => !f.startsWith('http')),
    duvidas,
    caracterizacaoAfetada: caracterizacao
      .split('\n')
      .map((l) => l.replace(/^\s*[-*•]\s*/, '').trim())
      .filter(Boolean),
    riscos: secao('RISCOS'),
  };
}

function duvidasEstaoVazias(texto) {
  if (!texto) return true;
  const limpo = texto
    .replace(/^\s*[-*•]\s*/gm, '')
    .replace(/[.\s]/g, '')
    .toLowerCase();
  return limpo === '' || /^(nenhuma|nenhum|n\/a|na|-)$/.test(limpo);
}

/**
 * Roda todos os checks. `suiteDeTestes` é a lista de nomes de teste existentes
 * na suíte real — usada para validar caracterizacao_afetada[].
 */
export function validar({ plano, repoRoot, tipoTarefa = 'default', suiteDeTestes = [], mutationScore = null, limiarMutation = 60 }) {
  const p = parsearPlano(plano);
  const checks = [];
  const add = (nome, ok, detalhe) => checks.push({ nome, ok, detalhe });

  // 1. Todo arquivo citado existe — impede o agente de planejar contra um repo
  //    que ele não está enxergando (o cenário de "entrei no repo errado").
  const inexistentes = p.arquivos.filter((f) => !existsSync(join(repoRoot, f)));
  const novosDeclarados = plano.match(/CRIAR|criado|novo arquivo/i);
  add(
    'arquivos citados existem',
    inexistentes.length === 0 || Boolean(novosDeclarados),
    inexistentes.length ? `não encontrados: ${inexistentes.join(', ')}` : 'ok'
  );

  // 2. Nenhum path proibido
  const proibidos = p.arquivos.filter((f) => PATHS_PROIBIDOS.some((rx) => rx.test(f)));
  add('nenhum path proibido', proibidos.length === 0, proibidos.length ? proibidos.join(', ') : 'ok');

  // 3. Nenhuma migration destrutiva
  const destrutiva = MIGRATION_DESTRUTIVA.test(plano);
  add('sem migration destrutiva', !destrutiva, destrutiva ? 'plano menciona DROP/TRUNCATE/DELETE' : 'ok');

  // 4. DÚVIDAS EM ABERTO vazio.
  //    O gate mais barato e mais subestimado: um plano com dúvida em aberto é o
  //    próprio agente dizendo que vai assumir algo — e assumir sozinho às 3h da
  //    manhã é exatamente o que se quer impedir.
  const semDuvidas = duvidasEstaoVazias(p.duvidas);
  add('sem dúvidas em aberto', semDuvidas, semDuvidas ? 'ok' : p.duvidas.slice(0, 200));

  // 5. Teto de arquivos
  const teto = TETO_ARQUIVOS[tipoTarefa] ?? TETO_ARQUIVOS.default;
  add(
    `≤ ${teto} arquivos (${tipoTarefa})`,
    p.arquivos.length <= teto,
    `${p.arquivos.length} arquivo(s)`
  );

  // 6. caracterizacao_afetada[] existe na suíte real.
  //    Nome inventado faria o gate "declaradas quebraram" nunca disparar — e uma
  //    verificação morta é pior que verificação nenhuma, porque você conta com ela.
  //    Pior: é a declaração que autoriza reescrever aquele teste, então sem
  //    validação o agente contornaria o freeze por via indireta.
  if (suiteDeTestes.length) {
    const fantasmas = p.caracterizacaoAfetada.filter(
      (nome) => !suiteDeTestes.some((t) => t.includes(nome) || nome.includes(t))
    );
    add(
      'caracterizações declaradas existem',
      fantasmas.length === 0,
      fantasmas.length ? `não existem na suíte: ${fantasmas.join(', ')}` : `${p.caracterizacaoAfetada.length} declarada(s)`
    );
  }

  // 7. Elegibilidade por cobertura
  if (mutationScore !== null) {
    add(
      `mutation score ≥ ${limiarMutation}%`,
      mutationScore >= limiarMutation,
      `${mutationScore}%`
    );
  }

  const aprovado = checks.every((c) => c.ok);
  return { aprovado, checks, plano: p };
}

export function formatar({ aprovado, checks }) {
  const linhas = checks.map((c) => `  ${c.ok ? '✓' : '✗'} ${c.nome} — ${c.detalhe}`);
  const cabecalho = aprovado
    ? `✓ FASE 3b — plano aprovado (${checks.length}/${checks.length} checks)`
    : `✗ FASE 3b — plano REPROVADO (${checks.filter((c) => c.ok).length}/${checks.length} checks)`;
  return [cabecalho, ...linhas].join('\n');
}
