import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { listProposals } from "@/lib/queries";
import { fmtM2 } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import ProposalsTable from "@/components/proposals/ProposalsTable";

export const dynamic = "force-dynamic";

export default async function ProjectProposals({ params, searchParams }: { params: { projectId: string }; searchParams: { excluidas?: string } }) {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";
  const project = await db.project.findUniqueOrThrow({ where: { id: params.projectId } });
  const rows = await listProposals({ projectId: project.id, showDeleted: isAdmin && searchParams.excluidas === "1" });

  return (
    <>
      <PageHeader
        eyebrow={`${project.municipio} · ${project.uf}`}
        title="Propostas"
        subtitle={`${project.name} · ${fmtM2(project.areaTotal)}${project.matricula ? ` · Matrícula ${project.matricula}` : ""}`}
        actions={
          <>
            <Link href="/app/templates" className="btn-ghost">Templates</Link>
            <Link href={`/app/projetos/${project.id}/propostas/nova`} className="btn-gold">+ Nova proposta</Link>
          </>
        }
      />
      <div className="p-8">
        <ProposalsTable rows={rows} isAdmin={isAdmin} />
      </div>
    </>
  );
}
