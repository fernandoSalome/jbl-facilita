import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

/**
 * Bloqueia (ou libera) a edição da proposta: bloqueada, nada dela muda (planilha, textos, prazo,
 * template), só dá para ver. Só depois de enviada. Não conta como alteração ("Atualizada" não muda).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const b = await req.json().catch(() => null);
    if (typeof b?.bloqueada !== "boolean") return json({ error: "Dados inválidos" }, 400);
    const p = await db.proposal.findFirst({ where: { id: params.id, deletedAt: null }, select: { updatedAt: true, status: true } });
    if (!p) return json({ error: "Proposta não encontrada" }, 404);
    if (b.bloqueada && p.status === "rascunho") return json({ error: "Só dá para bloquear depois de enviar a proposta" }, 400);
    await db.proposal.update({
      where: { id: params.id },
      data: { lockedAt: b.bloqueada ? new Date() : null, lockedBy: b.bloqueada ? s.name : null, updatedAt: p.updatedAt },
    });
    await db.proposalEvent.create({ data: { proposalId: params.id, type: b.bloqueada ? "lock" : "unlock", meta: { by: s.name } } });
    return json({ ok: true });
  });
}
