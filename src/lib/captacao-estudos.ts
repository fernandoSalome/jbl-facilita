/**
 * Pré-viabilidade (pedido 19/11/2026), seguindo ~/JBL-estudos/PADRAO-ESTUDO.md:
 *  1. Triagem do terreno (Estudo 1) → resumo no JBL - Central com "Sigo para o mercadológico? 1 Sim · 2 Não"
 *  2. Mercadológico preliminar de concorrentes (Estudo 2), só depois do "sim"
 *  3. Apresentação da reunião (slides), gerada dos dois estudos
 * Funções puras: validação, resumo, slides, pendências do dia.
 */
import { nomeEtapa, tituloArea, validarDocumentos, type Resposta } from "./captacao";

const txt = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const lista = <T>(v: unknown, max: number, f: (x: Record<string, unknown>) => T | null): T[] =>
  Array.isArray(v) ? v.slice(0, max).flatMap((x) => (x && typeof x === "object" ? [f(x as Record<string, unknown>)].filter((y): y is T => y !== null) : [])) : [];

/* ------------------------------ Estudo 1: terreno ------------------------------ */

export const SEMAFOROS = { verde: "🟢 viável", amarelo: "🟡 viável com condição", vermelho: "🔴 não segue" } as const;
export type Semaforo = keyof typeof SEMAFOROS;
/** aguardando → pronto → (central perguntou) → sim | nao */
export const STATUS_E1 = { aguardando: "Aguardando o raio-x", pronto: "Pronto", perguntado: "Perguntado no Central", sim: "Seguir para o mercadológico", nao: "Parado no terreno" } as const;

export type Estudo1 = {
  status: keyof typeof STATUS_E1;
  semaforo: Semaforo | null;
  zona: string;
  loteMinimo: string;
  aproveitavelPct: number | null;
  lotes: { pior: number | null; medio: number | null; bom: number | null };
  produto: string;
  alertas: { texto: string; comoResolver: string }[];
  estrategia: string[];
  regiao: { m2Min: number | null; m2Max: number | null; tipologia: string; expansao: string; cidades: string };
  perguntadoEm: string | null;
};

export function lerEstudo1(v: unknown): Estudo1 {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const l = (o.lotes ?? {}) as Record<string, unknown>;
  const r = (o.regiao ?? {}) as Record<string, unknown>;
  return {
    status: typeof o.status === "string" && o.status in STATUS_E1 ? (o.status as Estudo1["status"]) : "aguardando",
    semaforo: typeof o.semaforo === "string" && o.semaforo in SEMAFOROS ? (o.semaforo as Semaforo) : null,
    zona: txt(o.zona, 120),
    loteMinimo: txt(o.loteMinimo, 60),
    aproveitavelPct: num(o.aproveitavelPct),
    lotes: { pior: num(l.pior), medio: num(l.medio), bom: num(l.bom) },
    produto: txt(o.produto, 200),
    alertas: lista(o.alertas, 10, (x) => (txt(x.texto) ? { texto: txt(x.texto), comoResolver: txt(x.comoResolver) } : null)),
    estrategia: Array.isArray(o.estrategia) ? o.estrategia.filter((x): x is string => typeof x === "string" && !!x.trim()).slice(0, 10).map((x) => x.trim().slice(0, 300)) : [],
    regiao: { m2Min: num(r.m2Min), m2Max: num(r.m2Max), tipologia: txt(r.tipologia, 200), expansao: txt(r.expansao, 200), cidades: txt(r.cidades, 300) },
    perguntadoEm: typeof o.perguntadoEm === "string" ? o.perguntadoEm : null,
  };
}

const mil = (n: number | null) => (n == null ? "?" : n.toLocaleString("pt-BR"));

