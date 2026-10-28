import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import CartasRecebidas from "@/components/proposals/CartasRecebidas";

export const dynamic = "force-dynamic";

/** Todas as cartas de intenção recebidas: dados enviados, minuta e assinatura */
export default async function CartasPage() {
  await requireSession();
  const cartas = await db.intentLetter.findMany({
    where: { proposal: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      protocolo: true,
      createdAt: true,
      data: true,
      minutaStatus: true,
      linkEnviadoEm: true,
      assinadaEm: true,
      pdfAssinadoNome: true,
      proposal: { select: { id: true, name: true, ownerName: true, project: { select: { name: true, municipio: true, uf: true } } } },
    },
  });
  const linhas = cartas.map((c) => {
    const p = ((c.data as { proprietario?: Record<string, string> })?.proprietario ?? {}) as Record<string, string>;
    return {
      id: c.id,
      protocolo: c.protocolo,
      recebidaEm: c.createdAt.toISOString(),
      nome: p.nome?.trim() || c.proposal.ownerName,
      telefone: p.telefone ?? "",
      email: p.email ?? "",
      propostaId: c.proposal.id,
      proposta: c.proposal.name,
      loteamento: `${c.proposal.project.name} · ${c.proposal.project.municipio}/${c.proposal.project.uf}`,
      status: c.minutaStatus,
      linkEnviadoEm: c.linkEnviadoEm?.toISOString() ?? null,
      assinadaEm: c.assinadaEm?.toISOString() ?? null,
      temAssinada: !!c.pdfAssinadoNome,
    };
  });
  return (
    <>
      <PageHeader eyebrow="JBL Incorporadora" title="Cartas recebidas" subtitle="Dados enviados pelas cartas de intenção das propostas, a minuta de cada uma e a assinatura eletrônica (Autentique)." />
      <div className="p-4 sm:p-8">
        <CartasRecebidas linhas={linhas} />
      </div>
    </>
  );
}
