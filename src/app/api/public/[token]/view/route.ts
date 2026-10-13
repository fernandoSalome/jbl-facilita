import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { isPreviewBot } from "@/lib/proposals";

/**
 * Chamado pelo JavaScript da página pública. Robôs de prévia (WhatsApp etc.) não
 * executam JS, então não marcam a proposta como aberta. Usuários logados no portal
 * também não contam.
 *   { kind: "open" }                         → nova abertura
 *   { kind: "beat", seconds, maxScroll, section } → tempo de leitura
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  if (isPreviewBot(req.headers.get("user-agent"))) return json({ ok: true, ignored: "bot" });
  if (await getSession()) return json({ ok: true, ignored: "staff" });

  const p = await db.proposal.findFirst({ where: { publicToken: params.token, deletedAt: null } });
  if (!p || p.status === "rascunho") return json({ ok: false }, 404);
  const b = await req.json().catch(() => ({}));
  const now = new Date();

  if (b.kind === "open") {
    await db.proposal.update({
      where: { id: p.id },
      data: {
        viewCount: { increment: 1 },
        firstViewedAt: p.firstViewedAt ?? now,
        lastViewedAt: now,
        status: p.status === "enviada" ? "aberta" : p.status,
      },
    });
    const e = await db.proposalEvent.create({ data: { proposalId: p.id, type: "view", meta: { seconds: 0, maxScroll: 0 } } });
    return json({ ok: true, visit: e.id });
  }

  if (b.kind === "beat" && typeof b.visit === "string") {
    const e = await db.proposalEvent.findFirst({ where: { id: b.visit, proposalId: p.id, type: "view" } });
    if (e) {
      const prev = (e.meta ?? {}) as { maxScroll?: number; sections?: string[] };
      const sections = Array.from(new Set([...(prev.sections ?? []), ...(Array.isArray(b.sections) ? b.sections : [])])).slice(0, 40);
      await db.proposalEvent.update({
        where: { id: e.id },
        data: {
          meta: {
            seconds: Math.min(Number(b.seconds) || 0, 6 * 3600),
            maxScroll: Math.max(prev.maxScroll ?? 0, Math.min(Number(b.maxScroll) || 0, 100)),
            sections,
          },
        },
      });
      await db.proposal.update({ where: { id: p.id }, data: { lastViewedAt: now } });
    }
    return json({ ok: true });
  }
  return json({ ok: false }, 400);
}
