/**
 * Formatos de empreendimento. Cada formato tem suas listas de obras e benfeitorias,
 * os padrões dos números e o texto da lei. As listas iniciais vêm das propostas
 * oficiais em Word (referencias/propostas-modelo/).
 */
import type { StudyResult } from "./calc";
import type { Overrides } from "./proposals";

export const FORMATOS = ["loteamento_aberto", "condominio_urbano", "chacreamento_aberto", "chacreamento_condominio"] as const;
export type FormatoKey = (typeof FORMATOS)[number];

/** Medidas que o sistema sabe calcular pela área e pelos lotes (ver calc.ts → infra) */
export const QTD_CALC = {
  logradouros: { label: "Área das ruas", unit: "m²" },
  rede: { label: "Extensão da rede principal", unit: "ml" },
  ligacoes: { label: "Ligações (6 m por lote)", unit: "ml" },
  eletrica: { label: "Rede elétrica", unit: "ml" },
  guias: { label: "Guias e sarjetas", unit: "ml" },
  calcadas: { label: "Calçadas", unit: "m²" },
  arvores: { label: "Uma por lote", unit: "un." },
} as const;
export type QtdCalcKey = keyof typeof QTD_CALC;

export type Qtd =
  | { kind: "calc"; key: QtdCalcKey }
  | { kind: "fixa"; text: string }
  /** Etiqueta dourada ("A projetar", "Na aprovação") com unidade opcional ao lado */
  | { kind: "projetar"; label?: string; unit?: string };

export type ObraItem = { id: string; obra: string; desc: string; qtd: Qtd };
export type Benfeitoria = { id: string; texto: string };

export type FormatoContent = {
  label: string;
  /** Nome curto usado na capa: "Loteamento aberto em Martinópolis" */
  curto: string;
  /** Modelo citado na carta: "Loteamento Aberto" */
  modelo: string;
  lei: string;
  padroes: { metragemLote: number; frenteLote: number; aproveitamento: number };
  infra: ObraItem[];
  complementar: ObraItem[];
  benfeitorias: Benfeitoria[];
  /** Linhas de "Contatos exclusivos" (nome, telefone e e-mail ficam nos textos li.<id>.*) */
  contatos: { id: string }[];
  /** Textos e imagens alterados no template para este formato */
  overrides: Overrides;
};

export type ListaSecao = "infra" | "complementar" | "benfeitorias" | "contatos";

/** Ajuste de uma lista feito numa proposta: o resto continua vindo do template */
export type ListaDiff = { added?: (ObraItem | Benfeitoria)[]; removed?: string[] };

export function formatoTemDados(c: FormatoContent | undefined) {
  return !!c && c.infra.length + c.complementar.length + c.benfeitorias.length > 0;
}

export function qtdTexto(q: Qtd, r: StudyResult, fmtNum: (n: number, d?: number) => string) {
  if (q.kind === "calc") {
    const v = r.infra[q.key];
    return `${q.key === "arvores" ? String(v) : fmtNum(v)} ${QTD_CALC[q.key].unit}`;
  }
  if (q.kind === "fixa") return q.text;
  return null;
}

/** Lista final = itens do template − removidos na proposta + adicionados na proposta */
export function aplicarDiff<T extends { id: string }>(base: T[], diff: unknown): T[] {
  const d = (diff ?? {}) as ListaDiff;
  const removed = new Set(d.removed ?? []);
  return [...base.filter((i) => !removed.has(i.id)), ...((d.added ?? []) as unknown as T[]).filter((i) => !removed.has(i.id))];
}

// ------------------------------------------------------------ listas iniciais

let n = 0;
const id = (p: string) => `${p}${++n}`;
const calc = (key: QtdCalcKey): Qtd => ({ kind: "calc", key });
const proj = (unit?: string): Qtd => ({ kind: "projetar", unit });
const ob = (p: string, obra: string, desc: string, qtd: Qtd): ObraItem => ({ id: id(p), obra, desc, qtd });
const bf = (p: string, texto: string): Benfeitoria => ({ id: id(p), texto });

