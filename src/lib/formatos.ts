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
  rede: { label: "Extensão da rede principal", unit: "m" },
  ligacoes: { label: "Ligações de água e esgoto (por lote)", unit: "m" },
  eletrica: { label: "Rede elétrica", unit: "m" },
  guias: { label: "Guias e sarjetas", unit: "m" },
  calcadas: { label: "Calçadas", unit: "m²" },
  arvores: { label: "Uma por lote", unit: "un." },
  reservatorio: { label: "Reservatório (1 a cada 100 lotes)", unit: "un." },
  casaQuimica: { label: "Casa química (1)", unit: "un." },
  ligacoesEsgoto: { label: "Ligações de esgoto (rua + 4 m por lote)", unit: "m" },
  drenagem: { label: "Rede de drenagem (20% das vias)", unit: "m" },
  pocosVisita: { label: "Poços de visita (drenagem + esgoto)", unit: "un." },
  bocaLobo: { label: "Bocas de lobo (2 por PV de drenagem)", unit: "un." },
  bigode: { label: "Bigode (PV × largura da rua)", unit: "m" },
} as const;
export type QtdCalcKey = keyof typeof QTD_CALC;

export type Qtd =
  | { kind: "calc"; key: QtdCalcKey }
  | { kind: "fixa"; text: string }
  /** Etiqueta dourada ("A projetar", "Na aprovação") com unidade opcional ao lado */
  | { kind: "projetar"; label?: string; unit?: string };

export type ObraItem = { id: string; obra: string; desc: string; qtd: Qtd };
/** Benfeitoria: o emoji fica à parte do texto (escolhido numa grade). Itens antigos têm o emoji no começo do texto. */
export type Benfeitoria = { id: string; texto: string; emoji?: string };

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
  /** Textos e imagens alterados no template (os compartilhados e os deste formato) */
  overrides: Overrides;
  /** Fórmulas de obra da planilha nova (2026, a regra em todos os tipos); vazio = as da planilha anterior */
  planilha?: "2026";
  /** Textos que estavam diferentes entre os formatos quando foram unificados (para conferir no editor) */
  conflitos?: Conflito[];
};

/**
 * O template tem duas camadas. O que muda com o tipo de loteamento (listas de obras,
 * benfeitorias, lei, modelo, padrões e os textos dos itens dessas listas) e o que é
 * igual nos 4 tipos (todo o resto: textos, imagens, cores, contatos). Cada versão de
 * formato guarda as duas, para a proposta continuar lendo uma versão só.
 */
export type TipoContent = Omit<FormatoContent, "contatos" | "overrides" | "conflitos"> & { overrides: Overrides };
export type ComumContent = { overrides: Overrides; contatos: { id: string }[] };
export type Conflito = { k: string; opcoes: { formato: FormatoKey; valor: unknown }[]; escolhido: FormatoKey };

/** Ids dos itens das listas do tipo (obras e benfeitorias) */
export function idsDoTipo(c: Pick<FormatoContent, "infra" | "complementar" | "benfeitorias">) {
  return new Set([...c.infra, ...c.complementar, ...c.benfeitorias].map((i) => i.id));
}

/** A chave de override pertence ao tipo? (texto, quantidade ou estilo de um item das listas dele) */
export function chaveDoTipo(k: string, ids: Set<string>) {
  const m = k.replace(/^estilo\./, "").match(/^liq?\.([^.]+)/);
  return !!m && ids.has(m[1]);
}

export function separar(c: FormatoContent): { comum: ComumContent; tipo: TipoContent } {
  const ids = idsDoTipo(c);
  const comum: Overrides = {};
  const doTipo: Overrides = {};
  for (const [k, v] of Object.entries(c.overrides ?? {})) (chaveDoTipo(k, ids) ? doTipo : comum)[k] = v;
  const { contatos, overrides: _o, conflitos: _c, ...resto } = c;
  return { comum: { overrides: comum, contatos }, tipo: { ...resto, overrides: doTipo } };
}

