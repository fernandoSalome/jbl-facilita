/**
 * Apresentação de custos: lê a aba "CUSTOS" (e o resumo de "DADOS DO PARCELAMENTO") da planilha
 * JBL_Planilha(+)Infra com os valores que o próprio Excel calculou e guardou no arquivo. Nada é recalculado:
 * a página mostra os números da planilha.
 */
import { lerXlsx, type Aba, type Valor } from "./xlsx";

export type Item = { id: string; nome: string; opcao: string | null; unitario: number | null; quantidade: number | null; unidade: string | null; total: number | null };
export type Grupo = { id: string; nome: string; total: number | null; implanta: boolean | null; itens: Item[] };
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
  const aba = (nome: string) => abas.find((w) => norm(w.nome) === norm(nome));
  const c = aba("CUSTOS");
  if (!c) throw new Error('A planilha não tem a aba "CUSTOS".');
  const d = aba("DADOS DO PARCELAMENTO");
  const cel = (ws: Aba | undefined, ref: string): Valor => ws?.celulas.get(ref) ?? null;

  // ---- "Implantará?" (B63:C69): Sim / Não de cada grupo de obras ----
  const implanta = new Map<string, boolean>();
  for (let r = 1; r <= 200; r++) {
    const b = txt(cel(c, `B${r}`));
    if (b && norm(b).includes("infraestruturadoempreendimento")) {
      for (let k = r + 1; k <= r + 12; k++) {
        const nome = txt(cel(c, `B${k}`));
        const sim = txt(cel(c, `C${k}`));
        if (!nome) break;
        if (sim) implanta.set(norm(nome).replace("cateiro", "canteiro"), /^s/i.test(sim));
      }
      break;
    }
  }
  const implantaDe = (grupo: string): boolean | null => {
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
      });
    } else if (/padr[aã]o da constru/i.test(nome)) {
      // escolha do padrão (A, B ou C): vai como opção do grupo de construção civil
      if (g) g.itens.push({ id: `${g.id}.padrao`, nome, opcao: txt(cel(c, `G${r}`)), unitario: null, quantidade: null, unidade: null, total: null });
    } else {
      g = { id: slug(nome), nome: grafia(nome), total: num(cel(c, `I${r}`)), implanta: implantaDe(nome), itens: [] };
      obras.push(g);
    }
  }
  for (const x of obras) unicos(x.itens);

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
      h.itens.push({ id: `${h.id}.${slug(nomeLimpo)}`, nome: nomeSimples(nomeLimpo), opcao: null, unitario: null, quantidade: null, unidade: unidadeDe(nomeLimpo), total: num(cel(c, `C${r}`)) });
    } else {
      h = { id: `g-${slug(nome)}`, nome: grafia(nome), total: num(cel(c, `C${r}`)), implanta: null, itens: [] };
      gestao.push(h);
    }
  }
  for (const x of gestao) unicos(x.itens);

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
    lidoEm: new Date().toISOString(),
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
    obras: obras.filter((x) => x.total || x.itens.some((i) => i.total)),
    gestao: gestao.filter((x) => x.total || x.itens.some((i) => i.total)),
  };
}