function infraUrbana(p: string, pavimento: [string, string]): ObraItem[] {
  return [
    ob(p, "Topografia e terraplenagem", "Medir e nivelar o terreno", proj("m²")),
    ob(p, "Abertura de logradouros", "Abrir as ruas", calc("logradouros")),
    ob(p, "Rede principal de esgoto", "Cano grande de coleta e tratamento", calc("rede")),
    ob(p, "Ligações de esgoto", "Do cano grande até cada lote", calc("ligacoes")),
    ob(p, "Boca de lobo dupla", "Entradas de água da chuva na rua", proj("un.")),
    ob(p, "Rede principal de água", "Cano grande de água", calc("rede")),
    ob(p, "Ligação de rede de água", "Do cano grande até cada lote", calc("ligacoes")),
    ob(p, "Rede de drenagem pluvial", "Caminho da água da chuva", proj("m²")),
    ob(p, "Drenagem “bigode”", "Ligação à rede principal", proj("un.")),
    ob(p, "Dissipador de drenagem", "Galeria em forma de escada", { kind: "fixa", text: "1 un." }),
    ob(p, "Poços de visita", "Tampas redondas de água, drenagem e esgoto", proj("un.")),
    ob(p, "Rede elétrica", "Postes e fios de luz", calc("eletrica")),
    ob(p, pavimento[0], pavimento[1], calc("logradouros")),
    ob(p, "Guias e sarjetas", "Meio-fio e canaleta da rua", calc("guias")),
    ob(p, "Plantio de árvores", "Uma árvore na frente de cada lote", calc("arvores")),
    ob(p, "Calçadas", "Grama líquida, tapetes de grama ou concreto", calc("calcadas")),
    ob(p, "Jardinagem e paisagismo", "Plantas e jardins", proj()),
  ];
}

function complementarUrbana(p: string, construcao: string): ObraItem[] {
  return [
    ob(p, "Reservatório de água (quando houver)", "", proj()),
    ob(p, "Casa química de tratamento de água (quando houver)", "", proj()),
    ob(p, "Estação de tratamento de esgoto (quando houver)", "", proj()),
    ob(p, "Sinalização de trânsito", "", proj()),
    ob(p, construcao, "", proj()),
    ob(p, "Cronograma de obras", "", { kind: "projetar", label: "Na aprovação" }),
  ];
}

const BASE_OV: Overrides = {};
const CONTATOS = [{ id: "ct1" }];

