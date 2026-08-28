/**
 * Validador de schema — sem dependências.
 *
 * Puxar ajv para validar quatro schemas estáveis custaria mais em superfície
 * (e em surpresa de versão) do que resolve. Estes schemas SÃO o contrato do
 * pipeline: se mudam, é uma decisão de projeto, não um upgrade transitivo.
 *
 * Erros são caminhados (`etapas[0].arquivos[1].acao`) porque a mensagem volta
 * para um LLM que precisa consertar o próprio output. "campo inválido" não
 * ajuda ninguém; "etapas[0].arquivos[1].acao: valor 'editar' fora de
 * [criar, modificar, deletar]" é acionável.
 */

function tipoDe(v) {
  if (Array.isArray(v)) return 'lista';
  if (v === null) return 'nulo';
  if (typeof v === 'object') return 'objeto';
  if (typeof v === 'number') return 'numero';
  if (typeof v === 'string') return 'texto';
  if (typeof v === 'boolean') return 'booleano';
  return typeof v;
}

function validarValor(valor, esquema, caminho, erros) {
  const t = tipoDe(valor);

  if (t !== esquema.tipo) {
    erros.push(`${caminho}: esperado ${esquema.tipo}, recebido ${t}`);
    return;
  }

  if (esquema.enum && !esquema.enum.includes(valor)) {
    erros.push(`${caminho}: valor ${JSON.stringify(valor)} fora de [${esquema.enum.join(', ')}]`);
    return;
  }

  if (esquema.tipo === 'texto' && esquema.minimo != null && valor.trim().length < esquema.minimo) {
    erros.push(`${caminho}: texto com ${valor.trim().length} caracteres, mínimo ${esquema.minimo}`);
  }

  if (esquema.tipo === 'lista') {
    if (esquema.minimo != null && valor.length < esquema.minimo) {
      erros.push(`${caminho}: lista com ${valor.length} item(ns), mínimo ${esquema.minimo}`);
    }
    if (esquema.item) {
      valor.forEach((v, i) => validarValor(v, esquema.item, `${caminho}[${i}]`, erros));
    }
  }

  if (esquema.tipo === 'objeto') {
    for (const obrig of esquema.obrigatorios ?? []) {
      if (!(obrig in valor)) erros.push(`${caminho}.${obrig}: campo obrigatório ausente`);
    }
    for (const [nome, sub] of Object.entries(esquema.campos ?? {})) {
      if (!(nome in valor)) {
        if (!sub.opcional && !(esquema.obrigatorios ?? []).includes(nome)) {
          // campo não-obrigatório e não-opcional: ausência é tolerada
        }
        continue;
      }
      validarValor(valor[nome], sub, `${caminho}.${nome}`, erros);
    }
    const conhecidos = new Set(Object.keys(esquema.campos ?? {}));
    for (const k of Object.keys(valor)) {
      if (!conhecidos.has(k)) erros.push(`${caminho}.${k}: campo desconhecido`);
    }
  }
}

export function validarContra(dado, schema, raiz = '$') {
  const erros = [];
  validarValor(dado, schema, raiz, erros);
  return { valido: erros.length === 0, erros };
}

/**
 * Extrai JSON de uma saída de LLM.
 *
 * Modelos envolvem JSON em cercas de markdown, ou escrevem uma frase antes.
 * Rejeitar isso significaria bloquear a fase por formatação, o que troca um
 * problema real por um de etiqueta — então tenta na ordem: JSON puro, bloco
 * cercado, primeiro objeto balanceado.
 */
export function extrairJson(texto) {
  if (typeof texto !== 'string') return { ok: false, erro: 'entrada não é texto' };
  const bruto = texto.trim();

  try {
    return { ok: true, valor: JSON.parse(bruto) };
  } catch { /* segue */ }

  const cerca = bruto.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (cerca) {
    try {
      return { ok: true, valor: JSON.parse(cerca[1]) };
    } catch (e) {
      return { ok: false, erro: `bloco JSON malformado: ${e.message}` };
    }
  }

  const i = bruto.indexOf('{');
  if (i >= 0) {
    let nivel = 0;
    let emTexto = false;
    let escapado = false;
    for (let j = i; j < bruto.length; j++) {
      const c = bruto[j];
      if (escapado) { escapado = false; continue; }
      if (c === '\\') { escapado = true; continue; }
      if (c === '"') { emTexto = !emTexto; continue; }
      if (emTexto) continue;
      if (c === '{') nivel++;
      else if (c === '}') {
        nivel--;
        if (nivel === 0) {
          try {
            return { ok: true, valor: JSON.parse(bruto.slice(i, j + 1)) };
          } catch (e) {
            return { ok: false, erro: `objeto malformado: ${e.message}` };
          }
        }
      }
    }
  }

  return { ok: false, erro: 'nenhum JSON encontrado na saída' };
}

export function formatarErros(erros, limite = 12) {
  const mostrados = erros.slice(0, limite);
  const resto = erros.length - mostrados.length;
  return [
    ...mostrados.map((e) => `  ✗ ${e}`),
    ...(resto > 0 ? [`  … e mais ${resto} erro(s)`] : []),
  ].join('\n');
}
