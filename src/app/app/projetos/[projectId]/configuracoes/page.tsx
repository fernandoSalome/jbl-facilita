import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import NewProjectForm from "@/components/NewProjectForm";
import DeleteProject from "@/components/DeleteProject";

export const dynamic = "force-dynamic";

export default async function ProjectSettings({ params }: { params: { projectId: string } }) {
  const session = await requireSession();
  const p = await db.project.findUniqueOrThrow({ where: { id: params.projectId } });
  return (
    <>
      <PageHeader eyebrow={`${p.municipio} · ${p.uf}`} title="Configurações" subtitle={`Dados do loteamento ${p.name}. O que mudar aqui vale para as propostas dele.`} />
      <div className="grid max-w-3xl gap-6 p-8">
        <NewProjectForm
          projeto={{ id: p.id, name: p.name, municipio: p.municipio, uf: p.uf, areaTotal: p.areaTotal, matricula: p.matricula, tipo: p.tipo, fase: p.fase, aerialImage: p.aerialImage }}
        />
        {session.role === "ADMIN" && <DeleteProject id={p.id} name={p.name} />}
      </div>
    </>
  );
}