export const FORMATOS_INICIAIS: Record<FormatoKey, FormatoContent> = {
  loteamento_aberto: {
    label: "Loteamento Aberto Urbano",
    curto: "Loteamento aberto",
    modelo: "Loteamento Aberto",
    lei: "Lei Federal n.º 6.766/79",
    padroes: { metragemLote: 200, frenteLote: 8, aproveitamento: 0.5 },
    infra: infraUrbana("la", ["Pavimentação CBUQ", "Asfalto nas ruas"]),
    complementar: complementarUrbana("lac", "Construção civil (quando houver)"),
    benfeitorias: [
      "📹 Sistema de segurança (CFTV)", "🌳 Praça equipada e arborizada", "💪 Academia robusta ao ar livre", "🛝 Playground",
      "🚶 Pista de caminhada (piso saibro)", "🏀 Quadra poliesportiva", "🎾 Quadra de beach tennis", "🐕 Pet place", "🌿 Área verde",
      "🌱 Reflorestamento (quando houver)",
    ].map((t) => bf("lab", t)),
    contatos: CONTATOS,
    overrides: BASE_OV,
  },
  condominio_urbano: {
    label: "Condomínio Urbano",
    curto: "Condomínio fechado de lotes",
    modelo: "Condomínio Residencial Fechado de Lotes",
    lei: "Lei Federal n.º 13.465/2017",
    padroes: { metragemLote: 360, frenteLote: 12, aproveitamento: 0.5 },
    infra: infraUrbana("cu", ["Pavimentação em paver", "Piso intertravado nas ruas"]),
    complementar: complementarUrbana("cuc", "Construção civil"),
    benfeitorias: [
      "🏛️ Portaria (90 a 120 m²)", "🧱 Muro frontal de alvenaria (pilares em relevo e chapéus de concreto)", "📹 Sistema de segurança (CFTV)",
      "🏊 Piscina", "🍖 Espaço gourmet com quiosque, churrasqueira e toaletes", "🎉 Salão de festas", "🌳 Praças de convivência equipadas e arborizadas",
      "🏋️ Academia indoor (fechada)", "💪 Academia robusta ao ar livre", "🛝 Playground", "🚶 Pista de caminhada", "🏀 Quadra poliesportiva",
      "🎾 Quadra de beach tennis", "🐕 Pet place", "🌿 Área verde", "🧘 Espaço zen", "🌄 Mirante (deck panorâmico)", "🌱 Reflorestamento (quando houver)",
    ].map((t) => bf("cub", t)),
    contatos: CONTATOS,
    overrides: BASE_OV,
  },
  chacreamento_aberto: {
    label: "Chacreamento Aberto",
    curto: "Chacreamento aberto",
    modelo: "Loteamento Residencial Aberto de Lotes formato Chacreamento",
    lei: "Lei Federal n.º 6.766/79",
    padroes: { metragemLote: 850, frenteLote: 17, aproveitamento: 0.65 },
    // No Word deste formato as quantidades estão em branco: tudo "A projetar"
    infra: [
      ob("ca", "Topografia", "Medir o terreno", proj()),
      ob("ca", "Terraplenagem e abertura de logradouros", "Nivelar e abrir as ruas", proj("m²")),
      ob("ca", "Esgotamento sanitário: biodigestor ou fossa séptica", "Tratamento do esgoto em cada chácara", proj("un.")),
      ob("ca", "Poço artesiano", "Captação de água", proj("un.")),
      ob("ca", "Reservatório de água", "Caixa d'água do empreendimento", proj()),
      ob("ca", "Rede principal de água", "Cano grande de água", proj("ml")),
      ob("ca", "Ligação de rede de água", "Do cano grande até cada chácara", proj("ml")),
      ob("ca", "Dissipador de drenagem", "Galeria em forma de escada", proj("un.")),
      ob("ca", "Rede elétrica", "Postes e fios de luz", proj("ml")),
      ob("ca", "Pavimentação primária (britas 1 e 2)", "Ruas de brita", proj("m²")),
      ob("ca", "Plantio de árvores", "Uma árvore na frente de cada chácara", proj("un.")),
      ob("ca", "Área verde", "Áreas preservadas e arborizadas", proj()),
      ob("ca", "Calçadas", "Grama líquida ou tapetes de grama", proj("m²")),
      ob("ca", "Jardinagem e paisagismo", "Plantas e jardins", proj()),
    ],
    complementar: [
      ob("cac", "Casa química de tratamento de água (quando houver)", "", proj()),
      ob("cac", "Sinalização de trânsito", "", proj()),
      ob("cac", "Construção civil: portal de acesso e área de lazer", "", proj()),
      ob("cac", "Reflorestamento (quando houver)", "", proj()),
      ob("cac", "Cronograma de obras", "", { kind: "projetar", label: "Na aprovação" }),
    ],
    benfeitorias: [
      "🚪 Portal de acesso ao empreendimento", "📹 Sistema de segurança", "🌳 Praças equipadas e arborizadas", "🥾 Trilha", "🪂 Tirolesa",
      "🚶 Pista de caminhada", "🎾 Quadra de beach tennis", "💪 Academia robusta ao ar livre", "🛝 Playground", "🐕 Pet place",
    ].map((t) => bf("cab", t)),
    contatos: CONTATOS,
    overrides: BASE_OV,
  },
  chacreamento_condominio: {
    label: "Chacreamento Condomínio",
    curto: "Chacreamento em condomínio",
    modelo: "Condomínio Residencial Fechado de Lotes formato Chacreamento",
    lei: "Lei Federal n.º 13.465/2017",
    padroes: { metragemLote: 1000, frenteLote: 20, aproveitamento: 0.5 },
    infra: infraUrbana("cc", ["Pavimentação em paver", "Piso intertravado nas ruas"]),
    complementar: complementarUrbana("ccc", "Construção civil"),
    benfeitorias: [
      "🏛️ Portaria colonial de acesso (90 a 120 m²)", "🧱 Muro frontal de alvenaria com portões de ferro estilo colonial",
      "🌿 Alambrado e cerca viva nas laterais e no fundo", "⚽ Espaço gourmet integrado com campo society (25×45, grama natural) e vestiários",
      "🏊 Piscina", "🍖 Quiosque com churrasqueira e toaletes", "📹 Sistema de segurança", "🌐 Internet a cabo", "🎉 Salão de festas e eventos",
      "🌳 Praças equipadas", "🥾 Trilha", "🧘 Espaço zen", "🌄 Mirante (deck panorâmico)", "🛶 Lago artificial com pista de caminhada",
      "🎾 Quadra de beach tennis", "🏀 Quadra poliesportiva", "🏋️ Academia indoor", "💪 Academia robusta ao ar livre", "🛝 Playground", "🐕 Pet place",
    ].map((t) => bf("ccb", t)),
    contatos: CONTATOS,
    overrides: BASE_OV,
  },
};

export function parseFormato(v: unknown): FormatoKey {
  return FORMATOS.includes(v as FormatoKey) ? (v as FormatoKey) : "loteamento_aberto";
}

export function parseContent(v: unknown, formato: FormatoKey): FormatoContent {
  const c = v as Partial<FormatoContent> | null;
  const base = FORMATOS_INICIAIS[formato];
  if (!c || typeof c !== "object") return base;
  return {
    ...base,
    ...c,
    padroes: { ...base.padroes, ...(c.padroes ?? {}) },
    infra: Array.isArray(c.infra) ? c.infra : base.infra,
    complementar: Array.isArray(c.complementar) ? c.complementar : base.complementar,
    benfeitorias: Array.isArray(c.benfeitorias) ? c.benfeitorias : base.benfeitorias,
    contatos: Array.isArray(c.contatos) ? c.contatos : base.contatos,
    overrides: (c.overrides as Overrides) ?? {},
  };
}
