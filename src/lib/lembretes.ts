/**
 * Lembretes e resumos pelo WhatsApp (pedido 20/11/2026). Funções puras: entender o pedido de lembrete, montar o
 * resumo da manhã e o resumo de uma área. Horários sempre no fuso de São Paulo.
 */
import { diaDe, horaDe, quando } from "./agenda";
import { lerChecklist, nomeEtapa, progresso, tituloArea, validarDocumentos } from "./captacao";
import { cartao, lerEstudo1, SEMAFOROS, type Pendencia } from "./captacao-estudos";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const DIAS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const somaDias = (dia: string, n: number) => diaDe(new Date(+quando(dia, "12:00") + n * 864e5));

/**
 * "me lembra amanhã às 9h de ligar pro Pedro", "lembrete 25/11 14:30 reunião na prefeitura",
 * "me avisa daqui a 2 horas de mandar a proposta". Sem hora: 8h. Sem dia: hoje (ou amanhã, se a hora já passou).
 */
export function lerPedidoLembrete(texto: string, agora = new Date()): { quando: Date; texto: string } | null {
  const t = texto.trim().slice(0, 500);
  const n = norm(t);
  const gatilho = /^(?:robo,?\s*)?(?:me\s+)?(?:lembr(?:a|e|ar|ete)|avis(?:a|e|ar)(?:-?me)?)\b/;
  if (!gatilho.test(n)) return null;
  let resto = n.replace(gatilho, " ");
  const hoje = diaDe(agora);
  let dia: string | null = null;
  let hora: string | null = null;

  const daqui = resto.match(/\b(?:daqui a|em)\s+(\d{1,3})\s*(min(?:uto)?s?|h(?:ora)?s?)\b/);
  if (daqui) {
    const ms = +daqui[1] * (daqui[2].startsWith("h") ? 3600e3 : 60e3);
    const q = new Date(+agora + ms);
    return { quando: q, texto: limpar(t, daqui[0]) };
  }
  if (/\bdepois de amanha\b/.test(resto)) (dia = somaDias(hoje, 2)), (resto = resto.replace(/\bdepois de amanha\b/, " "));
  else if (/\bamanha\b/.test(resto)) (dia = somaDias(hoje, 1)), (resto = resto.replace(/\bamanha\b/, " "));
  else if (/\bhoje\b/.test(resto)) (dia = hoje), (resto = resto.replace(/\bhoje\b/, " "));
  const data = resto.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (!dia && data) {
    const ano = data[3] ? (data[3].length === 2 ? 2000 + +data[3] : +data[3]) : +hoje.slice(0, 4);
    dia = `${ano}-${data[2].padStart(2, "0")}-${data[1].padStart(2, "0")}`;
    if (!data[3] && dia < hoje) dia = `${ano + 1}${dia.slice(4)}`;
    resto = resto.replace(data[0], " ");
  }
  const sem = resto.match(/\b(?:na |no )?(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:-feira)?\b/);
  if (!dia && sem) {
    const alvo = DIAS.indexOf(sem[1]);
    const atual = new Date(`${hoje}T12:00:00-03:00`).getUTCDay();
    dia = somaDias(hoje, ((alvo - atual + 7) % 7) || 7);
    resto = resto.replace(sem[0], " ");
  }
  const h = resto.match(/\b(?:as |a |às )?(\d{1,2})(?:[:h](\d{2}))?\s*(?:h(?:oras?)?|hs)?\b(?!\s*\/)/);
  if (h && (/[:h]/.test(h[0]) || /\bas\s/.test(h[0]) || /hora/.test(h[0])) && +h[1] < 24 && +(h[2] ?? 0) < 60) {
    hora = `${h[1].padStart(2, "0")}:${h[2] ?? "00"}`;
  }
  if (!dia && !hora) return null;
  if (!dia) dia = quando(hoje, hora!) > agora ? hoje : somaDias(hoje, 1);
  const q = quando(dia, hora ?? "08:00");
  if (isNaN(+q) || q <= agora) return null;
  return { quando: q, texto: limpar(t, null) };
}

