import Link from "next/link";
import { db } from "@/lib/db";
import PageHeader from "@/components/PageHeader";
import { nomeEtapa, tituloArea } from "@/lib/captacao";
import { lerEstudo1, lerEstudo2, SEMAFOROS, STATUS_E1, VEREDITOS } from "@/lib/captacao-estudos";

export const dynamic = "force-dynamic";

/** Estudos: o raio-x (Estudo 1) e o mercadológico (Estudo 2) de todas as áreas */
export default async function Estudos() {
  const areas = await db.area.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageHeader eyebrow="Negócios" title="Estudos" subtitle="Viabilidade Legal e Viabilidade Mercadológica de todas as áreas, no padrão JBL." actions={<Link className="btn-gold" href="/app/captacao/nova">+ Nova área (subir KMZ)</Link>} />
      <div className="p-8">
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-[12px] uppercase tracking-wider text-muted">
              <tr><th className="px-4 py-2">Área</th><th className="px-4 py-2">Etapa</th><th className="px-4 py-2">Viabilidade Legal</th><th className="px-4 py-2">Resultado</th><th className="px-4 py-2">Viabilidade Mercadológica</th><th className="px-4 py-2">Raio-x</th></tr>
            </thead>
            <tbody>
              {areas.map((a) => {
                const e1 = lerEstudo1(a.estudo1);
                const e2 = lerEstudo2(a.estudo2);
                return (
                  <tr key={a.id} className="border-t border-line hover:bg-gold-soft">
                    <td className="px-4 py-2"><Link className="font-semibold text-navy hover:underline" href={`/app/captacao/${a.id}?aba=etapa&ver=previabilidade`}>{tituloArea(a)}</Link></td>
                    <td className="px-4 py-2">{nomeEtapa(a.etapa)}</td>
                    <td className="px-4 py-2">{STATUS_E1[e1.status]}</td>
                    <td className="px-4 py-2">{[e1.semaforo && SEMAFOROS[e1.semaforo], e1.zona, e1.lotes.medio && `${e1.lotes.medio} lotes`].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="px-4 py-2">{e2.veredito ? VEREDITOS[e2.veredito] : "—"}</td>
                    <td className="px-4 py-2">{a.relatorioCompleto ? <Link className="font-semibold text-gold-deep underline" href={`/app/captacao/${a.id}?aba=estudo`}>abrir</Link> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
