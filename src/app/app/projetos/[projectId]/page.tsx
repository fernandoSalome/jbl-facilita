import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Abrir o loteamento (card ou seletor): se ele veio de uma área da Captação, cai na página da área; senão, nas propostas */
export default async function ProjectHome({ params }: { params: { projectId: string } }) {
  const area = await db.area.findFirst({ where: { projectId: params.projectId, deletedAt: null }, select: { id: true } });
  redirect(area ? `/app/captacao/${area.id}` : `/app/projetos/${params.projectId}/propostas`);
}
