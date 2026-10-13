import Link from "next/link";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import ProjectCard from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

export default async function Projetos() {
  const projects = await db.project.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { proposals: { where: { deletedAt: null } } } } },
  });
  return (
    <>
      <PageHeader
        eyebrow="JBL Incorporadora"
        title="Loteamentos"
        subtitle="Cada loteamento é um projeto com suas propostas, documentos, licenças e grupo de WhatsApp."
        actions={<Link className="btn-gold" href="/app/projetos/novo">+ Novo loteamento</Link>}
      />
      <div className="grid gap-4 p-8 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => <ProjectCard key={p.id} p={p} count={p._count.proposals} />)}
        <Link href="/app/projetos/novo" className="grid min-h-[230px] place-items-center rounded-md border-2 border-dashed border-gold-line text-center text-gold-deep transition hover:border-gold hover:bg-gold-soft">
          <span><span className="block font-display text-4xl">+</span><span className="font-semibold">Novo loteamento</span></span>
        </Link>
      </div>
    </>
  );
}
