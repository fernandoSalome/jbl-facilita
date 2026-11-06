/**
 * Modelo da planilha guardado junto da apresentação: as abas CUSTOS e DADOS DO PARCELAMENTO inteiras e, das
 * outras abas, só as células que as contas delas usam (valores e fórmulas). Com ele a planilha aberta na página
 * refaz as contas a cada número trocado, como o Excel: muda a área, os lotes, o prazo, a região, uma quantidade
 * ou um valor e tudo o que depende disso muda junto.
 */
import { analisar, avaliar, colNome, colNum, ehErro, NaoSuportado, resultado, type Erro, type No } from "./formulas";
import type { Aba, Valor } from "./xlsx";

export type AbaModelo = { nome: string; valores: Record<string, Valor>; formulas: Record<string, string> };
export type ModeloPlanilha = { abas: AbaModelo[] };
/** Números digitados na página, por célula ("CUSTOS!H13"). Apagar o número devolve a célula à planilha. */
export type Ajustes = Record<string, Valor>;

export const INTEIRAS = ["CUSTOS", "DADOS DO PARCELAMENTO"];
const chaveAba = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim();

/** Células que a fórmula lê (faixas abertas célula a célula) */
function lidas(no: No, aba: string, out: [string, string][]) {
  if (no.k === "ref") {
    const a = no.aba ?? aba;
    if (!no.b) return void out.push([a, no.a]);
    const [, c1, r1] = /([A-Z]+)(\d+)/.exec(no.a)!, [, c2, r2] = /([A-Z]+)(\d+)/.exec(no.b)!;
    for (let r = Math.min(+r1, +r2); r <= Math.max(+r1, +r2); r++)
      for (let c = Math.min(colNum(c1), colNum(c2)); c <= Math.max(colNum(c1), colNum(c2)); c++) out.push([a, `${colNome(c)}${r}`]);
  } else if (no.k === "fn") no.args.forEach((x) => lidas(x, aba, out));
  else if (no.k === "un") lidas(no.x, aba, out);
  else if (no.k === "bin") { lidas(no.a, aba, out); lidas(no.b, aba, out); }
}

export function montarModelo(abas: Aba[]): ModeloPlanilha {
  const porChave = new Map(abas.map((a) => [chaveAba(a.nome), a]));
  const saida = new Map<string, AbaModelo>();
  const doModelo = (a: Aba) => {
    let m = saida.get(a.nome);
    if (!m) saida.set(a.nome, (m = { nome: a.nome, valores: {}, formulas: {} }));
    return m;
  };
  const fila: [Aba, string][] = [];
  const visto = new Set<string>();
  const pegar = (a: Aba, ref: string) => {
    const k = `${a.nome}!${ref}`;
    if (visto.has(k)) return;
    visto.add(k);
    const v = a.celulas.get(ref), f = a.formulas?.get(ref);
    if (v === undefined && f === undefined) return;
    const m = doModelo(a);
    if (v !== undefined && v !== null) m.valores[ref] = v;
    if (f !== undefined) { m.formulas[ref] = f; fila.push([a, ref]); }
  };
  for (const nome of INTEIRAS) {
    const a = porChave.get(chaveAba(nome));
    if (!a) continue;
    doModelo(a);
    for (const ref of new Set([...a.celulas.keys(), ...(a.formulas?.keys() ?? [])])) pegar(a, ref);
  }
  while (fila.length) {
    const [a, ref] = fila.pop()!;
    let no: No;
    try { no = analisar(a.formulas!.get(ref)!); } catch { continue; }
    const out: [string, string][] = [];
    lidas(no, a.nome, out);
    for (const [nomeAba, r] of out) {
      const b = porChave.get(chaveAba(nomeAba));
      if (b) pegar(b, r);
    }
  }
  return { abas: [...saida.values()] };
}

// fórmulas já lidas (o modelo não muda enquanto a página está aberta)
const cacheNos = new WeakMap<ModeloPlanilha, Map<string, No | null>>();

