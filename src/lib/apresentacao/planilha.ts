/**
 * Apresentação de custos: lê a aba "CUSTOS" (e o resumo de "DADOS DO PARCELAMENTO") da planilha
 * JBL_Planilha(+)Infra com os valores que o próprio Excel calculou e guardou no arquivo. Guarda também o modelo
 * (as fórmulas), para a planilha aberta na página refazer as contas quando alguém troca um número.
 */
import { analisar, avaliar, resultado } from "./formulas";
import { calcularAbas, corrigirModelo, montarModelo, type Ajustes, type ModeloPlanilha } from "./modelo";
import { lerXlsx, type Aba, type Valor } from "./xlsx";

/** linha = linha da aba CUSTOS (as células que a página muda: G, H e I nas obras, C na gestão) */
export type Item = { id: string; nome: string; opcao: string | null; unitario: number | null; quantidade: number | null; unidade: string | null; total: number | null; linha?: number };
export type Grupo = { id: string; nome: string; total: number | null; implanta: boolean | null; itens: Item[]; linha?: number; linhaImplanta?: number };
export type Resumo = { id: string; nome: string; pct: number | null; valor: number };
export type DadosCustos = {
  arquivo: string;
  lidoEm: string;
  total: number | null;
  info: { tipo: string | null; area: number | null; lotes: number | null; lote: number | null; regiao: string | null; meses: number | null };
  resumo: Resumo[];
  /** Obras e infraestrutura (colunas E a I) */
  obras: Grupo[];
  /** Custos de estruturação, documentação, projetos, sede e marketing (colunas B e C) */
  gestao: Grupo[];
  /** Nomes das abas como estão no arquivo (para os ajustes por célula) */
  abas?: { custos: string; dados: string | null };
  /** Fórmulas da planilha e os números trocados na página (sem eles, a página só soma o que foi mexido) */
  modelo?: ModeloPlanilha;
  ajustes?: Ajustes;
};

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "x";
const norm = (s: string) => slug(s).replace(/-/g, "");

const num = (x: Valor): number | null => (typeof x === "number" && Number.isFinite(x) ? x : null);
const txt = (x: Valor): string | null => {
  if (x === null || x === undefined || typeof x === "boolean") return null;
  const s = String(x).trim();
  return s ? s : null;
};
/** Linha de item na planilha começa com " - " */
const ehItem = (s: string) => /^\s*-\s*/.test(s);
const limpar = (s: string) => s.replace(/^\s*-\s*/, "").replace(/\s+/g, " ").trim();

/** Erros de digitação da planilha (só no texto mostrado) */
const GRAFIA: [RegExp, string][] = [[/linera/gi, "linear"], [/Conecções/g, "Conexões"], [/Supreção/g, "Supressão"], [/Advocátícios/g, "Advocatícios"], [/Goumert/g, "Gourmet"], [/Louge/g, "Lounge"], [/Cateiro/g, "Canteiro"]];
const grafia = (s: string) => GRAFIA.reduce((t, [r, v]) => t.replace(r, v), s);

/**
 * Nome do item para quem não conhece obra: sem o "Custo do metro linear de..." do começo (a unidade já está na
 * quantidade). "Custo mensal de X" vira "X (mensal)".
 */
export function nomeSimples(nome: string): string {
  let n = grafia(nome);
  const mensal = /^custo mensal\b/i.test(n);
  n = n.replace(/^custo\s+(mensal\s+)?((de|do|da|dos|das|para)\s+)?/i, "");
  n = n.replace(/^(metro linear|m²|m³)\s+(de|do|da|dos|das)\s+/i, "");
  n = n.replace(/^(a|o)\s+/i, "");
  n = n.charAt(0).toUpperCase() + n.slice(1);
  return mensal ? `${n} (mensal)` : n;
}

/** Unidade escrita no nome do item ("(m²)", "(mensal)", "unid.", "metro linear") */
function unidadeDe(nome: string): string | null {
  const n = nome.toLowerCase();
  if (/\(m²\)|m² /.test(n) || n.includes("do m²")) return "m²";
  if (n.includes("m³")) return "m³";
  if (n.includes("mensal")) return "mês";
  if (n.includes("metro linear") || n.includes("metro linera")) return "m";
  if (n.includes("hora")) return "hora";
  if (n.includes("diária")) return "dia";
  if (/unid\.?|unidade/.test(n)) return "un.";
  return null;
}

