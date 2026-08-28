/**
 * Detector de não-progresso.
 *
 * O maior desperdício não é a tarefa impossível — é ela gastar as 5 iterações
 * completas de madrugada. Erro idêntico entre iterações, diff que não muda, ou
 * oscilação (volta a um estado já visitado) significam que as iterações
 * restantes vão produzir o mesmo resultado, mais caro.
 *
 * Ortogonal ao teto de tentativas: o teto é o limite superior; isto corta antes
 * quando já está óbvio que não vai andar.
 *
 * O histórico vive no manifesto, não em memória — senão um restart zera o
 * detector e a tarefa recomeça a oscilar do início.
 */

import { createHash } from 'node:crypto';

function h(s) {
  return createHash('sha256').update(s ?? '').digest('hex').slice(0, 16);
}

/** Normaliza a mensagem de erro: remove timestamps, paths absolutos e durações. */
export function assinaturaErro(saida) {
  return h(
    (saida ?? '')
      .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '')
      .replace(/[A-Za-z]:[\\/][^\s:]+/g, '')
      .replace(/\/[\w./-]+\//g, '')
      .replace(/\b\d+(\.\d+)?\s?m?s\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function assinaturaDiff(diff) {
  return h((diff ?? '').replace(/^index [0-9a-f]+\.\.[0-9a-f]+.*$/gm, '').trim());
}

/**
 * @param historico array de { erro, diff } das iterações anteriores
 * @returns { parar, motivo } — parar=true aborta o loop
 */
export function avaliar(historico, atual) {
  if (historico.length === 0) return { parar: false };

  const anterior = historico[historico.length - 1];

  if (anterior.erro === atual.erro && anterior.diff === atual.diff) {
    return {
      parar: true,
      motivo: 'não-progresso: erro e diff idênticos à iteração anterior',
    };
  }

  if (anterior.erro === atual.erro && historico.length >= 2) {
    const doisAtras = historico[historico.length - 2];
    if (doisAtras.erro === atual.erro) {
      return {
        parar: true,
        motivo: 'não-progresso: mesmo erro por 3 iterações consecutivas',
      };
    }
  }

  // Oscilação: o estado atual já foi visitado antes. O agente está andando em
  // círculo — desfaz e refaz a mesma mudança.
  const visto = historico.some((it) => it.diff === atual.diff);
  if (visto) {
    return { parar: true, motivo: 'não-progresso: estado já visitado (oscilação)' };
  }

  return { parar: false };
}
