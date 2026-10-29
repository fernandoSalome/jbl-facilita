import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

/** Fixa (ou solta) a proposta no topo da lista. Não conta como alteração: a data de "Atualizada" não muda. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const b = await req.json().catch(() => null);
    if (typeof b?.fixada !== "boolean") return json({ error: "Dados inválidos" }, 400);
    const p = await db.proposal.findFirst({ where: { id: params.id, deletedAt: null }, select: { updatedAt: true } });
    if (!p) return json({ error: "Proposta não encontrada" }, 404);
    await db.proposal.update({ where: { id: params.id }, data: { pinnedAt: b.fixada ? new Date() : null, updatedAt: p.updatedAt } });
    return json({ ok: true });
  });
}