function unicos<T extends { id: string }>(lista: T[]) {
  const vistos = new Map<string, number>();
  for (const x of lista) {
    const n = vistos.get(x.id) ?? 0;
    vistos.set(x.id, n + 1);
    if (n) x.id = `${x.id}-${n + 1}`;
  }
  return lista;
}

const GRUPOS_GESTAO = /^\s*(área|estruturação jurídica|integralização da área|documentação|projetos|sede da empresa|marketing)\b/i;

export function lerPlanilhaCustos(arquivo: Buffer, nomeArquivo: string): DadosCustos {
  const abas = lerXlsx(arquivo);
  const modelo = montarModelo(abas), certo = corrigirModelo(modelo);
  const d: DadosCustos = { ...extrairCustos(abas, nomeArquivo, new Date().toISOString()), modelo: certo ?? modelo, ajustes: {} };
  // fórmula corrigida: os números são refeitos (os guardados no arquivo são os da fórmula errada)
  return certo ? recalcular(d, {}) : d;
}

/** Refaz as contas da planilha com os números trocados na página (mesmos nomes e ids de antes) */
export function recalcular(d: DadosCustos, ajustes: Ajustes): DadosCustos {
  if (!d.modelo) return d;
  // grupo zerado na página continua na lista (para dar para trocar o número de volta)
  const manter = new Set([...d.obras, ...d.gestao].map((g) => g.id));
  return { ...extrairCustos(calcularAbas(d.modelo, ajustes), d.arquivo, d.lidoEm, manter), modelo: d.modelo, ajustes };
}

