import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import { lerEstudo1, pendencias, SEMAFOROS } from "@/lib/captacao-estudos";
import { tituloArea } from "@/lib/captacao";
import { FUSO } from "@/lib/agenda";

export const dynamic = "force-dynamic";

/** Dashboard Dia a Dia (pedido 19/11/2026): o que está esperando você hoje, em todas as áreas */
export default async function DiaADia() {
  const s = await requireSession();
  const ini = new Date();
  ini.setHours(0, 0, 0, 0);
  const fim = new Date(+ini + 2 * 864e5);
  const [areas, reunioes, mensagens, cidades] = await Promise.all([
    db.area.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" } }),
    db.compromisso.findMany({ where: { userId: s.sub, status: "marcado", inicio: { gte: ini, lt: fim } }, orderBy: { inicio: "asc" } }),
    db.areaMensagem.findMany({ where: { deMim: false, quando: { gte: new Date(Date.now() - 864e5) } }, orderBy: { quando: "desc" }, take: 8, include: { area: { select: { id: true, cidade: true, dono: true, corretor: true, nome: true } } } }),
    db.cidade.findMany({ where: { alerta: { not: null } }, orderBy: { nome: "asc" } }),
  ]);
  const pend = pendencias(areas);
  const prontos = areas.filter((a) => a.situacao === "ativa" && ["pronto", "perguntado", "sim"].includes(lerEstudo1(a.estudo1).status));
  const hora = (d: Date) => d.toLocaleString("pt-BR", { timeZone: FUSO, weekday: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <>
      <PageHeader eyebrow="Dia a dia" title="Dashboard Dia a Dia" subtitle="Pendências de todas as áreas. Clique para ir direto à etapa certa." />
      <div className="grid gap-5 p-8 lg:grid-cols-2">
        <section className="card p-5 lg:col-span-2">
          <h3 className="eyebrow mb-3">🔴 Esperando sua resposta</h3>
          {pend.length ? (
            <ul className="grid gap-2 md:grid-cols-2">
              {pend.slice(0, 20).map((p, i) => (
                <li key={i}><Link href={`/app/captacao/${p.areaId}?aba=${p.aba}`} className="flex justify-between gap-3 rounded border border-line px-3 py-2 text-sm hover:border-gold hover:bg-gold-soft"><b className="text-navy">{p.titulo}</b><span className="text-muted">{p.oQue}</span></Link></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Nada pendente.</p>}
        </section>
        <section className="card p-5">
          <h3 className="eyebrow mb-3">📅 Reuniões (hoje e amanhã)</h3>
          {reunioes.length ? <ul className="grid gap-1.5 text-sm">{reunioes.map((r) => <li key={r.id}><b>{hora(r.inicio)}</b> · {r.titulo}{r.local ? ` · ${r.local}` : ""}</li>)}</ul> : <p className="text-sm text-muted">Nenhuma.</p>}
          <Link href="/app/calendario" className="mt-3 inline-block text-[13px] font-semibold text-gold-deep underline">Abrir a agenda</Link>
        </section>
        <section className="card p-5">
          <h3 className="eyebrow mb-3">🔬 Estudos prontos</h3>
          {prontos.length ? <ul className="grid gap-1.5 text-sm">{prontos.map((a) => { const e = lerEstudo1(a.estudo1); return <li key={a.id}><Link className="font-semibold text-navy hover:underline" href={`/app/captacao/${a.id}?aba=etapa&ver=previabilidade`}>{tituloArea(a)}</Link> · {e.semaforo ? SEMAFOROS[e.semaforo] : ""} {e.lotes.medio ? `· ${e.lotes.medio} lotes` : ""}</li>; })}</ul> : <p className="text-sm text-muted">Nenhum.</p>}
        </section>
        <section className="card p-5">
          <h3 className="eyebrow mb-3">💬 Mensagens novas (24 h)</h3>
          {mensagens.length ? <ul className="grid gap-1.5 text-sm">{mensagens.map((m) => <li key={m.id}><Link className="font-semibold text-navy hover:underline" href={`/app/captacao/${m.area.id}?aba=etapa&ver=captacao`}>{m.nome}</Link> <span className="text-muted">({tituloArea(m.area)})</span>: {m.texto.slice(0, 90)}</li>)}</ul> : <p className="text-sm text-muted">Nenhuma.</p>}
        </section>
        <section className="card p-5">
          <h3 className="eyebrow mb-3">⚠️ Biblioteca de cidades</h3>
          {cidades.length ? <ul className="grid gap-1.5 text-sm">{cidades.map((c) => <li key={c.id}><b>{c.nome}</b>: {c.alerta}</li>)}</ul> : <p className="text-sm text-muted">Sem alertas.</p>}
        </section>
      </div>
    </>
  );
}
