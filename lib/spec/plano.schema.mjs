/**
 * Spec do plano técnico — Fase 3.
 *
 * Até aqui o plano era markdown livre e o validador tentava adivinhar a
 * intenção com regex: procurava crases, cabeçalhos, listas. Isso é o oposto de
 * spec-driven — escrever um parser para inferir o que um LLM quis dizer em
 * prosa.
 *
 * O sintoma concreto: o check "arquivos citados existem" precisava de um
 * escape (`|| plano.match(/CRIAR|criado/i)`) que praticamente desligava o gate,
 * porque em texto livre não há como distinguir "arquivo que vou criar" de
 * "arquivo cujo nome eu errei". Com `acao: "criar" | "modificar"` declarado, a
 * distinção é dado, não adivinhação.
 *
 * O plano passa a ser um artefato estruturado. O markdown continua existindo —
 * para humano ler no PR — mas é DERIVADO da estrutura, nunca a fonte.
 */

export const SCHEMA_VERSION = 1;

/**
 * Schema declarativo. Validado por lib/spec/validar.mjs, sem dependências:
 * puxar ajv para 200 linhas de schema custaria mais em superfície do que
 * resolve, e este schema é estável por definição — ele É o contrato.
 */
export const PLANO_SCHEMA = {
  tipo: 'objeto',
  obrigatorios: ['schema', 'contexto', 'etapas', 'duvidas_em_aberto', 'caracterizacao_afetada'],
  campos: {
    schema: { tipo: 'numero', enum: [SCHEMA_VERSION] },

    contexto: {
      tipo: 'texto',
      minimo: 20,
      descricao: 'O problema em 2-3 linhas: o que precisa ser feito e por quê.',
    },

    etapas: {
      tipo: 'lista',
      minimo: 1,
      item: {
        tipo: 'objeto',
        obrigatorios: ['titulo', 'o_que_fazer', 'arquivos', 'criterio_conclusao'],
        campos: {
          titulo: { tipo: 'texto', minimo: 3 },
          o_que_fazer: { tipo: 'texto', minimo: 15, descricao: 'Técnico e específico, não genérico.' },
          criterio_conclusao: { tipo: 'texto', minimo: 5, descricao: 'Como saber que está pronto.' },
          arquivos: {
            tipo: 'lista',
            minimo: 1,
            item: {
              tipo: 'objeto',
              obrigatorios: ['caminho', 'acao'],
              campos: {
                caminho: { tipo: 'texto', minimo: 1 },
                // A distinção que o parser de prosa não conseguia fazer.
                acao: { tipo: 'texto', enum: ['criar', 'modificar', 'deletar'] },
                motivo: { tipo: 'texto', opcional: true },
              },
            },
          },
        },
      },
    },

    riscos: {
      tipo: 'lista',
      opcional: true,
      item: {
        tipo: 'objeto',
        obrigatorios: ['risco', 'mitigacao'],
        campos: {
          risco: { tipo: 'texto', minimo: 5 },
          mitigacao: { tipo: 'texto', minimo: 5 },
        },
      },
    },

    // Lista vazia = nenhuma dúvida. O gate mais barato do pipeline vira uma
    // checagem de `.length`, não uma comparação de string contra "nenhuma",
    // "nenhum", "n/a", "-" e as outras grafias que um LLM inventa.
    duvidas_em_aberto: {
      tipo: 'lista',
      item: { tipo: 'texto', minimo: 5 },
    },

    // O contrato bidirecional do §9: quais testes de caracterização esta
    // mudança deve legitimamente invalidar. Sem isto, toda tarefa de bug fix
    // seria bloqueada pela própria rede de segurança.
    caracterizacao_afetada: {
      tipo: 'lista',
      item: {
        tipo: 'objeto',
        obrigatorios: ['teste', 'por_que'],
        campos: {
          teste: { tipo: 'texto', minimo: 3, descricao: 'Nome do teste como existe na suíte.' },
          por_que: { tipo: 'texto', minimo: 10 },
        },
      },
    },

    tipo_tarefa: { tipo: 'texto', opcional: true, enum: ['bug-fix', 'feature', 'chore', 'refactor'] },
    estimativa_horas: { tipo: 'numero', opcional: true },
  },
};