export function extrairCustos(abas: Aba[], nomeArquivo: string, lidoEm: string, manter = new Set<string>()): DadosCustos {
  const aba = (nome: string) => abas.find((w) => norm(w.nome) === norm(nome));
  const c = aba("CUSTOS");
  if (!c) throw new Error('A planilha não tem a aba "CUSTOS".');
  const d = aba("DADOS DO PARCELAMENTO");
  const cel = (ws: Aba | undefined, ref: string): Valor => ws?.celulas.get(ref) ?? null;

  /**
   * Quanto cada linha pesa na soma do grupo, pela fórmula do próprio grupo: na gestão alguns itens são por mês
   * (× prazo) ou por lote (× lotes); nas obras a Preparação da Área subtrai a abertura de logradouros. Assim o
   * total de cada item mostrado é o que entra na soma, e os itens fecham com o total do grupo.
   */
  const fatores = (col: "C" | "I", linhaGrupo: number, linhas: number[]): Map<number, number> => {
    const fatorDe = new Map<number, number>();
    const f = c.formulas?.get(`${col}${linhaGrupo}`);
    if (!f || !linhas.length) return fatorDe;
    let no: ReturnType<typeof analisar>;
    try { no = analisar(f); } catch { return fatorDe; }
    const alvo = new Set(linhas.map((r) => `${col}${r}`));
    const conta = (um: string | null): number | null => {
      try {
        const v = resultado(avaliar(no, c.nome, (nomeAba, ref) => {
          const ws = aba(nomeAba);
          if (ws === c && alvo.has(ref)) return ref === um ? 1 : 0;
          return cel(ws, ref);
        }));
        return typeof v === "number" ? v : null;
      } catch { return null; }
    };
    const zero = conta(null);
    if (zero === null) return fatorDe;
    for (const r of linhas) {
      const v = conta(`${col}${r}`);
      if (v !== null) fatorDe.set(r, Math.round((v - zero) * 1e9) / 1e9);
    }
    return fatorDe;
  };

  // ---- "Implantará?" (B63:C69): Sim / Não de cada grupo de obras ----
  const implanta = new Map<string, { sim: boolean; linha: number }>();
  for (let r = 1; r <= 200; r++) {
    const b = txt(cel(c, `B${r}`));
    if (b && norm(b).includes("infraestruturadoempreendimento")) {
      for (let k = r + 1; k <= r + 12; k++) {
        const nome = txt(cel(c, `B${k}`));
        const sim = txt(cel(c, `C${k}`));
        if (!nome) break;
        if (sim) implanta.set(norm(nome).replace("cateiro", "canteiro"), { sim: /^s/i.test(sim), linha: k });
      }
      break;
    }
  }
  const implantaDe = (grupo: string): { sim: boolean; linha: number } | null => {
    const g = norm(grupo);
    for (const [k, v] of implanta) {
      const chave = k.replace(/^(rede)?de/, "").replace("rede", "");
      if (g.includes(chave) || chave.includes(g.replace(/s$/, ""))) return v;
    }
    return null;
  };

  // ---- obras (colunas E a I) ----
  const obras: Grupo[] = [];
  let g: Grupo | null = null;
  for (let r = 4; r <= 140; r++) {
    const nome = txt(cel(c, `E${r}`));
    if (!nome) continue;
    if (ehItem(nome)) {
      if (!g) continue;
      const nomeLimpo = limpar(nome);
      g.itens.push({
        id: `${g.id}.${slug(nomeLimpo)}`,
        nome: nomeSimples(nomeLimpo),
        opcao: txt(cel(c, `F${r}`)),
        unitario: num(cel(c, `G${r}`)),
        quantidade: num(cel(c, `H${r}`)),
        unidade: unidadeDe(nomeLimpo),
        total: num(cel(c, `I${r}`)),
        linha: r,
      });
    } else if (/padr[aã]o da constru/i.test(nome)) {
      // escolha do padrão (A, B ou C): vai como opção do grupo de construção civil
      if (g) g.itens.push({ id: `${g.id}.padrao`, nome, opcao: txt(cel(c, `G${r}`)), unitario: null, quantidade: null, unidade: null, total: null });
    } else {
      const imp = implantaDe(nome);
      g = { id: slug(nome), nome: grafia(nome), total: num(cel(c, `I${r}`)), implanta: imp?.sim ?? null, itens: [], linha: r, ...(imp ? { linhaImplanta: imp.linha } : {}) };
      obras.push(g);
    }
  }
  for (const x of obras) {
    unicos(x.itens);
    // item que o grupo subtrai (fator -1) aparece negativo, como entra na conta
    const fat = x.linha ? fatores("I", x.linha, x.itens.flatMap((i) => (i.linha ? [i.linha] : []))) : new Map<number, number>();
    for (const i of x.itens) {
      const f = i.linha ? fat.get(i.linha) : undefined;
      if (f !== undefined && f < 0 && i.total !== null) i.total = i.total * f;
    }
  }

  // ---- gestão (colunas B e C), até a tabela "Infraestrutura do Empreendimento" ----
  // os grupos são estes (a soma de cada um está na linha dele); as outras linhas são itens, com ou sem o " - "
  const gestao: Grupo[] = [];
  let h: Grupo | null = null;
  for (let r = 8; r <= 140; r++) {
    const nome = txt(cel(c, `B${r}`));
    if (!nome) continue;
    const n = norm(nome);
    if (n.includes("infraestruturadoempreendimento") || n.startsWith("anotac")) break;
    if (n === "descricao") continue;
    if (!GRUPOS_GESTAO.test(nome)) {
      if (!h) continue;
      const nomeLimpo = limpar(nome);
      h.itens.push({ id: `${h.id}.${slug(nomeLimpo)}`, nome: nomeSimples(nomeLimpo), opcao: null, unitario: null, quantidade: null, unidade: unidadeDe(nomeLimpo), total: num(cel(c, `C${r}`)), linha: r });
    } else {
      h = { id: `g-${slug(nome)}`, nome: grafia(nome), total: num(cel(c, `C${r}`)), implanta: null, itens: [], linha: r };
      gestao.push(h);
    }
  }
  // valor da planilha = unitário; quantidade = quantas vezes entra no grupo (prazo, lotes...); total = o que soma
  const meses = num(cel(c, "C3")), lotes = num(cel(d, "C22"));
  const perto = (a: number, b: number | null) => b !== null && Math.abs(a - b) < 1e-9;
  for (const x of gestao) {
    unicos(x.itens);
    const fat = x.linha ? fatores("C", x.linha, x.itens.flatMap((i) => (i.linha ? [i.linha] : []))) : new Map<number, number>();
    for (const i of x.itens) {
      const f = i.linha ? fat.get(i.linha) : undefined;
      if (f === undefined) continue;
      const v = i.total;
      i.unitario = v;
      i.quantidade = f === 1 ? null : f;
      i.total = v === null ? null : v * f;
      if (perto(f, meses)) i.unidade = "mês";
      else if (perto(f, lotes)) i.unidade = "lote";
    }
  }

  // ---- resumo (colunas K a M): o total do empreendimento e o peso de cada parte ----
  let total: number | null = null;
  const resumo: Resumo[] = [];
  for (let r = 3; r <= 60; r++) {
    const nome = txt(cel(c, `K${r}`));
    if (!nome || norm(nome) === "descricao") continue;
    const v = num(cel(c, `M${r}`));
    if (/custo total/i.test(nome)) {
      total = v;
      continue;
    }
    if (v === null || v === 0) continue;
    resumo.push({ id: `r-${slug(nome)}`, nome: grafia(nome), pct: num(cel(c, `L${r}`)), valor: v });
  }
  unicos(resumo);

  return {
    arquivo: nomeArquivo,
    lidoEm,
    abas: { custos: c.nome, dados: d?.nome ?? null },
    total,
    info: {
      tipo: txt(cel(d, "C4")),
      area: num(cel(d, "C5")),
      lotes: num(cel(d, "C22")),
      lote: num(cel(d, "C6")),
      regiao: txt(cel(c, "C6")),
      meses: num(cel(c, "C3")),
    },
    resumo,
    // sem valor nenhum (ex.: construção civil sem quantidades) não entra
    obras: obras.filter((x) => manter.has(x.id) || x.total || x.itens.some((i) => i.total)),
    gestao: gestao.filter((x) => manter.has(x.id) || x.total || x.itens.some((i) => i.total)),
  };
}

