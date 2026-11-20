import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import CidadesEditor from "@/components/captacao/CidadesEditor";

export const dynamic = "force-dynamic";

/** Biblioteca de cidades: leis e mapas oficiais por cidade, com a data da conferência e o alerta */
export default async function Cidades() {
  const cidades = await db.cidade.findMany({ orderBy: [{ uf: "asc" }, { nome: "asc" }] });
  return (
    <>
      <PageHeader eyebrow="Ferramentas" title="Biblioteca de cidades" subtitle="Leis e mapas oficiais por cidade. Sempre lei publicada e mapa vigente, com a data em que foi conferido." />
      <div className="p-8"><CidadesEditor cidades={cidades.map((c) => ({ ...c, conferidoEm: c.conferidoEm?.toISOString().slice(0, 10) ?? "" }))} /></div>
    </>
  );
}
