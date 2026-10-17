import Link from "next/link";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { listProposals } from "@/lib/queries";
import { fmtMi, relTime } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/proposals/StatusBadge";
import ProjectCard from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

import { FASES } from "@/lib/fases";


export default async function Painel() {
  const session = await requireSession();
  const [projects, proposals] = await Promise.all([
    db.project.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" } }),
    listProposals({}),
  ]);
  const sent = proposals.filter((p) => p.status !== "rascunho");
  const opened = sent.filter((p) => p.viewCount > 0);
  const letters = proposals.reduce((s, p) => s + p.letters, 0);
  const vgv = sent.reduce((s, p) => s + p.vgvAvista, 0);
  const recent = [...proposals].filter((p) => p.lastViewedAt).sort((a, b) => (b.lastViewedAt! > a.lastViewedAt! ? 1 : -1)).slice(0, 5);
  const waiting = sent.filter((p) => p.viewCount === 0 && p.status !== "expirada").slice(0, 5);

  return (
    <>
      <PageHeader
        eyebrow="JBL Incorporadora · visão da empresa"
        title={`Olá, ${session.name.split(" ")[0]}`}
        subtitle="Como estão os loteamentos e as propostas em andamento."
        actions={<Link className="btn-gold" href="/app/projetos/novo">+ Novo loteamento</Link>}
      />
      <div className="grid gap-6 p-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-5">
          {[
            ["Loteamentos", String(projects.length), "ativos no portal"],
            ["Propostas enviadas", String(sent.length), `${proposals.length - sent.length} em rascunho`],
            ["Abertas pela família", String(opened.length), sent.length ? `${Math.round((opened.length / sent.length) * 100)}% das enviadas` : "—"],
            ["Cartas de intenção", String(letters), "recebidas pelo portal"],
            ["VGV em proposta", fmtMi(vgv), "à vista, propostas enviadas"],
          ].map(([k, v, d]) => (
            <div key={k} className="bg-white px-5 py-4">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{k}</div>
              <div className="mt-1 font-display text-[30px] leading-tight text-navy">{v}</div>
              <div className="text-[12px] text-muted">{d}</div>
            </div>
          ))}
        </div>

        <div className="card p-5">
          <div className="eyebrow mb-4">Funil de loteamentos</div>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {FASES.map(([k, label], i) => {
              const n = projects.filter((p) => p.fase === k).length;
              return (
                <div key={k} className={`rounded border px-3 py-3 ${n ? "border-gold-line bg-gold-soft" : "border-line bg-alt"}`}>
                  <div className="text-[11px] font-semibold text-muted">{i + 1}. {label}</div>
                  <div className="font-display text-2xl text-navy">{n}</div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] text-muted">Metas, atrasos e prazos de cada etapa entram quando os módulos de licenças e tarefas forem ativados.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="card">
            <div className="eyebrow border-b border-line px-5 py-3.5">Lidas recentemente</div>
            {recent.length === 0 ? <p className="px-5 py-6 text-sm text-muted">Nenhuma proposta aberta ainda.</p> : (
              <ul>
                {recent.map((p) => (
                  <li key={p.id} className="border-b border-line last:border-0">
                    <Link href={`/app/proposta/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-alt">
                      <span><b className="text-navy">{p.ownerName}</b><span className="block text-[12.5px] text-muted">{p.project.name} · {p.name}</span></span>
                      <span className="text-right text-[12.5px] text-muted">{relTime(p.lastViewedAt)}<span className="block">{p.viewCount}× · leu {p.maxScroll}%</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card">
            <div className="eyebrow border-b border-line px-5 py-3.5">Enviadas e ainda não abertas</div>
            {waiting.length === 0 ? <p className="px-5 py-6 text-sm text-muted">Tudo em dia.</p> : (
              <ul>
                {waiting.map((p) => (
                  <li key={p.id} className="border-b border-line last:border-0">
                    <Link href={`/app/proposta/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-alt">
                      <span><b className="text-navy">{p.ownerName}</b><span className="block text-[12.5px] text-muted">{p.project.name}</span></span>
                      <StatusBadge status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="h-display text-2xl">Loteamentos</h2>
            <Link href="/app/projetos" className="text-sm font-semibold text-gold-deep hover:underline">Ver todos</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.slice(0, 6).map((p) => <ProjectCard key={p.id} p={p} count={proposals.filter((x) => x.project.id === p.id).length} />)}
          </div>
        </div>
      </div>
    </>
  );
}
