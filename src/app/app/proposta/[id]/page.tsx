import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { displayStatus, parseInputs, parseOptions, parseOverrides } from "@/lib/proposals";
import { contentForProposal, latestVersion } from "@/lib/formato-server";
import { parseContent, parseFormato } from "@/lib/formatos";
import { MSG_KEY } from "@/lib/mensagem";
import ProposalEditor from "@/components/proposals/ProposalEditor";
import { pdfKeyOf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

/** Edição da proposta em tela cheia (sem o menu lateral do portal). */
export default async function PropostaPage({ params }: { params: { id: string } }) {
  await requireSession();
  const p = await db.proposal.findFirst({
    where: { id: params.id, deletedAt: null },
    include: { project: true, template: { select: { name: true } } },
  });
  if (!p) notFound();
  const formato = await contentForProposal(p);
  // carta de intenção mais recente desta proposta (dados que a pessoa enviou)
  const carta = await db.intentLetter.findFirst({ where: { proposalId: p.id }, orderBy: { createdAt: "desc" }, select: { id: true, minutaStatus: true } });
  // proposta presa numa versão anterior do template (salvo com "só nas propostas novas")
  const ultima = await latestVersion(p.templateId, parseFormato(p.formato));
  const templateDesatualizado = !!(p.formatoVersionId && ultima && ultima.id !== p.formatoVersionId);
  // mensagem de envio: a do template de hoje (mesmo presa numa versão anterior); bloqueada fica com a da versão dela
  const msgUltima = !p.lockedAt && ultima ? parseContent(ultima.content, parseFormato(p.formato)).overrides?.[MSG_KEY] : undefined;

  return (
    <ProposalEditor
      formato={formato}
      templateDesatualizado={templateDesatualizado}
      msgTemplate={!p.lockedAt && ultima ? { texto: typeof msgUltima === "string" ? msgUltima : undefined } : undefined}
      carta={carta}
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
        template: p.template.name,
        inputs: parseInputs(p.inputs),
        options: parseOptions(p.options),
        overrides: parseOverrides(p.overrides),
        lockedAt: p.lockedAt?.toISOString() ?? null,
        lockedBy: p.lockedBy,
        pdfPages: p.pdfKey === pdfKeyOf(p) ? p.pdfPages : null,
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
    />
  );
}