/** Resumo para o grupo JBL - Central (formato do padrão) */
export function resumoCentral(a: { cidade: string; dono: string | null; corretor: string | null; nome: string; hectares: number | null }, e: Estudo1) {
  const linhas = [
    `🔬 *Terreno: ${tituloArea(a)}*`,
    `${e.semaforo ? SEMAFOROS[e.semaforo] : "sem semáforo"} · ${e.zona || "zona ?"}${e.loteMinimo ? ` · lote ${e.loteMinimo}` : ""}`,
    `${a.hectares ? `${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha · ` : ""}${e.aproveitavelPct != null ? `${e.aproveitavelPct}% aproveitável · ` : ""}${mil(e.lotes.medio)} lotes no médio (${mil(e.lotes.pior)} a ${mil(e.lotes.bom)})`,
  ];
  if (e.produto) linhas.push(`Produto: ${e.produto}`);
  if (e.regiao.m2Min) linhas.push(`m² na região: R$ ${mil(e.regiao.m2Min)}${e.regiao.m2Max ? `–${mil(e.regiao.m2Max)}` : ""}${e.regiao.expansao ? ` · expansão: ${e.regiao.expansao}` : ""}`);
  if (e.alertas[0]) linhas.push(`Principal alerta: ${e.alertas[0].texto}`);
  linhas.push("", "Sigo para o mercadológico?", "1 Sim · 2 Não");
  return linhas.join("\n");
}

/** Resposta no Central: "1"/"sim" ou "2"/"não" (com ou sem o nome da área) */
export function respostaCentral(t: string): "sim" | "nao" | null {
  const n = t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (/^(1|sim|s|pode|segue|bora)\b/.test(n)) return "sim";
  if (/^(2|nao|n|para|parar)\b/.test(n)) return "nao";
  return null;
}

/* ------------------------------ Estudo 2: mercado ------------------------------ */

export const VEREDITOS = { encaixa: "🔥 encaixa", ajuste: "🌫 encaixa com ajuste", nao: "❄️ não encaixa" } as const;
export type Concorrente = { nome: string; distancia: string; tipo: string; lote: string; lancamento: string; hoje: string; estagio: string; vendido: string };
export type Revenda = { nome: string; lotes: string; variacao: string; tempo: string; ocupacao: string };
export type Estudo2 = {
  concorrentes: Concorrente[];
  revenda: Revenda[];
  lacunas: string;
  produto: string;
  financeiro: { vgv: string; infraPorLote: string; margem: string; parteDono: string; velocidade: string };
  veredito: keyof typeof VEREDITOS | null;
  risco: string;
};

export function lerEstudo2(v: unknown): Estudo2 {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const f = (o.financeiro ?? {}) as Record<string, unknown>;
  return {
    concorrentes: lista(o.concorrentes, 30, (x) =>
      txt(x.nome) ? { nome: txt(x.nome, 120), distancia: txt(x.distancia, 30), tipo: txt(x.tipo, 40), lote: txt(x.lote, 40), lancamento: txt(x.lancamento, 40), hoje: txt(x.hoje, 40), estagio: txt(x.estagio, 40), vendido: txt(x.vendido, 30) } : null,
    ),
    revenda: lista(o.revenda, 30, (x) => (txt(x.nome) ? { nome: txt(x.nome, 120), lotes: txt(x.lotes, 30), variacao: txt(x.variacao, 30), tempo: txt(x.tempo, 40), ocupacao: txt(x.ocupacao, 40) } : null)),
    lacunas: txt(o.lacunas, 1000),
    produto: txt(o.produto, 500),
    financeiro: { vgv: txt(f.vgv, 60), infraPorLote: txt(f.infraPorLote, 60), margem: txt(f.margem, 60), parteDono: txt(f.parteDono, 60), velocidade: txt(f.velocidade, 60) },
    veredito: typeof o.veredito === "string" && o.veredito in VEREDITOS ? (o.veredito as Estudo2["veredito"]) : null,
    risco: txt(o.risco, 500),
  };
}

/* ------------------------------ Apresentação ------------------------------ */

export type Slide = { titulo: string; destaque: string; linhas: string[] };

/** Os 9 slides da reunião (modelo padrão JBL), montados com o que os estudos têm */
export function slides(a: { cidade: string; uf: string; nome: string; dono: string | null; corretor: string | null; hectares: number | null }, e1: Estudo1, e2: Estudo2): Slide[] {
  const ha = a.hectares ? `${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha` : "";
  return [
    { titulo: "Capa", destaque: a.nome || tituloArea(a), linhas: [`${a.cidade} · ${a.uf}`, a.dono ? `Para ${a.dono}` : ""].filter(Boolean) },
    { titulo: "Quem somos", destaque: "JBL Incorporadora", linhas: ["Loteamentos entregues e em andamento", "Marcelo e Fernando à frente de cada projeto"] },
    { titulo: "Como funciona a parceria", destaque: "Sem aporte do proprietário", linhas: ["A JBL faz projeto, aprovação, obra e venda", "O proprietário recebe parte dos lotes ou das vendas"] },
    { titulo: "A sua área", destaque: ha || a.cidade, linhas: [e1.zona && `Zona ${e1.zona}${e1.loteMinimo ? `, lote mínimo ${e1.loteMinimo}` : ""}`, ...e1.estrategia.slice(0, 3)].filter(Boolean) as string[] },
    { titulo: "O que dá para fazer", destaque: e1.lotes.medio ? `${mil(e1.lotes.medio)} lotes` : "em estudo", linhas: [e1.produto, e1.aproveitavelPct != null ? `${e1.aproveitavelPct}% da área vira lote` : ""].filter(Boolean) },
    { titulo: "O mercado da região", destaque: e2.veredito ? VEREDITOS[e2.veredito] : "em estudo", linhas: [...e2.concorrentes.slice(0, 3).map((c) => `${c.nome}: ${c.hoje || c.lancamento} · ${c.vendido} vendido`), e2.lacunas].filter(Boolean) },
    { titulo: "O nosso produto", destaque: e2.produto || e1.produto || "a definir", linhas: [] },
    { titulo: "Quanto pode render", destaque: e2.financeiro.parteDono || e2.financeiro.vgv || "em estudo", linhas: [e2.financeiro.vgv && `VGV ${e2.financeiro.vgv}`, e2.financeiro.velocidade && `Venda esperada ${e2.financeiro.velocidade}`].filter(Boolean) as string[] },
    { titulo: "Próximos passos", destaque: "Proposta → 30 dias → contrato", linhas: ["Proposta formal", "Estudo de 30 dias para confirmar as premissas", "Contrato de parceria"] },
  ];
}

/* ------------------------------ Custos e pessoas ------------------------------ */

export type Custo = { item: string; valor: number; base: string; status: "estimado" | "cotado" | "confirmado" };
export const lerCustos = (v: unknown): Custo[] =>
  lista(v, 80, (x) => (txt(x.item) ? { item: txt(x.item, 120), valor: num(x.valor) ?? 0, base: txt(x.base, 200), status: x.status === "cotado" || x.status === "confirmado" ? x.status : "estimado" } : null));

export type Pessoa = { nome: string; papel: string; email: string; telefone: string };
export const lerPessoas = (v: unknown): Pessoa[] =>
  lista(v, 60, (x) => (txt(x.nome) ? { nome: txt(x.nome, 80), papel: txt(x.papel, 60), email: txt(x.email, 120), telefone: txt(x.telefone, 30) } : null));

/* ------------------------------ Dashboard Dia a Dia ------------------------------ */

export type Pendencia = { areaId: string; titulo: string; oQue: string; aba: string; peso: number };

/** O que cada área está esperando de você hoje (mais urgente primeiro) */
export function pendencias(areas: { id: string; cidade: string; dono: string | null; corretor: string | null; nome: string; etapa: string; situacao: string; estudo1: unknown; poligono: unknown; reuniaoId: string | null; updatedAt: Date }[], agora = new Date()): Pendencia[] {
  const out: Pendencia[] = [];
  for (const a of areas.filter((x) => x.situacao === "ativa")) {
    const t = tituloArea(a);
    const e1 = lerEstudo1(a.estudo1);
    const dias = Math.floor((+agora - +a.updatedAt) / 864e5);
    if (a.etapa === "captacao" && !a.poligono) out.push({ areaId: a.id, titulo: t, oQue: "Falta o KMZ", aba: "config", peso: 2 });
    else if (a.etapa === "captacao") out.push({ areaId: a.id, titulo: t, oQue: "KMZ recebido: estudar?", aba: "etapa", peso: 3 });
    if (a.etapa === "previabilidade" && e1.status === "pronto") out.push({ areaId: a.id, titulo: t, oQue: "Estudo do terreno pronto: mandar resumo ao Central", aba: "etapa", peso: 3 });
    if (a.etapa === "previabilidade" && e1.status === "sim") out.push({ areaId: a.id, titulo: t, oQue: "Fazer o mercadológico", aba: "etapa", peso: 2 });
    if (a.etapa === "reuniao" && !a.reuniaoId) out.push({ areaId: a.id, titulo: t, oQue: "Marcar a reunião", aba: "etapa", peso: 3 });
    if (dias >= 7) out.push({ areaId: a.id, titulo: t, oQue: `Parada há ${dias} dias em ${nomeEtapa(a.etapa)}`, aba: "etapa", peso: 1 });
  }
  return out.sort((a, b) => b.peso - a.peso);
}

/* ------------------------------ Card do funil ------------------------------ */

export type Tom = "ok" | "warn" | "bad" | "run";

/** Situação e próximo passo do card (igual à maquete: linha de situação e etiqueta colorida) */
export function cartao(a: { etapa: string; situacao: string; poligono: unknown; estudo1: unknown; reuniaoId: string | null; projectId: string | null }): { situacao: string; tom: Tom; passo: string } {
  if (a.situacao === "geladeira") return { situacao: "Na geladeira", tom: "run", passo: "rever depois" };
  if (a.situacao === "descartada") return { situacao: "Descartada", tom: "bad", passo: "fora do funil" };
  const e1 = lerEstudo1(a.estudo1);
  switch (a.etapa) {
    case "captacao":
      return a.poligono ? { situacao: "KMZ recebido", tom: "warn", passo: "dar play no estudo?" } : { situacao: "Aguardando KMZ", tom: "bad", passo: "pedir o KMZ" };
    case "previabilidade":
      return (
        {
          aguardando: { situacao: "Estudo do terreno em andamento", tom: "run" as Tom, passo: "raio-x rodando" },
          pronto: { situacao: "Raio-x pronto", tom: "bad" as Tom, passo: "mandar resumo ao Central" },
          perguntado: { situacao: "Perguntado no Central", tom: "warn" as Tom, passo: "esperando 1 Sim · 2 Não" },
          sim: { situacao: "Mercadológico liberado", tom: "run" as Tom, passo: "fazer o mercadológico" },
          nao: { situacao: "Parado no terreno", tom: "bad" as Tom, passo: "geladeira ou descartar?" },
        } as const
      )[e1.status];
    case "reuniao":
      return a.reuniaoId ? { situacao: "Reunião marcada", tom: "ok", passo: "reunião marcada" } : { situacao: "Pronto para reunião", tom: "bad", passo: "marcar a reunião" };
    case "proposta":
      return a.projectId ? { situacao: "Proposta em andamento", tom: "run", passo: "acompanhar a proposta" } : { situacao: "Fazer proposta", tom: "warn", passo: "criar a proposta" };
    case "estudo30":
      return { situacao: "Estudo de 30 dias", tom: "run", passo: "provar as hipóteses" };
    default:
      return { situacao: "Contrato", tom: "ok", passo: "assinar o contrato" };
  }
}

/* ------------------------------ Checklist que puxa dos passos ------------------------------ */

/**
 * Respostas que o checklist já sabe pelos passos (pedido 20/11/2026): KMZ, cadastro, Estudo 1, Estudo 2,
 * documentos e reunião. Não são gravadas: são montadas na hora, então mudam junto com o passo de origem.
 */
export function respostasDosPassos(a: {
  nome: string; dono: string | null; corretor: string | null; hectares: number | null; estudo1: unknown; estudo2: unknown; documentos: unknown;
  conversas: { nome: string; papel: string; telefone: string }[]; reuniao: { inicio: Date } | null; updatedAt: Date;
}): (Resposta & { aba: string })[] {
  const em = a.updatedAt.toISOString();
  const out: (Resposta & { aba: string })[] = [];
  const add = (secao: number, pergunta: string, resposta: string, fonte: Resposta["fonte"], ref: string, aba: string) => resposta && out.push({ secao, pergunta, resposta, fonte, ref, em, aba });
  const e1 = lerEstudo1(a.estudo1);
  const e2 = lerEstudo2(a.estudo2);
  const docs = validarDocumentos(a.documentos);
  if (a.nome) add(0, "Nome", a.nome, "manual", "Configurações", "config");
  if (a.hectares) add(0, "Extensão (m²)", `${Math.round(a.hectares * 1e4).toLocaleString("pt-BR")} m² (${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha), medido no KMZ`, "raiox", "Captação · KMZ", "etapa&ver=captacao");
  const prop = a.conversas.find((c) => c.papel === "proprietario");
  if (a.dono || prop) add(1, "Nome / profissão / telefone", [a.dono, prop ? `+${prop.telefone}` : ""].filter(Boolean).join(" · "), "manual", "Configurações", "config");
  if (a.corretor) add(1, "Corretor", a.corretor, "manual", "Configurações", "config");
  const d = (nome: string) => (docs[nome] === "ok" ? "Recebido" : docs[nome] === "pedido" ? "Pedido, ainda não chegou" : "");
  add(2, "Matrícula", d("Matrícula atualizada"), docs["Matrícula atualizada"] === "ok" ? "documento" : "manual", "Documentos", "documentos");
  add(2, "IPTU / CCIR", d("IPTU / CCIR"), docs["IPTU / CCIR"] === "ok" ? "documento" : "manual", "Documentos", "documentos");
  add(2, "Herdeiros de acordo?", d("Inventário / acordo dos herdeiros"), "manual", "Documentos", "documentos");
  add(6, "Certidão de uso do solo", d("Certidão de uso do solo"), docs["Certidão de uso do solo"] === "ok" ? "documento" : "manual", "Documentos", "documentos");
  add(6, "Diretrizes", d("Diretrizes de parcelamento"), docs["Diretrizes de parcelamento"] === "ok" ? "documento" : "manual", "Documentos", "documentos");
  add(17, "Viabilidade de água e esgoto", d("Viabilidade de água e esgoto"), docs["Viabilidade de água e esgoto"] === "ok" ? "documento" : "manual", "Documentos", "documentos");
  const pv = "Pré-viabilidade · Estudo 1";
  add(4, "Zona", e1.zona, "raiox", pv, "etapa&ver=previabilidade");
  add(4, "Lote mínimo", e1.loteMinimo, "raiox", pv, "etapa&ver=previabilidade");
  add(12, "Produto sugerido", e2.produto || e1.produto, "raiox", e2.produto ? "Pré-viabilidade · Estudo 2" : pv, "etapa&ver=previabilidade");
  if (e1.lotes.medio) add(12, "Quantidade de lotes", `${e1.lotes.pior ?? "?"} / ${e1.lotes.medio} / ${e1.lotes.bom ?? "?"} (pior / médio / bom)${e1.aproveitavelPct != null ? `, ${e1.aproveitavelPct}% aproveitável` : ""}`, "raiox", pv, "etapa&ver=previabilidade");
  if (e1.regiao.m2Min) add(8, "Preço do lote na região", `R$ ${e1.regiao.m2Min.toLocaleString("pt-BR")}${e1.regiao.m2Max ? ` a ${e1.regiao.m2Max.toLocaleString("pt-BR")}` : ""} por m² (anúncios)`, "raiox", pv, "etapa&ver=previabilidade");
  add(25, "Expansão urbana", e1.regiao.expansao, "raiox", pv, "etapa&ver=previabilidade");
  e1.alertas.forEach((x) => add(28, "Alerta do estudo", x.comoResolver ? `${x.texto} → ${x.comoResolver}` : x.texto, "raiox", pv, "etapa&ver=previabilidade"));
  if (e2.concorrentes.length) add(11, "Concorrentes no raio de 5 km", e2.concorrentes.map((c) => `${c.nome}${c.hoje ? ` (${c.hoje})` : ""}`).join("; "), "raiox", "Pré-viabilidade · Estudo 2", "etapa&ver=previabilidade");
  if (e2.veredito) add(8, "Encaixe no mercado", `${VEREDITOS[e2.veredito]}${e2.risco ? `. Risco: ${e2.risco}` : ""}`, "raiox", "Pré-viabilidade · Estudo 2", "etapa&ver=previabilidade");
  if (a.reuniao) add(1, "Reunião com o proprietário", `Marcada para ${a.reuniao.inicio.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}`, "reuniao", "Reunião", "etapa&ver=reuniao");
  return out;
}

/* ------------------------------ Próximo passo (modo simples) ------------------------------ */

/**
 * O que fazer agora nesta área, em uma frase, e para onde o botão leva (pedido 20/11/2026: "próximos passos
 * claros, simples de executar"). aba = destino dentro da página da área.
 */
export function acaoDoPasso(a: Parameters<typeof cartao>[0]): { titulo: string; explica: string; botao: string; aba: string } {
  if (a.situacao !== "ativa") return { titulo: a.situacao === "geladeira" ? "Área na geladeira" : "Área descartada", explica: "Nada a fazer agora. Se mudar de ideia, use “Reativar área” no topo.", botao: "Ver a área", aba: "etapa" };
  const e1 = lerEstudo1(a.estudo1);
  switch (a.etapa) {
    case "captacao":
      return a.poligono
        ? { titulo: "Decidir se vale estudar", explica: "O KMZ chegou. Olhe o mapa e, se fizer sentido, clique em “Sim, estudar”.", botao: "Ver o mapa", aba: "etapa&ver=captacao" }
        : { titulo: "Pedir o KMZ da área", explica: "Sem o desenho da área não dá para estudar. Peça ao proprietário ou ao corretor e suba em Configurações.", botao: "Subir o KMZ", aba: "config" };
    case "previabilidade":
      if (e1.status === "aguardando") return { titulo: "Preencher o estudo do terreno", explica: "Coloque os números do raio-x (zona, lotes, alertas).", botao: "Abrir o estudo", aba: "etapa&ver=previabilidade" };
      if (e1.status === "pronto") return { titulo: "Mandar o resumo para o grupo", explica: "O estudo do terreno está pronto. Mande o resumo ao JBL - Central para decidir se segue.", botao: "Mandar o resumo", aba: "etapa&ver=previabilidade" };
      if (e1.status === "perguntado") return { titulo: "Responder no grupo: 1 Sim ou 2 Não", explica: "O resumo foi para o JBL - Central. A resposta lá decide se faz o estudo de mercado.", botao: "Ver o estudo", aba: "etapa&ver=previabilidade" };
      if (e1.status === "sim") return { titulo: "Fazer o estudo de mercado", explica: "Concorrentes, revenda e produto. Depois disso, a apresentação fica pronta.", botao: "Abrir o mercado", aba: "etapa&ver=previabilidade" };
      return { titulo: "Decidir: geladeira ou descartar", explica: "O terreno não passou. Use os botões do topo.", botao: "Ver o estudo", aba: "etapa&ver=previabilidade" };
    case "reuniao":
      return a.reuniaoId
        ? { titulo: "Fazer a reunião", explica: "A reunião está marcada. Leve a apresentação.", botao: "Ver a reunião", aba: "etapa&ver=reuniao" }
        : { titulo: "Marcar a reunião com o proprietário", explica: "Escolha dia e hora; o convite e os avisos saem sozinhos.", botao: "Marcar a reunião", aba: "etapa&ver=reuniao" };
    case "proposta":
      return { titulo: a.projectId ? "Acompanhar a proposta" : "Fazer a proposta", explica: "A proposta é feita no loteamento, do jeito de sempre.", botao: a.projectId ? "Abrir as propostas" : "Fazer a proposta", aba: "etapa&ver=proposta" };
    case "estudo30":
      return { titulo: "Provar o que o estudo diz", explica: "Marque cada afirmação como provada ou falsa, com a prova.", botao: "Abrir o estudo de 30 dias", aba: "etapa&ver=estudo30" };
    default:
      return { titulo: "Assinar o contrato", explica: "Contrato de parceria em andamento.", botao: "Ver o contrato", aba: "etapa&ver=contrato" };
  }
}
