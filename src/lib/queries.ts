import { db } from "./db";
import { calcular } from "./calc";
import { displayStatus, parseInputs, parseOptions } from "./proposals";

export type ProposalRow = Awaited<ReturnType<typeof listProposals>>[number];

/** Lista de propostas com números principais e métricas de leitura. */
export async function listProposals(where: { projectId?: string; showDeleted?: boolean }) {
  const rows = await db.proposal.findMany({
    where: { projectId: where.projectId, deletedAt: where.showDeleted ? undefined : null },
    orderBy: { updatedAt: "desc" },
    include: {
      project: { select: { id: true, name: true, municipio: true, uf: true } },
      template: { select: { name: true } },
      events: { where: { type: "view" }, select: { meta: true } },
      _count: { select: { letters: true } },
    },
  });
  return rows.map((p) => {
    const inputs = parseInputs(p.inputs);
    const r = calcular(inputs);
    const seconds = p.events.reduce((s, e) => s + (Number((e.meta as { seconds?: number })?.seconds) || 0), 0);
    const maxScroll = p.events.reduce((m, e) => Math.max(m, Number((e.meta as { maxScroll?: number })?.maxScroll) || 0), 0);
    return {
      id: p.id,
      name: p.name,
      ownerName: p.ownerName,
      ownerPhone: p.ownerPhone,
      project: p.project,
      template: p.template.name,
      status: displayStatus(p),
      publicToken: p.publicToken,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      expiresAt: p.expiresAt?.toISOString() ?? null,
      lastViewedAt: p.lastViewedAt?.toISOString() ?? null,
      updatedAt: p.updatedAt.toISOString(),
      deletedAt: p.deletedAt?.toISOString() ?? null,
      viewCount: p.viewCount,
      readSeconds: seconds,
      maxScroll,
      letters: p._count.letters,
      overridesCount: Object.keys((p.overrides as object) ?? {}).length,
      inputs,
      options: parseOptions(p.options),
      lotes: r.lotes,
      vgvAvista: r.vgvAvista,
      vgvGlobal: r.principal.carteiraEmp,
      terPct: r.terrenistaPct,
    };
  });
}
