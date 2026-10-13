import { db } from "@/lib/db";
import { DEFAULT_INPUTS } from "@/lib/calc";
import PageHeader from "@/components/PageHeader";
import NewProposalForm from "@/components/proposals/NewProposalForm";

export const dynamic = "force-dynamic";

export default async function NewProposal({ params }: { params: { projectId: string } }) {
  const project = await db.project.findUniqueOrThrow({ where: { id: params.projectId } });
  const templates = await db.template.findMany({ where: { deletedAt: null, status: "ativo" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, description: true } });
  return (
    <>
      <PageHeader eyebrow={project.name} title="Nova proposta" subtitle="Preencha os dados como na planilha. Os resultados aparecem na hora, logo abaixo." />
      <div className="p-8">
        <NewProposalForm
          projectId={project.id}
          project={{ name: project.name, tipo: project.tipo, municipio: project.municipio, uf: project.uf, matricula: project.matricula, aerialImage: project.aerialImage }}
          templates={templates}
          initialInputs={{ ...DEFAULT_INPUTS, areaTotal: project.areaTotal }}
        />
      </div>
    </>
  );
}
