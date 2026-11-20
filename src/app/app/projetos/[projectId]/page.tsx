import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Abrir o loteamento (card ou seletor): se ele veio de uma área da Captação, cai na página da área; senão, nas propostas */
export default async function ProjectHome({ params }: { params: { projectId: string } }) {
  // com SPE assinada, o projeto abre nas propostas (a jornada); antes disso, na área (a negociação)
  const p = await db.project.findFirst({ where: { id: params.projectId, deletedAt: null }, select: { speAssinadaEm: true } });
  const area = await db.area.findFirst({ where: { projectId: params.projectId, deletedAt: null }, select: { id: true } });
  redirect(area && !p?.speAssinadaEm ? `/app/captacao/${area.id}` : `/app/projetos/${params.projectId}/propostas`);
}
