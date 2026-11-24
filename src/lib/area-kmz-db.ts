import { Prisma } from "@prisma/client";
import { lerChecklist } from "./captacao";
import { checklistSemEstudo, etapaSemEstudo, type ModoTroca } from "./area-kmz";
import { db } from "./db";
import { hectares } from "./kml";
import type { Poligono } from "./poligono";

/**
 * Troca o KMZ da área (pedido 23/11/2026). "manter": só o polígono e o tamanho mudam. "apagar": também some o
 * estudo (Viabilidade Legal e Mercadológica, relatórios, respostas do Raio-x no checklist) e o estudo que estiver
 * na fila, rodando ou parado é descartado (a VPS para o que roda no próximo aviso de andamento).
 */
export async function trocarKmz(areaId: string, poligono: Poligono, modo: ModoTroca) {
  const a = await db.area.findFirst({ where: { id: areaId, deletedAt: null }, select: { id: true, etapa: true, checklist: true, documentos: true } });
  if (!a) throw new Error("Área não encontrada");
  const docs = a.documentos && typeof a.documentos === "object" ? (a.documentos as Record<string, string>) : {};
  const data: Prisma.AreaUpdateInput = { poligono, hectares: hectares(poligono), documentos: { ...docs, "KMZ da área": "ok" } };
  if (modo === "apagar") {
    Object.assign(data, {
      estudo1: {},
      estudo2: {},
      relatorio: null,
      relatorioCompleto: Prisma.DbNull,
      relatorioMercado: Prisma.DbNull,
      checklist: checklistSemEstudo(lerChecklist(a.checklist)) as unknown as Prisma.InputJsonValue,
      etapa: etapaSemEstudo(a.etapa),
    });
    await db.comandoClaude.updateMany({ where: { areaId: a.id, tipo: { in: ["estudo", "mercado"] }, status: { in: ["fila", "rodando", "parado", "confirmar"] } }, data: { status: "descartado" } });
  }
  await db.area.update({ where: { id: a.id }, data });
}
