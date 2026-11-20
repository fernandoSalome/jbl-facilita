import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { validarArea } from "@/lib/captacao";
import { lerPoligono } from "@/lib/kml";

export const dynamic = "force-dynamic";

/** Nova área na captação (pedido 19/11/2026) */
export async function POST(req: Request) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const v = validarArea(b);
    if ("erro" in v) return json({ error: v.erro }, 400);
    const poligono = lerPoligono(b.poligono);
    const a = await db.area.create({ data: { ...(v.dados as Prisma.AreaCreateInput), poligono: poligono ?? undefined, documentos: poligono ? { "KMZ da área": "ok" } : {} } });
    return json({ id: a.id });
  });
}
