import { tituloArea } from "./captacao";
import { grupoCentral } from "./captacao-db";
import { lerEstudo1 } from "./captacao-estudos";
import { db } from "./db";
import { NOME_ESTUDO, textoComecou, textoPronto, type TipoEstudo } from "./estudo-andamento";

/** Estudo da área ainda na fila ou rodando na VPS (o mais recente) */
export const estudoEmAndamento = (areaId: string) =>
  db.comandoClaude.findMany({
    where: { areaId, tipo: { in: ["estudo", "mercado"] }, status: { in: ["fila", "rodando"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, tipo: true, status: true, progresso: true, fase: true, iniciadoEm: true, createdAt: true },
  });

/**
 * Botão da tela (pedido 22/11/2026): põe o estudo na fila da VPS, como o KMZ no Central. A resposta sai no
 * JBL - Central; o JBL - Avisos recebe "comecei" e "pronto".
 */
export async function pedirEstudoPelaTela(areaId: string, tipo: TipoEstudo, autor: string) {
  const a = await db.area.findFirst({ where: { id: areaId, deletedAt: null } });
  if (!a) throw new Error("Área não encontrada");
  if (tipo === "estudo" && !a.poligono) throw new Error("A área ainda não tem o KMZ. Suba o arquivo em Configurações da área.");
  if ((await estudoEmAndamento(a.id)).some((c) => c.tipo === tipo)) throw new Error(`A ${NOME_ESTUDO[tipo]} desta área já está sendo feita.`);
  const g = await grupoCentral();
  if (!g) throw new Error("Nenhum grupo marcado como JBL - Central (tela Assistente WhatsApp)");
  // estudo novo do mesmo tipo: o parado (guardado na VPS) deixa de valer
  await db.comandoClaude.updateMany({ where: { areaId: a.id, tipo, status: "parado" }, data: { status: "descartado" } });
  if (tipo === "mercado") await db.area.update({ where: { id: a.id }, data: { estudo1: { ...lerEstudo1(a.estudo1), status: "sim" } } });
  await db.comandoClaude.create({ data: { texto: `${NOME_ESTUDO[tipo]} de ${tituloArea(a)}`, grupoJid: g.jid, autor, tipo, areaId: a.id } });
}

async function grupoAvisos() {
  const { grupoMonitoring } = await import("./agenda-whatsapp");
  return grupoMonitoring();
}

/** A VPS pegou o estudo: "Comecei a análise da gleba X" no JBL - Avisos. Falha no aviso não para o estudo. */
export async function avisarComeco(c: { areaId: string | null; tipo: string }) {
  if (!c.areaId || (c.tipo !== "estudo" && c.tipo !== "mercado")) return;
  const [a, g] = await Promise.all([db.area.findFirst({ where: { id: c.areaId } }), grupoAvisos()]);
  if (!a || !g) return;
  const { enviarTexto } = await import("./whatsapp");
  await enviarTexto(g.jid, `🤖 ${textoComecou(tituloArea(a), c.tipo)}`);
}

/** Estudo terminou: "pronto, o resumo está no Central" no JBL - Avisos */
export async function avisarFim(c: { areaId: string | null; tipo: string }, ok: boolean) {
  if (!c.areaId || (c.tipo !== "estudo" && c.tipo !== "mercado")) return;
  const [a, g] = await Promise.all([db.area.findFirst({ where: { id: c.areaId } }), grupoAvisos()]);
  if (!a || !g) return;
  const { enviarTexto } = await import("./whatsapp");
  await enviarTexto(g.jid, `🤖 ${textoPronto(tituloArea(a), c.tipo, ok)}`);
}
