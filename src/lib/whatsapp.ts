/**
 * Cliente da Evolution API (WhatsApp). Variáveis: EVOLUTION_URL, EVOLUTION_KEY, EVOLUTION_INSTANCE.
 */

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
}

/** Texto puro: sem a prévia (imagem grande) que o WhatsApp monta para os links */
export async function enviarTexto(jid: string, text: string) {
  marcar(await call(`/message/sendText/${INST()}`, { number: jid, text, linkPreview: false }));
}

export async function enviarArquivo(jid: string, f: { base64: string; mime: string; fileName: string; caption: string }) {
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
};

export type Recebida = {
  id: string;
  grupo: string;
  deMim: boolean;
  autor: string;
  quando: Date;
  texto: string;
  arquivo: { fileName: string; mime: string } | null;
};

export function lerMensagem(data: Record<string, unknown>): Recebida | null {
  const key = data.key as { remoteJid?: string; fromMe?: boolean; id?: string } | undefined;
  if (!key?.id || !key.remoteJid) return null;
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
    grupo: key.remoteJid,
    deMim: !!key.fromMe,
    autor: String(data.pushName ?? ""),
    quando: ts ? new Date(ts * 1000) : new Date(),
    texto: texto.trim(),
    arquivo,
  };
}