/** Exemplo que vai no prompt do Planner. Um exemplo vale mais que a descrição. */
export const PLANO_EXEMPLO = {
  schema: SCHEMA_VERSION,
  tipo_tarefa: 'bug-fix',
  contexto:
    'O relatório em PDF sai com zero páginas quando o apiário não tem vistorias no período. ' +
    'A causa é PdfService.generate retornar um buffer vazio em vez de lançar.',
  etapas: [
    {
      titulo: 'Tratar coleção vazia em PdfService',
      o_que_fazer:
        'Em generate(), verificar se vistorias.length === 0 antes de montar o documento e ' +
        'retornar um PDF de página única com a mensagem "sem vistorias no período".',
      arquivos: [
        { caminho: 'app/services/pdf.service.ts', acao: 'modificar', motivo: 'onde o buffer vazio nasce' },
      ],
      criterio_conclusao: 'generate() com lista vazia devolve PDF de 1 página, nunca 0 bytes.',
    },
  ],
  riscos: [
    { risco: 'Front antigo pode assumir que 0 bytes significa "sem dados"', mitigacao: 'Manter o status HTTP 200 e o content-type inalterados' },
  ],
  duvidas_em_aberto: [],
  caracterizacao_afetada: [
    {
      teste: 'PdfService > gera buffer vazio quando não há vistorias',
      por_que: 'O teste trava o bug atual; corrigi-lo faz o teste falhar corretamente.',
    },
  ],
};

/**
 * Renderiza o plano estruturado como markdown legível.
 *
 * O markdown é DERIVADO, nunca a fonte. Ele existe para humano ler no PR e
 * no ClickUp; qualquer gate lê o JSON.
 */
export function renderizarMarkdown(plano) {
  const l = [];
  l.push(`# Plano Técnico`);
  if (plano.tipo_tarefa) l.push(`\nTipo: \`${plano.tipo_tarefa}\``);
  if (plano.estimativa_horas) l.push(`Estimativa: ~${plano.estimativa_horas}h`);
  l.push(`\n## Contexto\n\n${plano.contexto}`);

  l.push(`\n## Etapas\n`);
  plano.etapas.forEach((e, i) => {
    l.push(`### ${i + 1}. ${e.titulo}\n`);
    l.push(`${e.o_que_fazer}\n`);
    l.push(`**Arquivos:**`);
    for (const a of e.arquivos) {
      l.push(`- \`${a.caminho}\` — **${a.acao.toUpperCase()}**${a.motivo ? ` — ${a.motivo}` : ''}`);
    }
    l.push(`\n**Critério de conclusão:** ${e.criterio_conclusao}\n`);
  });

  if (plano.riscos?.length) {
    l.push(`## Riscos\n`);
    for (const r of plano.riscos) l.push(`- **${r.risco}** — ${r.mitigacao}`);
    l.push('');
  }

  l.push(`## Dúvidas em aberto\n`);
  l.push(plano.duvidas_em_aberto.length ? plano.duvidas_em_aberto.map((d) => `- ${d}`).join('\n') : '_nenhuma_');

  l.push(`\n## Caracterização afetada\n`);
  l.push(
    plano.caracterizacao_afetada.length
      ? plano.caracterizacao_afetada.map((c) => `- \`${c.teste}\` — ${c.por_que}`).join('\n')
      : '_nenhuma_'
  );

  return l.join('\n') + '\n';
}

/** Todos os arquivos citados, achatados, com a ação declarada. */
export function arquivosDoPlano(plano) {
  return plano.etapas.flatMap((e) => e.arquivos.map((a) => ({ ...a, etapa: e.titulo })));
}
