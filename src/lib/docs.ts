import { db } from "./db";
import type { DocRow } from "@/components/docs/DocsBoard";

/** Documentos sem o arquivo (só os dados para a lista) */
export async function listarDocumentos(where: { projectId?: string | null }): Promise<DocRow[]> {
  const ds = await db.projectDocument.findMany({
    where: { deletedAt: null, ...where },
    orderBy: { createdAt: "desc" },
    select: { id: true, tipo: true, titulo: true, resumo: true, fileName: true, mime: true, size: true, origem: true, enviadoPor: true, grupo: true, createdAt: true, projectId: true, project: { select: { name: true } } },
  });
  return ds.map(({ project, createdAt, ...d }) => ({ ...d, createdAt: createdAt.toISOString(), projectName: project?.name ?? null }));
}
