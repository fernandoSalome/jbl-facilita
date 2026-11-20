import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { guardarRelatorio } from "@/lib/relatorio-db";

const MAX = 4 * 1024 * 1024;

/** Sobe o raio-x completo (.html do estudo) para aparecer no link do parceiro */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const form = await req.formData().catch(() => null);
    const arq = form?.get("arquivo");
    if (!(arq instanceof File) || arq.size > MAX || !/\.html?$/i.test(arq.name)) return json({ error: "Envie o .html do raio-x (até 4 MB)" }, 400);
    if (!(await db.area.findFirst({ where: { id: params.id, deletedAt: null }, select: { id: true } }))) return json({ error: "Área não encontrada" }, 404);
    try {
      const campo = form?.get("tipo") === "mercado" ? "relatorioMercado" : "relatorioCompleto";
      return json({ ok: true, ...(await guardarRelatorio(db, params.id, await arq.text(), [], campo)) });
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }
  });
}

/** Tira o raio-x completo do link (o link volta a mostrar só o resumo do estudo) */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const campo = new URL(req.url).searchParams.get("tipo") === "mercado" ? "relatorioMercado" : "relatorioCompleto";
    await db.area.updateMany({ where: { id: params.id }, data: { [campo]: Prisma.DbNull } });
    return json({ ok: true });
  });
}