/** Refaz as contas com os ajustes e devolve as abas inteiras (CUSTOS e DADOS) com os valores novos */
export function calcularAbas(m: ModeloPlanilha, ajustes: Ajustes = {}): Aba[] {
  const porChave = new Map(m.abas.map((a) => [chaveAba(a.nome), a]));
  let nos = cacheNos.get(m);
  if (!nos) cacheNos.set(m, (nos = new Map()));
  const memo = new Map<string, Valor | Erro>();
  const fazendo = new Set<string>();
  const ler = (nomeAba: string, ref: string): Valor | Erro => {
    const a = porChave.get(chaveAba(nomeAba));
    if (!a) return null;
    const k = `${a.nome}!${ref}`;
    if (k in ajustes) return ajustes[k];
    const f = a.formulas[ref];
    const guardado = a.valores[ref] ?? null;
    if (f === undefined) return guardado;
    const pronto = memo.get(k);
    if (pronto !== undefined) return pronto;
    // referência circular: fica o valor que o Excel guardou
    if (fazendo.has(k)) return guardado;
    fazendo.add(k);
    let v: Valor | Erro;
    try {
      let no = nos!.get(k);
      if (no === undefined) {
        try { no = analisar(f); } catch { no = null; }
        nos!.set(k, no);
      }
      if (!no) v = guardado;
      else {
        // fórmula que aponta para célula vazia dá 0 no Excel
        v = resultado(avaliar(no, a.nome, ler)) ?? 0;
      }
    } catch (e) {
      if (!(e instanceof NaoSuportado)) throw e;
      v = guardado;
    }
    fazendo.delete(k);
    memo.set(k, v);
    return v;
  };
  return INTEIRAS.flatMap((nome) => {
    const a = porChave.get(chaveAba(nome));
    if (!a) return [];
    const celulas = new Map<string, Valor>();
    for (const ref of new Set([...Object.keys(a.valores), ...Object.keys(a.formulas), ...Object.keys(ajustes).filter((k) => k.startsWith(`${a.nome}!`)).map((k) => k.slice(a.nome.length + 1))])) {
      const v = ler(a.nome, ref);
      celulas.set(ref, ehErro(v) ? null : v);
    }
    return [{ nome: a.nome, celulas, formulas: new Map(Object.entries(a.formulas)) }];
  });
}

/**
 * Erros de fórmula da planilha de origem e custos que a planilha não tem, corrigidos no modelo (vale também ao subir
 * a planilha de novo). `valores`: células novas (fora da área usada da planilha) com o número inicial.
 */
const CORRECOES: { aba: string; celula: string; errada: string; certa: string; valores?: Record<string, Valor> }[] = [
  // Preparação da Área subtraía a abertura de logradouros, que é custo: passa a somar (06/11/2026)
  { aba: "CUSTOS", celula: "I12", errada: "SUM(I13:I21)-(I22)", certa: "SUM(I13:I22)" },
  // Sede da Empresa ganha os custos administrativos proporcionais (C150, valor total; por mês = ÷ prazo) (06/11/2026)
  { aba: "CUSTOS", celula: "C37", errada: "SUM(C38:C43)*C3", certa: "SUM(C38:C43)*C3+C150", valores: { C150: 112800 } },
];

/** Custos que não existem na planilha: aparecem como item do grupo da linha indicada (gestão, coluna C) */
export const ITENS_NOVOS = [
  // valor total digitado; a página mostra por mês (÷ prazo)
  { grupoLinha: 37, linha: 150, nome: "Custos administrativos proporcionais", rateio: true },
];

/** Modelo com as correções (null se não havia o que corrigir) */
export function corrigirModelo(m: ModeloPlanilha): ModeloPlanilha | null {
  let mudou = false;
  const abas = m.abas.map((a) => {
    const cs = CORRECOES.filter((x) => chaveAba(x.aba) === chaveAba(a.nome) && a.formulas[x.celula]?.replace(/\s/g, "") === x.errada);
    if (!cs.length) return a;
    mudou = true;
    const valores = { ...a.valores };
    for (const x of cs) for (const [k, v] of Object.entries(x.valores ?? {})) if (!(k in valores)) valores[k] = v;
    return { ...a, valores, formulas: { ...a.formulas, ...Object.fromEntries(cs.map((x) => [x.celula, x.certa])) } };
  });
  return mudou ? { abas } : null;
}

/** Opções de uma célula que a planilha procura numa lista (ex.: a região, procurada no cabeçalho de Planilha1) */
export function opcoesDaRegiao(m: ModeloPlanilha): string[] {
  const p1 = m.abas.find((a) => chaveAba(a.nome) === "PLANILHA1");
  if (!p1) return [];
  return ["B1", "C1", "D1", "E1", "F1"].map((r) => p1.valores[r]).filter((x): x is string => typeof x === "string" && !!x.trim());
}
