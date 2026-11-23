import { areaPorTexto, tituloArea } from "./captacao";
import { db } from "./db";
import { ehTipoEstudo } from "./estudo-andamento";
import { DIAS_GUARDADO, lerPedidoParada, podeRetomar, textoParou, textoPedidoParar, textoRetomado } from "./estudo-parar";
import type { Recebida } from "./whatsapp";

const TIPOS = { in: ["estudo", "mercado"] };
const limite = () => new Date(Date.now() - DIAS_GUARDADO * 24 * 3600e3);

async function titulo(areaId: string | null) {
  const a = areaId ? await db.area.findFirst({ where: { id: areaId } }) : null;
  return a ? tituloArea(a) : "área";
}

/** Estudos parados que ainda dá para retomar (a tela mostra "Retomar") */
export const estudosParados = (areaId: string) =>
  db.comandoClaude.findMany({
    where: { areaId, tipo: TIPOS, status: "parado", paradoEm: { gt: limite() } },
    orderBy: { paradoEm: "desc" },
    select: { id: true, tipo: true, status: true, progresso: true, fase: true, iniciadoEm: true, paradoEm: true },
  });

/** Passou dos 5 dias sem retomar: descarta (a VPS apaga a pasta sozinha, pelo parado.txt) */
export const descartarVencidos = () =>
  db.comandoClaude.updateMany({ where: { status: "parado", paradoEm: { lte: limite() } }, data: { status: "descartado" } });

/**
 * Para o estudo (tela ou WhatsApp). Na fila: para na hora. Rodando: a tela destrava já; a VPS mata o Claude no
 * próximo aviso de andamento (até 30 s) e confirma em confirmarParada.
 */
export async function pararEstudo(id: string) {
  const c = await db.comandoClaude.findFirst({ where: { id, tipo: TIPOS, status: { in: ["fila", "rodando"] } } });
  if (!c || !ehTipoEstudo(c.tipo)) throw new Error("Esse estudo não está rodando.");
  const naVps = c.status === "rodando";
  const agora = new Date();
  await db.comandoClaude.update({ where: { id }, data: { status: "parado", paradoEm: agora, terminadoEm: naVps ? null : agora } });
  return { naVps, texto: textoPedidoParar(await titulo(c.areaId), c.tipo, naVps), grupoJid: c.grupoJid };
}

/** A VPS parou o Claude e guardou a pasta: confirma no grupo do pedido */
export async function confirmarParada(id: string) {
  const c = await db.comandoClaude.findFirst({ where: { id, status: "parado", terminadoEm: null } });
  if (!c || !c.paradoEm || !ehTipoEstudo(c.tipo)) return;
  await db.comandoClaude.update({ where: { id }, data: { terminadoEm: new Date() } });
  const { enviarTexto } = await import("./whatsapp");
  await enviarTexto(c.grupoJid, `🤖 ${textoParou(await titulo(c.areaId), c.tipo, c.paradoEm)}`).catch((e) => console.error("aviso parada", e));
}

/** Volta para a fila; a VPS acha a pasta guardada e continua de onde parou */
export async function retomarEstudo(id: string) {
  const c = await db.comandoClaude.findFirst({ where: { id, tipo: TIPOS, status: "parado" } });
  if (!c || !ehTipoEstudo(c.tipo) || !podeRetomar(c.paradoEm)) throw new Error(`Esse estudo passou dos ${DIAS_GUARDADO} dias e foi descartado. Peça um novo.`);
  if (c.areaId && (await db.comandoClaude.count({ where: { areaId: c.areaId, tipo: c.tipo, status: { in: ["fila", "rodando"] } } })))
    throw new Error("Já tem um estudo igual rodando nesta área.");
  const naFila = await db.comandoClaude.count({ where: { status: { in: ["fila", "rodando"] } } });
  await db.comandoClaude.update({ where: { id }, data: { status: "fila", paradoEm: null, terminadoEm: null, progresso: null, fase: null } });
  return { texto: textoRetomado(await titulo(c.areaId), c.tipo, naFila) };
}

/**
 * WhatsApp (pedido 23/11/2026): "para o estudo de Ipioca" / "retoma o estudo de Ipioca". Sem nome, vale o único
 * estudo rodando (ou parado); com mais de um, pergunta qual.
 */
export async function tratarParadaEstudo(m: Recebida, responder: (t: string) => Promise<unknown>): Promise<boolean> {
  const pedido = lerPedidoParada(m.texto);
  if (!pedido) return false;
  const candidatos = await db.comandoClaude.findMany({
    where: { tipo: TIPOS, areaId: { not: null }, ...(pedido === "parar" ? { status: { in: ["fila", "rodando"] } } : { status: "parado", paradoEm: { gt: limite() } }) },
    orderBy: { createdAt: "desc" },
  });
  if (!candidatos.length) {
    await responder(pedido === "parar" ? "Não tem estudo rodando agora." : `Não tem estudo parado nos últimos ${DIAS_GUARDADO} dias para retomar.`);
    return true;
  }
  const areas = await db.area.findMany({ where: { id: { in: candidatos.map((c) => c.areaId!) } } });
  const citadas = areaPorTexto(m.texto, areas);
  const alvos = citadas.length ? candidatos.filter((c) => citadas.some((a) => a.id === c.areaId)) : candidatos;
  if (alvos.length !== 1) {
    const nomes = (alvos.length ? alvos : candidatos).map((c) => `• ${tituloArea(areas.find((a) => a.id === c.areaId)!)}`);
    await responder(`Qual estudo? Mande de novo com o nome da área:\n${[...new Set(nomes)].join("\n")}`);
    return true;
  }
  try {
    await responder((pedido === "parar" ? await pararEstudo(alvos[0].id) : await retomarEstudo(alvos[0].id)).texto);
  } catch (e) {
    await responder((e as Error).message);
  }
  return true;
}
