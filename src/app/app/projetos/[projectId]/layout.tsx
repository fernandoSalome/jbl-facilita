import { notFound, redirect } from "next/navigation";
import Shell from "@/components/shell/Shell";
import { db } from "@/lib/db";

export default async function ProjectLayout({ params, children }: { params: { projectId: string }; children: React.ReactNode }) {
  const p = await db.project.findFirst({ where: { id: params.projectId, deletedAt: null }, select: { id: true, speAssinadaEm: true } });
  if (!p) notFound();
  // a página do Projeto de Loteamento só existe depois do contrato da SPE (pedido 20/11/2026);
  // antes disso, tudo (inclusive voltar da proposta) leva para a área na Captação
  if (!p.speAssinadaEm) {
    const area = await db.area.findFirst({ where: { projectId: p.id, deletedAt: null }, select: { id: true } });
    if (area) redirect(`/app/captacao/${area.id}?aba=etapa&ver=proposta`);
  }
  return <Shell projectId={p.id}>{children}</Shell>;
}
