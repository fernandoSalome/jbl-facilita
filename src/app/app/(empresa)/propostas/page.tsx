import { requireSession } from "@/lib/auth";
import { listProposals } from "@/lib/queries";
import PageHeader from "@/components/PageHeader";
import ProposalsTable from "@/components/proposals/ProposalsTable";

export const dynamic = "force-dynamic";

export default async function TodasPropostas({ searchParams }: { searchParams: { excluidas?: string } }) {
  const session = await requireSession();
  const isAdmin = session.role === "ADMIN";
  const rows = await listProposals({ showDeleted: isAdmin && searchParams.excluidas === "1" });
  return (
    <>
      <PageHeader eyebrow="JBL Incorporadora" title="Todas as propostas" subtitle="Propostas de todos os loteamentos. Para criar uma nova, entre no loteamento." />
      <div className="p-8">
        <ProposalsTable rows={rows} isAdmin={isAdmin} showProject />
      </div>
    </>
  );
}
