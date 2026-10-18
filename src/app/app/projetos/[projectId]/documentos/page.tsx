import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { listarDocumentos } from "@/lib/docs";
import PageHeader from "@/components/PageHeader";
import DocsBoard from "@/components/docs/DocsBoard";

export const dynamic = "force-dynamic";

export default async function ProjectDocs({ params }: { params: { projectId: string } }) {
  await requireSession();
  const project = await db.project.findUniqueOrThrow({ where: { id: params.projectId } });
  const [docs, projetos] = await Promise.all([
    listarDocumentos({ projectId: project.id }),
    db.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow={`${project.municipio} · ${project.uf}`}
        title="Documentação"
        subtitle={`${project.name} · ${docs.length} documento(s). Os arquivos mandados no WhatsApp chegam aqui sozinhos, separados por pasta.`}
      />
      <div className="p-8">
        <DocsBoard docs={docs} projetos={projetos} mostrarProjeto />
      </div>
    </>
  );
}
