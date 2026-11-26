/**
 * Cliente da Evolution API (WhatsApp). Variáveis: EVOLUTION_URL, EVOLUTION_KEY, EVOLUTION_INSTANCE.
 */

import { JANELA_MANUAL_MS, JANELA_MS, LIMITE_ENVIOS, LIMITE_MANUAL, LimiteWhatsapp, podeEnviar, semLimite } from "./limite-whatsapp";

const URL_ = () => (process.env.EVOLUTION_URL ?? "").replace(/\/+$/, "");
const INST = () => encodeURIComponent(process.env.EVOLUTION_INSTANCE ?? "");

async function call<T = unknown>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${URL_()}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { apikey: process.env.EVOLUTION_KEY ?? "", "Content-Type": "application/json; charset=utf-8" },
    // texto sempre em UTF-8 (acentos e emojis)
    body: body === undefined ? undefined : Buffer.from(JSON.stringify(body), "utf8"),
  });
  const txt = await r.text();
  if (!r.ok) throw new Error(`Evolution ${path}: ${r.status} ${txt.slice(0, 300)}`);
  return (txt ? JSON.parse(txt) : null) as T;
}

/** Ids das mensagens que o próprio robô mandou (para não responder a si mesmo) */
export const enviadasPeloRobo = new Set<string>();
function marcar(r: { key?: { id?: string } } | null) {
  const id = r?.key?.id;
  if (id) {
    enviadasPeloRobo.add(id);
    if (enviadasPeloRobo.size > 500) enviadasPeloRobo.delete(enviadasPeloRobo.values().next().value!);
  }
  return id ?? null;
}

/**
 * Reserva um envio dentro do limite (1 a cada 10 minutos; as digitadas na tela, 20 a cada 15). A trava do banco faz
 * dois servidores ao mesmo tempo não passarem juntos do limite. Sem vaga, lança LimiteWhatsapp e nada é mandado.
 */
