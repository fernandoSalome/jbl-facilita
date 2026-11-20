import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import FunilAreas from "@/components/captacao/FunilAreas";
import { listarAreas } from "@/lib/captacao-db";
import { cartao } from "@/lib/captacao-estudos";

export const dynamic = "force-dynamic";

/** Captação de áreas: funil por etapa, uma área por card (pedido 19/11/2026) */
export default async function Captacao() {
  const areas = await listarAreas();
  return (
    <>
      <PageHeader
        eyebrow="JBL Incorporadora"
        title="Projetos"
        subtitle={<>Um cartão por <b>área</b>. O mesmo proprietário ou corretor pode ter várias áreas no funil. Clique num cartão para entrar.</>}
        actions={<Link className="btn-gold" href="/app/captacao/nova">+ Novo projeto</Link>}
      />
      <FunilAreas areas={areas.map((a) => ({ id: a.id, nome: a.nome, cidade: a.cidade, uf: a.uf, dono: a.dono, corretor: a.corretor, hectares: a.hectares, situacao: a.situacao, etapa: a.etapa, updatedAt: a.updatedAt.toISOString(), card: cartao(a) }))} />
    </>
  );
}
