import { db } from "./db";
import { diaDe, horaDe } from "./agenda";
import { grupoCentral } from "./captacao-db";
import { pendencias } from "./captacao-estudos";
import { resumoManha, textoLembrete } from "./lembretes";
import { enviarTexto } from "./whatsapp";

/**
 * Rotinas do WhatsApp chamadas de 10 em 10 minutos (pedido 20/11/2026). Só marcam como feito o que saiu de
 * fato: se o limite de 2 mensagens a cada 15 minutos barrar, tenta de novo na rodada seguinte.
 */

/** Resumo da manhã no JBL - Central, uma vez por dia, a partir das 07:30 (até o meio-dia) */
export async function resumoDaManha(agora = new Date()) {
  const h = horaDe(agora);
  if (h < "07:30" || h >= "12:00") return false;
  const chave = `resumo-${diaDe(agora)}`;
  if (await db.waRotina.findUnique({ where: { chave } })) return false;
  const g = await grupoCentral();
  if (!g) return false;
  const ini = new Date(`${diaDe(agora)}T00:00:00-03:00`);
  const fim = new Date(+ini + 864e5);
  const [areas, reunioes, lembretes] = await Promise.all([
    db.area.findMany({ where: { deletedAt: null } }),
    db.compromisso.findMany({ where: { status: "marcado", inicio: { gte: ini, lt: fim } }, orderBy: { inicio: "asc" }, select: { titulo: true, inicio: true, local: true } }),
    db.lembrete.findMany({ where: { enviadoEm: null, quando: { gte: ini, lt: fim } }, orderBy: { quando: "asc" }, select: { texto: true, quando: true } }),
  ]);
  await enviarTexto(g.jid, `🤖 ${resumoManha({ agora, reunioes, pendencias: pendencias(areas, agora), lembretes })}`);
  await db.waRotina.create({ data: { chave } });
  return true;
}

/** Lembretes que já venceram saem no grupo em que foram pedidos (no máximo 2 por rodada, por causa do limite) */
export async function enviarLembretes(agora = new Date()) {
  const lista = await db.lembrete.findMany({ where: { enviadoEm: null, quando: { lte: agora } }, orderBy: { quando: "asc" }, take: 2 });
  let n = 0;
  for (const l of lista) {
    await enviarTexto(l.grupoJid, `🤖 ${textoLembrete(l.texto)}`);
    await db.lembrete.update({ where: { id: l.id }, data: { enviadoEm: new Date() } });
    n++;
  }
  return n;
}

/** Respostas do Claude que o limite de envio barrou: tenta de novo (uma por rodada) */
export async function respostasClaudePendentes() {
  const c = await db.comandoClaude.findFirst({ where: { status: { in: ["feito", "erro"] }, enviadoEm: null }, orderBy: { terminadoEm: "asc" } });
  if (!c) return 0;
  const { cortarResposta } = await import("./claude-ponte");
  await enviarTexto(c.grupoJid, `🤖 🧠 ${cortarResposta(c.resposta ?? "")}`);
  await db.comandoClaude.update({ where: { id: c.id }, data: { enviadoEm: new Date() } });
  return 1;
}

/** Área perto de sair da geladeira (5 dias): um aviso só no Central, com o motivo da espera (pedido 20/11/2026) */
export async function avisosGeladeira(agora = new Date()) {
  const { avisarGeladeira, diasParaSair, tituloArea } = await import("./captacao");
  const areas = (await db.area.findMany({ where: { deletedAt: null, situacao: "geladeira", geladeiraAte: { not: null }, geladeiraAvisoEm: null } })).filter((a) => avisarGeladeira(a, agora));
  if (!areas.length) return 0;
  const g = await grupoCentral();
  if (!g) return 0;
  const linhas = areas.map((a) => {
    const d = diasParaSair(a.geladeiraAte!, agora);
    const dia = a.geladeiraAte!.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    return `❄️ *${tituloArea(a)}* sai da geladeira ${d > 0 ? `em ${d} dia(s) (${dia})` : `desde ${dia}`}.\nMotivo da espera: ${a.motivoGeladeira ?? "—"}`;
  });
  await enviarTexto(g.jid, `🤖 ${linhas.join("\n\n")}\n\nAbra a área para reativar ou deixar mais tempo.`);
  await db.area.updateMany({ where: { id: { in: areas.map((a) => a.id) } }, data: { geladeiraAvisoEm: agora } });
  return areas.length;
}
