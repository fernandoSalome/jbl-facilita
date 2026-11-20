import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import { acaoDoPasso, cartao, lerEstudo1, pendencias, SEMAFOROS } from "@/lib/captacao-estudos";
import { modoSimples } from "@/lib/modo";
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
  const simples = modoSimples();
  // "Faça hoje": o próximo passo das áreas que mais precisam de ação (vermelho, depois dourado)
  const ordem = { bad: 0, warn: 1, run: 2, ok: 3 } as const;
  const fazer = areas
    .filter((a) => a.situacao === "ativa")
    .map((a) => ({ a, c: cartao(a), p: acaoDoPasso(a) }))
    .sort((x, y) => ordem[x.c.tom] - ordem[y.c.tom])
    .slice(0, 5);
  const hojeReunioes = reunioes.filter((r) => r.inicio.toDateString() === new Date().toDateString());
  const mais = (
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
  );
  return (
    <>
      <PageHeader eyebrow="Dia a dia" title={simples ? "Hoje" : "Dashboard Dia a Dia"} subtitle={simples ? "O que fazer agora, uma coisa de cada vez." : "Pendências de todas as áreas. Clique para ir direto à etapa certa."} />
      <div className="grid gap-4 px-8 pt-8">
        <h2 className="h-display text-[24px]">Faça hoje</h2>
        {hojeReunioes.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-4 rounded-md border-2 border-navy bg-white px-5 py-4">
            <span className="text-2xl">📅</span>
            <span className="flex-1"><b className="block text-[18px] text-navy">Reunião às {r.inicio.toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" })}</b><span className="text-[14px] text-ink">{r.titulo}{r.local ? ` · ${r.local}` : ""}</span></span>
            <Link href="/app/calendario" className="btn-ghost px-5 py-2.5">Ver na agenda</Link>
          </div>
        ))}
        {fazer.map(({ a, p }) => (
          <div key={a.id} className="flex flex-wrap items-center gap-4 rounded-md border border-gold-line bg-white px-5 py-4 shadow-sm">
            <span className="min-w-[220px] flex-1">
              <span className="block text-[12px] font-semibold uppercase tracking-wider text-muted">{tituloArea(a)}</span>
              <b className="block font-display text-[20px] leading-tight text-navy">{p.titulo}</b>
              <span className="block text-[14px] text-ink">{p.explica}</span>
            </span>
            <Link href={`/app/captacao/${a.id}?aba=${p.aba}`} className="btn-gold px-6 py-3 text-[15px]">{p.botao}</Link>
          </div>
        ))}
        {!fazer.length && !hojeReunioes.length && <p className="text-sm text-muted">Nada para fazer agora.</p>}
      </div>
      {simples ? (
        <details className="mx-8 mt-6 pb-8">
          <summary className="cursor-pointer text-[14px] font-semibold text-navy">Ver mais (pendências, reuniões, estudos, mensagens e cidades)</summary>
          {mais}
        </details>
      ) : mais}
    </>
  );
}