/** Tira do pedido o "me lembra", o dia e a hora, e fica só o que é para lembrar */
function limpar(original: string, trecho: string | null) {
  let s = ` ${original} `;
  if (trecho) s = s.replace(new RegExp(trecho.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), " ");
  // \b não funciona com letra acentuada (ã, à): as bordas são marcadas à mão
  const B = "(?<![\\p{L}\\d])", E = "(?![\\p{L}\\d])";
  const re = (x: string) => new RegExp(`${B}(?:${x})${E}`, "giu");
  s = s
    .replace(/^\s*(?:rob[oô],?\s*)?(?:me\s+)?(?:lembr(?:a|e|ar|ete)|avis(?:a|e|ar)(?:-?me)?)\b/i, " ")
    .replace(re("depois de amanh[ãa]|amanh[ãa]|hoje"), " ")
    .replace(re("\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?"), " ")
    .replace(re("(?:na |no )?(?:domingo|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado)(?:-feira)?"), " ")
    .replace(re("(?:[àa]s?\\s+)?\\d{1,2}(?:[:h]\\d{2})?\\s*(?:h(?:oras?)?|hs)?"), " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:de|que|pra|para|do|da|:|-)\s+/i, "");
  return s ? s[0].toUpperCase() + s.slice(1) : "Lembrete";
}

export const confirmacaoLembrete = (q: Date, texto: string) =>
  `⏰ Combinado: ${q.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit" })} às ${horaDe(q)} eu lembro: _${texto}_`;

export const textoLembrete = (texto: string) => `⏰ *Lembrete:* ${texto}`;

/** Resumo da manhã (07:30) no JBL - Central: reuniões do dia, o que está esperando e os lembretes */
export function resumoManha(o: { agora: Date; reunioes: { titulo: string; inicio: Date; local: string | null }[]; pendencias: Pendencia[]; lembretes: { texto: string; quando: Date }[] }) {
  const dia = o.agora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "2-digit" });
  const l = [`☀️ *Bom dia! Resumo de ${dia}*`];
  l.push("", "*📅 Reuniões de hoje*", ...(o.reunioes.length ? o.reunioes.map((r) => `• ${horaDe(r.inicio)} · ${r.titulo}${r.local ? ` · ${r.local}` : ""}`) : ["• nenhuma"]));
  const pend = o.pendencias.slice(0, 8);
  l.push("", "*🔴 Esperando vocês*", ...(pend.length ? pend.map((p) => `• ${p.titulo}: ${p.oQue}`) : ["• nada pendente"]));
  if (o.pendencias.length > pend.length) l.push(`• e mais ${o.pendencias.length - pend.length} no Dashboard Dia a Dia`);
  if (o.lembretes.length) l.push("", "*⏰ Lembretes de hoje*", ...o.lembretes.map((x) => `• ${horaDe(x.quando)} · ${x.texto}`));
  return l.join("\n");
}

type AreaResumo = Parameters<typeof cartao>[0] & Parameters<typeof tituloArea>[0] & { hectares: number | null; checklist: unknown; documentos: unknown; uf: string };

/** "Qual a situação de Sorocaba?": o card da área em texto */
export function resumoArea(a: AreaResumo) {
  const c = cartao(a);
  const e = lerEstudo1(a.estudo1);
  const docs = Object.values(validarDocumentos(a.documentos)).filter((s) => s === "ok").length;
  const l = [`📍 *${tituloArea(a)}*${a.hectares ? ` · ${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha` : ""}`, `Etapa: *${nomeEtapa(a.etapa)}* · ${c.situacao}`, `➡️ Próximo passo: ${c.passo}`];
  if (e.semaforo || e.zona) l.push(`🔬 ${[e.semaforo && SEMAFOROS[e.semaforo], e.zona, e.loteMinimo && `lote ${e.loteMinimo}`].filter(Boolean).join(" · ")}`);
  if (e.lotes.medio) l.push(`🏘 Lotes: ${e.lotes.pior ?? "?"} / *${e.lotes.medio}* / ${e.lotes.bom ?? "?"} (pior / médio / bom)`);
  if (e.alertas[0]) l.push(`⚠️ Principal alerta: ${e.alertas[0].texto}`);
  l.push(`✅ Checklist ${progresso(lerChecklist(a.checklist)).pct}% · 📁 Documentos ${docs}/15`);
  return l.join("\n");
}
