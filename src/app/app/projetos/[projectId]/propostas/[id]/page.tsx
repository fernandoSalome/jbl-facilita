import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { displayStatus, parseInputs, parseOptions, parseOverrides } from "@/lib/proposals";
import ProposalWorkspace from "@/components/proposals/ProposalWorkspace";

export const dynamic = "force-dynamic";

export default async function ProposalPage({ params }: { params: { projectId: string; id: string } }) {
  await requireSession();
  const p = await db.proposal.findFirst({
    where: { id: params.id, projectId: params.projectId, deletedAt: null },
    include: {
      project: true,
      template: { select: { name: true } },
      letters: { orderBy: { createdAt: "desc" }, select: { id: true, protocolo: true, createdAt: true, data: true } },
      events: { where: { type: "view" }, orderBy: { createdAt: "desc" }, take: 30, select: { createdAt: true, meta: true } },
    },
  });
  if (!p) notFound();

  return (
    <ProposalWorkspace
      proposal={{
        id: p.id,
        name: p.name,
        ownerName: p.ownerName,
        ownerPhone: p.ownerPhone,
        status: displayStatus(p),
        rawStatus: p.status,
        publicToken: p.publicToken,
        publishedAt: p.publishedAt?.toISOString() ?? null,
        expiresAt: p.expiresAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        viewCount: p.viewCount,
        firstViewedAt: p.firstViewedAt?.toISOString() ?? null,
        lastViewedAt: p.lastViewedAt?.toISOString() ?? null,
        template: p.template.name,
        inputs: parseInputs(p.inputs),
        options: parseOptions(p.options),
        overrides: parseOverrides(p.overrides),
        overridesCount: Object.keys(parseOverrides(p.overrides)).length,
      }}
      project={{
        id: p.project.id,
        name: p.project.name,
        tipo: p.project.tipo,
        municipio: p.project.municipio,
        uf: p.project.uf,
        matricula: p.project.matricula,
        aerialImage: p.project.aerialImage,
      }}
      letters={p.letters.map((l) => {
        const d = l.data as { proprietario?: { nome?: string; cpf?: string; telefone?: string; email?: string }; matricula?: { name?: string; data?: string } | null };
        return {
          id: l.id,
          protocolo: l.protocolo,
          createdAt: l.createdAt.toISOString(),
          nome: d.proprietario?.nome ?? "",
          cpf: d.proprietario?.cpf ?? "",
          telefone: d.proprietario?.telefone ?? "",
          email: d.proprietario?.email ?? "",
          arquivo: d.matricula?.name ?? null,
        };
      })}
      visits={p.events.map((e) => {
        const m = (e.meta ?? {}) as { seconds?: number; maxScroll?: number; sections?: string[] };
        return { at: e.createdAt.toISOString(), seconds: m.seconds ?? 0, maxScroll: m.maxScroll ?? 0, sections: m.sections ?? [] };
      })}
    />
  );
}
