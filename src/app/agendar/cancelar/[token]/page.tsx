import { db } from "@/lib/db";
import { dataExtenso } from "@/lib/agenda";
import CancelarReuniao from "@/components/calendario/CancelarReuniao";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cancelar reunião · JBL", robots: { index: false, follow: false } };

export default async function CancelarPage({ params }: { params: { token: string } }) {
  const c = await db.compromisso.findUnique({ where: { cancelToken: params.token }, include: { user: { select: { name: true } } } });
  return (
    <main className="grid min-h-screen place-items-center bg-alt p-6">
      <div className="card w-full max-w-md p-7">
        <div className="eyebrow mb-2">JBL Incorporadora</div>
        {!c ? (
          <p className="text-navy">Reunião não encontrada.</p>
        ) : c.status !== "marcado" ? (
          <p className="text-navy">Esta reunião já foi cancelada.</p>
        ) : c.inicio < new Date() ? (
          <p className="text-navy">Esta reunião já passou.</p>
        ) : (
          <>
            <h1 className="h-display mb-2 text-2xl">{c.titulo}</h1>
            <p className="mb-5 text-[14px] text-muted">{dataExtenso(c.inicio)} · com {c.user.name}</p>
            <CancelarReuniao token={params.token} />
          </>
        )}
      </div>
    </main>
  );
}
