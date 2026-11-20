/**
 * Contatos de terra no banco (pedido 20/11/2026). Toda conversa particular passa por aqui: guarda as mensagens
 * (ida e volta) enquanto o Claude da VPS não decide; os "fora" não guardam nada e as mensagens já guardadas saem.
 */
import { db } from "./db";
import { ehParticular, lerClassificacao, pedidoClassificacao, POR_PEDIDO } from "./contatos-terra";
import type { Recebida } from "./whatsapp";

/** Conversa só é lida quando parou há 10 minutos (não decidir no meio do "oi, tudo bem?") */
const PAROU_MS = 10 * 60e3;

const AUDIO_PENDENTE = "🎤 áudio (transcrevendo…)";

export async function guardarParticular(m: Recebida, opts: { pedir?: boolean } = {}) {
  if (!ehParticular(m.grupo) || !(m.texto || m.audio)) return;
  const telefone = m.grupo.split("@")[0];
  let c = await db.contatoTerra.findUnique({ where: { telefone } });
  if (c?.situacao === "fora") return;
  // já ligado a uma área: é de terra sem precisar do Claude
  const ligado = !c && (await db.areaConversa.findFirst({ where: { telefone }, select: { id: true } }));
  const nome = !m.deMim && m.autor ? m.autor.slice(0, 80) : undefined;
  if (!c) c = await db.contatoTerra.create({ data: { telefone, nome, ultimaEm: m.quando, ...(ligado ? { situacao: "terra", classificadoEm: new Date() } : {}) } });
  else if (m.quando > c.ultimaEm || (nome && !c.nome)) await db.contatoTerra.update({ where: { id: c.id }, data: { ultimaEm: m.quando > c.ultimaEm ? m.quando : undefined, nome: c.nome ? undefined : nome } });
  // áudio: guarda já e a VPS transcreve depois (a conversa só é lida quando os áudios estiverem prontos)
  await db.mensagemParticular.createMany({ data: [{ telefone, deMim: m.deMim, texto: m.audio ? AUDIO_PENDENTE : m.texto.slice(0, 4000), quando: m.quando, messageId: m.id, audioPendente: !!m.audio }], skipDuplicates: true });
  if (opts.pedir !== false && c.situacao === "pendente") await pedirClassificacao();
}

/** Contatos esperando o Claude: conversa parada e com mensagem nova desde a última leitura */
async function pendentesProntos(limite: number) {
  const cs = await db.contatoTerra.findMany({ where: { situacao: "pendente", ultimaEm: { lt: new Date(Date.now() - PAROU_MS) } }, orderBy: { ultimaEm: "desc" }, take: limite * 4 });
  const prontos = cs.filter((c) => !c.classificadoEm || c.ultimaEm > c.classificadoEm);
  // espera a transcrição dos áudios (até 2 horas; depois lê assim mesmo)
  const comAudio = new Set((await db.mensagemParticular.findMany({ where: { audioPendente: true, telefone: { in: prontos.map((c) => c.telefone) }, quando: { gt: new Date(Date.now() - 2 * 3600e3) } }, select: { telefone: true }, distinct: ["telefone"] })).map((x) => x.telefone));
  return prontos.filter((c) => !comAudio.has(c.telefone)).slice(0, limite);
}

/** Põe um pedido de leitura na fila da VPS (um por vez) */
export async function pedirClassificacao() {
  if (await db.comandoClaude.findFirst({ where: { tipo: "classificar", status: { in: ["fila", "rodando"] } }, select: { id: true } })) return;
  if (!(await pendentesProntos(1)).length) return;
  await db.comandoClaude.create({ data: { texto: "Ler conversas particulares", grupoJid: "", tipo: "classificar" } });
}

/** Na hora em que a VPS pega o pedido: monta o texto com as conversas e guarda quais telefones foram */
export async function montarClassificacao(comandoId: string) {
  const cs = await pendentesProntos(POR_PEDIDO);
  const conversas = await Promise.all(
    cs.map(async (c) => ({
      telefone: c.telefone,
      nome: c.nome,
      mensagens: (await db.mensagemParticular.findMany({ where: { telefone: c.telefone }, orderBy: { quando: "desc" }, take: 30, select: { deMim: true, texto: true } })).reverse(),
    })),
  );
  await db.comandoClaude.update({ where: { id: comandoId }, data: { texto: JSON.stringify(cs.map((c) => c.telefone)) } });
  return conversas.length ? pedidoClassificacao(conversas) : "";
}

/** Resposta da VPS: terra entra em Conversas; fora sai (e apaga as mensagens); sem decisão espera mais conversa */
export async function guardarClassificacao(comandoTexto: string, resposta: string) {
  let pedidos: string[] = [];
  try { pedidos = JSON.parse(comandoTexto); } catch {}
  if (!Array.isArray(pedidos) || !pedidos.length) return;
  const agora = new Date();
  for (const r of lerClassificacao(resposta, pedidos)) {
    if (r.terra === false) {
      await db.contatoTerra.updateMany({ where: { telefone: r.telefone, situacao: "pendente" }, data: { situacao: "fora", classificadoEm: agora, resumo: null } });
      await db.mensagemParticular.deleteMany({ where: { telefone: r.telefone } });
    } else if (r.terra) {
      await db.contatoTerra.updateMany({ where: { telefone: r.telefone }, data: { situacao: "terra", papel: r.papel, resumo: r.resumo || null, classificadoEm: agora } });
      if (r.nome) await db.contatoTerra.updateMany({ where: { telefone: r.telefone, nome: null }, data: { nome: r.nome } });
    }
  }
  // os que não vieram decididos só são lidos de novo quando chegar mensagem nova
  await db.contatoTerra.updateMany({ where: { telefone: { in: pedidos }, situacao: "pendente" }, data: { classificadoEm: agora } });
  await pedirClassificacao();
}