export function juntar(comum: ComumContent, tipo: TipoContent): FormatoContent {
  return { ...tipo, contatos: comum.contatos, overrides: { ...comum.overrides, ...tipo.overrides } };
}

/** JSON com as chaves em ordem (o Postgres reordena as chaves dos campos Json) */
export function estavel(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(estavel).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v as object)
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${estavel((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

/**
 * Junta a parte compartilhada das versões mais recentes dos 4 formatos. Antes, cada
 * formato tinha seus próprios textos: o que foi alterado em um passa a valer para todos.
 * Se o mesmo texto ficou diferente em dois formatos, vale a alteração mais recente.
 */
export function mesclarComum(versoes: { formato: FormatoKey; content: FormatoContent; createdAt: Date | string }[]) {
  const ordem = [...versoes].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  const partes = ordem.map((v) => ({ formato: v.formato, ...separar(v.content) }));
  const overrides: Overrides = {};
  const vistos: Record<string, Conflito["opcoes"]> = {};
  for (const p of partes) {
    for (const [k, v] of Object.entries(p.comum.overrides)) {
      overrides[k] = v;
      const ops = (vistos[k] ??= []);
      const i = ops.findIndex((o) => estavel(o.valor) === estavel(v));
      if (i >= 0) ops.splice(i, 1); // fica a ocorrência mais recente de cada valor
      ops.push({ formato: p.formato, valor: v });
    }
  }
  const conflitos: Conflito[] = Object.entries(vistos)
    .filter(([, ops]) => ops.length > 1)
    .map(([k, ops]) => ({ k, opcoes: [...ops].reverse(), escolhido: ops[ops.length - 1].formato }));
  const comum: ComumContent = { overrides, contatos: partes.length ? partes[partes.length - 1].comum.contatos : [{ id: "ct1" }] };
  const iguais = partes.every((p) => estavel(p.comum) === estavel(partes[0].comum));
  return { comum, conflitos, iguais, tipos: Object.fromEntries(partes.map((p) => [p.formato, p.tipo])) as Record<FormatoKey, TipoContent> };
}

// ------------------------------------------------------------ emoji das benfeitorias

const EMOJI_INICIO = /^\s*((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|⃣|[\u{1F3FB}-\u{1F3FF}]|‍(?:\p{Extended_Pictographic}|️)+)*)\s*/u;

/** "🌳 Praça" → { emoji: "🌳", texto: "Praça" } */
export function separarEmoji(t: string): { emoji: string | null; texto: string } {
  const m = t.match(EMOJI_INICIO);
  return m ? { emoji: m[1], texto: t.slice(m[0].length) } : { emoji: null, texto: t };
}

/** Emoji padrão pelo tipo da benfeitoria (para itens sem emoji escolhido) */
const EMOJI_POR_TIPO: [RegExp, string][] = [
  [/portaria|guarita/, "🏛️"],
  [/portal/, "🚪"],
  [/muro|alambrado|cerca|fechamento/, "🧱"],
  [/seguranc|cftv|camera|monitora/, "📹"],
  [/piscina/, "🏊"],
  [/gourmet|churrasq|quiosque/, "🍖"],
  [/salao|festa|evento/, "🎉"],
  [/academia (indoor|fechada)|fitness/, "🏋️"],
  [/academia/, "💪"],
  [/playground|parquinho|brinquedo/, "🛝"],
  [/pista|caminhada|cooper/, "🚶"],
  [/beach|tenis|padel/, "🎾"],
  [/society|futebol|campo/, "⚽"],
  [/quadra|poliesportiva|basquete|futsal|volei/, "🏀"],
  [/\bpet\b|cachorro|canil/, "🐕"],
  [/reflorest|plantio|muda/, "🌱"],
  [/area verde|bosque|mata|jardim|paisag/, "🌿"],
  [/praca/, "🌳"],
  [/zen|medita|yoga/, "🧘"],
  [/mirante|deck/, "🌄"],
  [/trilha/, "🥾"],
  [/tirolesa/, "🪂"],
  [/lago|represa/, "🛶"],
  [/internet|wi-?fi|fibra/, "🌐"],
  [/ilumina|energia/, "💡"],
  [/agua|reservatorio|poco/, "💧"],
  [/asfalto|paviment|rua/, "🛣️"],
  [/brinquedoteca|kids|infantil/, "🧸"],
  [/jogos/, "🎱"],
  [/lounge|espaco/, "🛋️"],
];
export function emojiPadrao(texto: string): string {
  const n = texto.replace(/<[^>]+>/g, " ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return EMOJI_POR_TIPO.find(([re]) => re.test(n))?.[1] ?? "✨";
}

/** Tira o emoji do começo de um texto em HTML (pode vir depois de tags de abertura: "<b>🌳 Praça</b>") */
export function semEmojiHtml(html: string) {
  const m = html.match(/^((?:<[a-z][^>]*>)*)([\s\S]*)$/i)!;
  return m[1] + separarEmoji(m[2]).texto;
}

export type ListaSecao = "infra" | "complementar" | "benfeitorias" | "contatos";

/** Ajuste de uma lista feito numa proposta: o resto continua vindo do template */
export type ListaDiff = { added?: (ObraItem | Benfeitoria)[]; removed?: string[] };

export function formatoTemDados(c: FormatoContent | undefined) {
  return !!c && c.infra.length + c.complementar.length + c.benfeitorias.length > 0;
}

/** Nas tabelas a unidade de comprimento é "m" (itens antigos guardam "ml") */
export const unidade = (u?: string) => (u === "ml" ? "m" : u);
/** "3.000 ml" escrito à mão → "3.000 m" */
export const semMl = (t: string) => t.replace(/(\d[\d.,]*\s*)ml\b/gi, "$1m");

export function qtdTexto(q: Qtd, r: StudyResult, fmtNum: (n: number, d?: number) => string) {
  if (q.kind === "calc") {
    const v = r.infra[q.key];
    if (v === null || v === undefined) return null; // falta um dado da planilha: "A projetar"
    return `${Number.isInteger(v) ? fmtNum(v, 0) : fmtNum(v)} ${QTD_CALC[q.key].unit}`;
  }
  if (q.kind === "fixa") return semMl(q.text);
  return null;
}

/** Lista final = itens do template − removidos na proposta + adicionados na proposta */
export function aplicarDiff<T extends { id: string }>(base: T[], diff: unknown): T[] {
  const d = (diff ?? {}) as ListaDiff;
  const removed = new Set(d.removed ?? []);
  return [...base.filter((i) => !removed.has(i.id)), ...((d.added ?? []) as unknown as T[]).filter((i) => !removed.has(i.id))];
}

/** Nome da obra como aparece na proposta (texto alterado no template, sem HTML), para comparar */
export function nomeDaObra(it: ObraItem, ov: Overrides) {
  const t = ov[`li.${it.id}.obra`];
  return (typeof t === "string" ? t.replace(/^html:/, "") : it.obra)
    .replace(/<[^>]+>/g, " ").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Coloca no fim das listas de obras (infraestrutura e complementar) do destino os itens da origem,
 * com os textos e estilos alterados no template. Nada do destino sai. Item que o destino já tem
 * (mesmo id ou obra com o mesmo nome) não entra de novo.
 */
export function copiarObras(origem: FormatoContent, destino: FormatoContent) {
  const ids = new Set([...destino.infra, ...destino.complementar].map((i) => i.id));
  const nomes = new Set([...destino.infra, ...destino.complementar].map((i) => nomeDaObra(i, destino.overrides)));
  const copiados: ObraItem[] = [];
  const repetidos: ObraItem[] = [];
  const novos = (itens: ObraItem[]) =>
    itens.filter((it) => {
      if (ids.has(it.id) || nomes.has(nomeDaObra(it, origem.overrides))) return !repetidos.push(it);
      copiados.push(it);
      return true;
    });
  const infra = [...destino.infra, ...novos(origem.infra)];
  const complementar = [...destino.complementar, ...novos(origem.complementar)];
  const doCopiado = idsDoTipo({ infra: copiados, complementar: [], benfeitorias: [] });
  const overrides = { ...destino.overrides };
  for (const [k, v] of Object.entries(origem.overrides)) if (chaveDoTipo(k, doCopiado)) overrides[k] = v;
  return { content: { ...destino, infra, complementar, overrides }, copiados, repetidos };
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
    ob(p, "Ligações de esgoto", "Do cano grande até cada lote", calc("ligacoesEsgoto")),
    ob(p, "Boca de lobo dupla", "Entradas de água da chuva na rua", calc("bocaLobo")),
    ob(p, "Rede principal de água", "Cano grande de água", calc("rede")),
    ob(p, "Ligação de rede de água", "Do cano grande até cada lote", calc("ligacoes")),
    ob(p, "Rede de drenagem pluvial", "Caminho da água da chuva", calc("drenagem")),
    ob(p, "Drenagem “bigode”", "Ligação à rede principal", calc("bigode")),
    ob(p, "Dissipador de drenagem", "Galeria em forma de escada", { kind: "fixa", text: "1 un." }),
    ob(p, "Poços de visita", "Tampas redondas de água, drenagem e esgoto", calc("pocosVisita")),
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
    ob(p, "Reservatório de água (se houver)", "", calc("reservatorio")),
    ob(p, "Casa química de tratamento de água (se houver)", "", calc("casaQuimica")),
    ob(p, "Estação de tratamento de esgoto (se houver)", "", proj()),
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
    complementar: complementarUrbana("lac", "Construção civil (se houver)"),
    benfeitorias: [
      "📹 Sistema de segurança (CFTV)", "🌳 Praça equipada e arborizada", "💪 Academia robusta ao ar livre", "🛝 Playground",
      "🚶 Pista de caminhada (piso saibro)", "🏀 Quadra poliesportiva", "🎾 Quadra de beach tennis", "🐕 Pet place", "🌿 Área verde",
      "🌱 Reflorestamento (quando houver)",
    ].map((t) => bf("lab", t)),
    contatos: CONTATOS,
    overrides: BASE_OV,
    planilha: "2026",
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
    planilha: "2026",
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
      ob("cac", "Casa química de tratamento de água (se houver)", "", proj()),
      ob("cac", "Sinalização de trânsito", "", proj()),
      ob("cac", "Construção civil: portal de acesso e área de lazer", "", proj()),
      ob("cac", "Reflorestamento (se houver)", "", proj()),
      ob("cac", "Cronograma de obras", "", { kind: "projetar", label: "Na aprovação" }),
    ],
    benfeitorias: [
      "🚪 Portal de acesso ao empreendimento", "📹 Sistema de segurança", "🌳 Praças equipadas e arborizadas", "🥾 Trilha", "🪂 Tirolesa",
      "🚶 Pista de caminhada", "🎾 Quadra de beach tennis", "💪 Academia robusta ao ar livre", "🛝 Playground", "🐕 Pet place",
    ].map((t) => bf("cab", t)),
    contatos: CONTATOS,
    overrides: BASE_OV,
    planilha: "2026",
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
      "🏛️ Portaria colonial de acesso (90 a 120 m²)", "🧱 Muro frontal imponente de alvenaria (pilares em relevo e chapéus de concreto) e portões de ferro estilo colonial",
      "🌿 Alambrado e cerca viva nas laterais e no fundo", "⚽ Espaço gourmet integrado com campo society (25×45, grama natural) e vestiários",
      "🏊 Piscina", "🍖 Quiosque com churrasqueira e toaletes", "📹 Sistema de segurança", "🌐 Internet a cabo", "🎉 Salão de festas e eventos",
      "🌳 Praças equipadas", "🥾 Trilha", "🧘 Espaço zen", "🌄 Mirante (deck panorâmico)", "🛶 Lago artificial com pista de caminhada",
      "🎾 Quadra de beach tennis", "🏀 Quadra poliesportiva", "🏋️ Academia indoor", "💪 Academia robusta ao ar livre", "🛝 Playground", "🐕 Pet place",
    ].map((t) => bf("ccb", t)),
    contatos: CONTATOS,
    overrides: BASE_OV,
    planilha: "2026",
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