async function reservarEnvio(jid: string, manual = false) {
  const { db } = await import("./db");
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261120)`;
    const janela = manual ? JANELA_MANUAL_MS : JANELA_MS;
    const recentes = await tx.waEnvio.findMany({ where: { em: { gt: new Date(Date.now() - janela) }, manual }, select: { em: true } });
    const limite = manual ? LIMITE_MANUAL : LIMITE_ENVIOS;
    const r = podeEnviar(recentes.map((x) => x.em), new Date(), limite, janela);
    if (!r.ok) throw new LimiteWhatsapp(r.libera, limite, janela);
    await tx.waEnvio.create({ data: { jid, manual } });
  });
}

const mandarTexto = async (jid: string, text: string) => marcar(await call(`/message/sendText/${INST()}`, { number: jid, text, linkPreview: false }));

/**
 * Texto puro: sem a prévia (imagem grande) que o WhatsApp monta para os links. Texto do sistema que passa do limite
 * (ou chega com outras na espera) entra na fila MensagemEspera e sai na vez dele (pedido 22/11/2026); aí devolve null.
 * As digitadas na tela de Conversas não esperam: passando do limite delas, dá erro na hora.
 */
export async function enviarTexto(jid: string, text: string, opts: { manual?: boolean } = {}) {
  if (semLimite(jid)) return mandarTexto(jid, text);
  if (opts.manual) {
    await reservarEnvio(jid, true);
    return mandarTexto(jid, text);
  }
  const { db } = await import("./db");
  const esperando = await db.mensagemEspera.count({ where: { enviadoEm: null } });
  if (!esperando) {
    try {
      await reservarEnvio(jid);
      // devolve o id da mensagem (a tela de Conversas guarda com ele, e o eco do webhook não duplica)
      return await mandarTexto(jid, text);
    } catch (e) {
      if (!(e instanceof LimiteWhatsapp)) throw e;
    }
  }
  await db.mensagemEspera.create({ data: { jid, texto: text.slice(0, 20_000) } });
  return null;
}

/** Manda a mais antiga da fila de espera, se o limite deixar. Chamada pela VPS (30 s) e pela rotina (10 min). */
export async function enviarDaEspera() {
  const { db } = await import("./db");
  const m = await db.mensagemEspera.findFirst({ where: { enviadoEm: null }, orderBy: { createdAt: "asc" } });
  if (!m) return false;
  try {
    await reservarEnvio(m.jid);
  } catch (e) {
    if (e instanceof LimiteWhatsapp) return false;
    throw e;
  }
  await mandarTexto(m.jid, m.texto);
  await db.mensagemEspera.update({ where: { id: m.id }, data: { enviadoEm: new Date() } });
  return true;
}

export async function enviarArquivo(jid: string, f: { base64: string; mime: string; fileName: string; caption: string }) {
  if (!semLimite(jid)) await reservarEnvio(jid);
  const mediatype = f.mime.startsWith("image/") ? "image" : "document";
  marcar(await call(`/message/sendMedia/${INST()}`, { number: jid, mediatype, mimetype: f.mime, caption: f.caption, media: f.base64, fileName: f.fileName }));
}

export async function baixarMidia(messageId: string) {
  return call<{ base64: string; mimetype?: string; fileName?: string }>(`/chat/getBase64FromMediaMessage/${INST()}`, { message: { key: { id: messageId } }, convertToMp4: false });
}

export async function nomeDoGrupo(jid: string) {
  const g = await call<{ subject?: string }>(`/group/findGroupInfos/${INST()}?groupJid=${encodeURIComponent(jid)}`);
  return g?.subject ?? "";
}

export async function estadoConexao() {
  return call<{ instance?: { state?: string } }>(`/instance/connectionState/${INST()}`).catch(() => null);
}

/* ---------------- mensagem recebida (webhook messages.upsert) ---------------- */

type Msg = Record<string, unknown> & {
  conversation?: string;
  extendedTextMessage?: { text?: string };
  documentMessage?: { fileName?: string; mimetype?: string; caption?: string; title?: string };
  documentWithCaptionMessage?: { message?: Msg };
  imageMessage?: { caption?: string; mimetype?: string };
  audioMessage?: { seconds?: number; ptt?: boolean };
};

export type Recebida = {
  id: string;
  grupo: string;
  deMim: boolean;
  autor: string;
  quando: Date;
  texto: string;
  arquivo: { fileName: string; mime: string } | null;
  /** em grupo: número de quem mandou (só dígitos); em conversa individual, vazio */
  participante: string;
  /** áudio (mensagem de voz): segundos; 0 = não é áudio (pedido 20/11/2026) */
  audio: number;
};

export function lerMensagem(data: Record<string, unknown>): Recebida | null {
  const key = data.key as { remoteJid?: string; remoteJidAlt?: string; senderPn?: string; fromMe?: boolean; id?: string; participant?: string; participantAlt?: string; participantPn?: string } | undefined;
  if (!key?.id || !key.remoteJid) return null;
  // conversa particular pode vir com um id interno (@lid) no lugar do número: usa o número quando vier junto
  const remoteJid = /@lid$/.test(key.remoteJid) ? ([key.remoteJidAlt, key.senderPn].find((x) => x && /@s\.whatsapp\.net$/.test(x)) ?? key.remoteJid) : key.remoteJid;
  let m = (data.message ?? {}) as Msg;
  if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
  const doc = m.documentMessage;
  const img = m.imageMessage;
  const texto = m.conversation ?? m.extendedTextMessage?.text ?? doc?.caption ?? img?.caption ?? "";
  const arquivo = doc
    ? { fileName: doc.fileName || doc.title || "documento", mime: doc.mimetype || "application/octet-stream" }
    : img
      ? { fileName: `foto-${key.id.slice(-6)}.jpg`, mime: img.mimetype || "image/jpeg" }
      : null;
  const ts = Number(data.messageTimestamp ?? 0);
  return {
    id: key.id,
    grupo: remoteJid,
    deMim: !!key.fromMe,
    autor: String(data.pushName ?? ""),
    quando: ts ? new Date(ts * 1000) : new Date(),
    texto: texto.trim(),
    arquivo,
    // o WhatsApp pode mandar um id interno (@lid) no lugar do número: usa o número quando vier junto
    audio: m.audioMessage ? Math.max(1, Math.round(Number(m.audioMessage.seconds ?? 1))) : 0,
    participante: ([key.participantPn, key.participantAlt, key.participant].find((x) => x && /@s\.whatsapp\.net$/.test(x)) ?? "").split("@")[0].replace(/\D/g, ""),
  };
}

/** Conversas do WhatsApp conectado (para ler as antigas uma vez, sem mandar nada) */
export async function listarConversas() {
  const r = await call<unknown>(`/chat/findChats/${INST()}`, {});
  const lista = (Array.isArray(r) ? r : []) as { remoteJid?: string; pushName?: string | null; updatedAt?: string | null }[];
  return lista.filter((c) => typeof c.remoteJid === "string").map((c) => ({ jid: c.remoteJid!, nome: c.pushName ?? null, em: c.updatedAt ? new Date(c.updatedAt) : null }));
}

/** Últimas mensagens de uma conversa, no mesmo formato do webhook */
export async function mensagensDaConversa(jid: string, quantas = 40) {
  const r = await call<{ messages?: { records?: unknown[] } }>(`/chat/findMessages/${INST()}`, { where: { key: { remoteJid: jid } }, page: 1, offset: quantas });
  return (r?.messages?.records ?? []).map((x) => lerMensagem(x as Record<string, unknown>)).filter((m): m is Recebida => !!m);
}
