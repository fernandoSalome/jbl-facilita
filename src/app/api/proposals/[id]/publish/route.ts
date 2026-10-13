import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { parseOptions } from "@/lib/proposals";

/** Publica (ou prorroga): gera a validade e libera o link público. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const { extendDays } = await req.json().catch(() => ({}));
    const p = await db.proposal.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!p) return json({ error: "Proposta não encontrada" }, 404);

    const now = new Date();
    if (extendDays) {
      const base = p.expiresAt && p.expiresAt > now ? p.expiresAt : now;
      await db.proposal.update({ where: { id: p.id }, data: { expiresAt: new Date(base.getTime() + extendDays * 864e5) } });
      await db.proposalEvent.create({ data: { proposalId: p.id, type: "extend", meta: { by: s.name, days: extendDays } } });
      return json({ ok: true });
    }

    const dias = parseOptions(p.options).validadeDias;
    await db.proposal.update({
      where: { id: p.id },
      data: {
        status: p.status === "rascunho" ? "enviada" : p.status,
        publishedAt: p.publishedAt ?? now,
        expiresAt: new Date(now.getTime() + dias * 864e5),
      },
    });
    await db.proposalEvent.create({ data: { proposalId: p.id, type: "publish", meta: { by: s.name } } });
    await db.project.update({ where: { id: p.projectId }, data: { fase: "proposta" } }).catch(() => {});
    return json({ ok: true });
  });
}
