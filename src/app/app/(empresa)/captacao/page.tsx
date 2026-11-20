import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import FunilAreas from "@/components/captacao/FunilAreas";
import { listarAreas } from "@/lib/captacao-db";

export const dynamic = "force-dynamic";

/** Captação de áreas: funil por etapa, uma área por card (pedido 19/11/2026) */
export default async function Captacao() {
  const areas = await listarAreas();
  return (
    <>
      <PageHeader
        eyebrow="JBL Incorporadora"
        title="Captação de áreas"
        subtitle="Cada card é uma área: do KMZ à proposta e ao contrato. O mesmo dono ou corretor pode ter várias."
        actions={<Link className="btn-gold" href="/app/captacao/nova">+ Nova área</Link>}
      />
      <FunilAreas areas={areas.map((a) => ({ ...a, updatedAt: a.updatedAt.toISOString() }))} />
    </>
  );
}