/** Lê as conversas antigas (últimos 45 dias, pedido 20/11/2026), de 15 em 15, sem mandar nada; a tela chama até acabar */
export async function importarConversas(pagina: number) {
  const { listarConversas, mensagensDaConversa } = await import("./whatsapp");
  const desde = Date.now() - 45 * 864e5;
  // conversa particular pode vir com id interno (@lid): as mensagens trazem o número junto
  const todas = (await listarConversas()).filter((c) => (ehParticular(c.jid) || /@lid$/.test(c.jid)) && (!c.em || +c.em > desde)).sort((a, b) => +(b.em ?? 0) - +(a.em ?? 0));
  const fatia = todas.slice(pagina * 15, pagina * 15 + 15);
  let semNumero = 0;
  for (const c of fatia) {
    const msgs = (await mensagensDaConversa(c.jid, 60).catch(() => [])).filter((x) => +x.quando > desde);
    if (msgs.length && !msgs.some((m) => ehParticular(m.grupo))) semNumero++;
    for (const m of msgs) await guardarParticular(m, { pedir: false });
  }
  await pedirClassificacao();
  return { semNumero, feitas: Math.min(todas.length, pagina * 15 + fatia.length), total: todas.length, proxima: pagina * 15 + 15 < todas.length ? pagina + 1 : null };
}

/** "Não é de terra" na tela: sai de Conversas e apaga o que foi guardado */
export async function marcarFora(id: string) {
  const c = await db.contatoTerra.findUnique({ where: { id } });
  if (!c) return;
  await db.contatoTerra.update({ where: { id }, data: { situacao: "fora", resumo: null } });
  await db.mensagemParticular.deleteMany({ where: { telefone: c.telefone } });
}

/** KMZ recebido no particular: o contato já é de terra */
export async function marcarTerra(jid: string, nome: string) {
  if (!ehParticular(jid)) return;
  const telefone = jid.split("@")[0];
  const n = nome?.trim().slice(0, 80) || null;
  await db.contatoTerra.upsert({ where: { telefone }, create: { telefone, nome: n, situacao: "terra", classificadoEm: new Date(), resumo: "Mandou KMZ de uma área" }, update: { situacao: "terra" } });
}

/** Ligar o contato a uma área: vira conversa da área, com o que já foi conversado */
export async function ligarContato(id: string, areaId: string) {
  const c = await db.contatoTerra.findUnique({ where: { id } });
  if (!c) throw new Error("Contato não encontrado");
  if (!(await db.area.findFirst({ where: { id: areaId, deletedAt: null }, select: { id: true } }))) throw new Error("Área não encontrada");
  const papel = c.papel === "corretor" ? "corretor_proprietario" : c.papel === "proprietario" ? "proprietario" : "outro";
  const nome = c.nome || c.telefone;
  await db.areaConversa.upsert({ where: { areaId_telefone: { areaId, telefone: c.telefone } }, create: { areaId, telefone: c.telefone, nome, papel }, update: {} });
  const msgs = await db.mensagemParticular.findMany({ where: { telefone: c.telefone }, orderBy: { quando: "asc" } });
  const ja = new Set((await db.areaMensagem.findMany({ where: { areaId, telefone: c.telefone, messageId: { not: null } }, select: { messageId: true } })).map((x) => x.messageId));
  const novas = msgs.filter((m) => !ja.has(m.messageId));
  if (novas.length) await db.areaMensagem.createMany({ data: novas.map((m) => ({ areaId, telefone: c.telefone, nome, deMim: m.deMim, texto: m.texto, quando: m.quando, messageId: m.messageId })) });
  await db.contatoTerra.update({ where: { id }, data: { situacao: "terra" } });
}

/** Próximo áudio para a VPS transcrever (o mais novo primeiro) */
export const proximoAudio = () => db.mensagemParticular.findFirst({ where: { audioPendente: true }, orderBy: { quando: "desc" }, select: { id: true, messageId: true, telefone: true, deMim: true, quando: true } });

/** Transcrição pronta: troca o texto; se a conversa é de uma área, entra no chat (e no checklist, com "nutrir") */
export async function guardarTranscricao(id: string, texto: string | null) {
  const m = await db.mensagemParticular.findFirst({ where: { id, audioPendente: true } });
  if (!m) return;
  const t = texto?.trim() ? `🎤 ${texto.trim().slice(0, 3990)}` : "🎤 áudio (não deu para transcrever)";
  await db.mensagemParticular.update({ where: { id }, data: { texto: t, audioPendente: false } });
  // conversa pendente: volta a ser lida com o áudio
  await db.contatoTerra.updateMany({ where: { telefone: m.telefone, situacao: "pendente" }, data: { classificadoEm: null } });
  if (texto?.trim()) {
    const { nutrirPorTelefone } = await import("./captacao-db");
    await nutrirPorTelefone(`${m.telefone}@s.whatsapp.net`, "", t, m.quando, m.messageId, m.deMim);
  }
}
