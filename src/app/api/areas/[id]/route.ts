import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { lerChecklist, validarArea, validarDocumentos, validarHipoteses } from "@/lib/captacao";
import { lerPoligono } from "@/lib/kml";
import { lerCustos, lerEstudo1, lerEstudo2, lerPessoas } from "@/lib/captacao-estudos";

export const dynamic = "force-dynamic";

/** Altera a área: dados, etapa, situação, conclusão, documentos, hipóteses, checklist (edição) e polígono */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const atual = await db.area.findFirst({ where: { id: params.id, deletedAt: null }, select: { id: true } });
    if (!atual) return json({ error: "Área não encontrada" }, 404);
    const b = await req.json().catch(() => ({}));
    const v = validarArea(b, true);
    if ("erro" in v) return json({ error: v.erro }, 400);
    const data: Prisma.AreaUpdateInput = { ...(v.dados as Prisma.AreaUpdateInput) };
    if ("documentos" in b) data.documentos = validarDocumentos(b.documentos);
    if ("hipoteses" in b) data.hipoteses = validarHipoteses(b.hipoteses) as unknown as Prisma.InputJsonValue;
    if ("checklist" in b) data.checklist = lerChecklist(b.checklist).slice(0, 2000) as unknown as Prisma.InputJsonValue;
    if ("estudo1" in b) data.estudo1 = lerEstudo1(b.estudo1);
    if ("estudo2" in b) data.estudo2 = lerEstudo2(b.estudo2);
    if ("custos" in b) data.custos = lerCustos(b.custos);
    if ("pessoas" in b) data.pessoas = lerPessoas(b.pessoas);
    if ("poligono" in b) {
      const p = lerPoligono(b.poligono);
      if (!p) return json({ error: "Polígono inválido" }, 400);
      data.poligono = p;
    }
    await db.area.update({ where: { id: atual.id }, data });
    return json({ ok: true });
  });
}

/** Apaga a área (some do funil) */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    await db.area.updateMany({ where: { id: params.id, deletedAt: null }, data: { deletedAt: new Date() } });
    return json({ ok: true });
  });
}
