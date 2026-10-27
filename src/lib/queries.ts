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
      letters: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, protocolo: true, createdAt: true, data: true, minutaStatus: true } },
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
      letters: p.letters.length,
      carta: p.letters[0]
        ? {
            id: p.letters[0].id,
            protocolo: p.letters[0].protocolo,
            createdAt: p.letters[0].createdAt.toISOString(),
            nome: ((p.letters[0].data as { proprietario?: { nome?: string } })?.proprietario?.nome ?? "") as string,
            minuta: p.letters[0].minutaStatus,
          }
        : null,
      formato: p.formato,
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