/**
 * Números trocados na página antes do modelo existir (só a soma do que foi mexido): viram ajustes por célula
 * sobre a planilha de origem, para as contas seguirem as fórmulas daqui em diante sem perder o que foi digitado.
 */
export function ajustesDaVersaoAntiga(antigo: DadosCustos, base: DadosCustos): Ajustes {
  const c = base.abas!.custos, dd = base.abas!.dados;
  const aj: Ajustes = {};
  const dif = (a: unknown, b: unknown) => (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) > 1e-9 : a !== b);
  const info = antigo.info, bi = base.info;
  if (dd) {
    if (dif(info.area, bi.area)) aj[`${dd}!C5`] = info.area;
    if (dif(info.lote, bi.lote)) aj[`${dd}!C6`] = info.lote;
    if (dif(info.lotes, bi.lotes)) aj[`${dd}!C22`] = info.lotes;
    if (dif(info.tipo, bi.tipo)) aj[`${dd}!C4`] = info.tipo;
  }
  if (dif(info.meses, bi.meses)) aj[`${c}!C3`] = info.meses;
  if (dif(info.regiao, bi.regiao)) aj[`${c}!C6`] = info.regiao;
  for (const g of base.obras) {
    const ga = antigo.obras.find((x) => x.id === g.id);
    if (!ga) continue;
    if (g.linhaImplanta && (ga.implanta !== false) !== (g.implanta !== false)) aj[`${c}!C${g.linhaImplanta}`] = ga.implanta === false ? "Não" : "Sim";
    for (const i of g.itens) {
      const ia = ga.itens.find((x) => x.id === i.id && x.nome === i.nome);
      if (!ia || !i.linha) continue;
      if (dif(ia.quantidade, i.quantidade)) aj[`${c}!H${i.linha}`] = ia.quantidade;
      if (dif(ia.unitario, i.unitario)) aj[`${c}!G${i.linha}`] = ia.unitario;
      if ((ia.quantidade === null || ia.unitario === null) && dif(ia.total, i.total)) aj[`${c}!I${i.linha}`] = ia.total;
    }
  }
  for (const g of base.gestao) {
    const ga = antigo.gestao.find((x) => x.id === g.id);
    if (!ga) continue;
    if (g.linha && dif(ga.total, g.total)) aj[`${c}!C${g.linha}`] = ga.total;
    for (const i of g.itens) {
      const ia = ga.itens.find((x) => x.id === i.id && x.nome === i.nome);
      // na versão antiga o total do item era o número da célula (hoje o unitário)
      const celula = i.unitario ?? i.total;
      if (ia && i.linha && dif(ia.total, celula)) aj[`${c}!C${i.linha}`] = ia.total;
    }
  }
  return aj;
}
