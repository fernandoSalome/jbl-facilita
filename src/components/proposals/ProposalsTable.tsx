"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProposalRow } from "@/lib/queries";
import { fmtDate, fmtMi, fmtNum, fmtPct, relTime } from "@/lib/format";
import Modal from "@/components/ui/Modal";
import StatusBadge from "./StatusBadge";
import EditNumbersModal from "./EditNumbersModal";
import LetterModal from "./LetterModal";
import { linkProposta } from "@/lib/site";
import { FORMATOS_INICIAIS, parseFormato } from "@/lib/formatos";

function readTime(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)} min`;
}

function RowMenu({ p, isAdmin, fixada, onFixar, onEdit, onDelete }: { p: ProposalRow; isAdmin: boolean; fixada: boolean; onFixar: () => void; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    const c = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", c);
    return () => document.removeEventListener("mousedown", c);
  }, []);

  async function duplicate() {
    const r = await fetch(`/api/proposals/${p.id}/duplicate`, { method: "POST" }).then((r) => r.json());
    router.push(`/app/proposta/${r.id}`);
  }
  async function desfecho(status: string) {
    setOpen(false);
    await fetch(`/api/proposals/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    router.refresh();
  }
  async function expirar() {
    setOpen(false);
    if (!confirm(`Expirar a proposta "${p.name}" agora? O link deixa de mostrar a proposta até você reabrir.`)) return;
    await fetch(`/api/proposals/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expire: true }) });
    router.refresh();
  }
  async function reabrir() {
    setOpen(false);
    await fetch(`/api/proposals/${p.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extendDays: 7 }) });
    router.refresh();
  }
  async function restore() {
    await fetch(`/api/proposals/${p.id}/restore`, { method: "POST" });
    router.refresh();
  }

  const item = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-alt";
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen((v) => !v)} className="rounded p-1.5 text-muted hover:bg-alt hover:text-navy" aria-label="Ações">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-md border border-line bg-white py-1 shadow-xl">
          {p.deletedAt ? (
            isAdmin && <button className={item} onClick={restore}>↺ Reativar proposta</button>
          ) : (
            <>
              <Link className={item} href={`/app/proposta/${p.id}`}>Abrir proposta</Link>
              <button className={item} onClick={() => { setOpen(false); onFixar(); }}>{fixada ? "Desafixar do topo" : "Fixar no topo"}</button>
              <button className={item} onClick={() => { setOpen(false); onEdit(); }}>Editar dados da planilha</button>
              <button className={item} onClick={duplicate}>Duplicar</button>
              {p.status !== "rascunho" && (
                <button className={item} onClick={() => { navigator.clipboard.writeText(linkProposta(p.publicToken)); setOpen(false); }}>Copiar link</button>
              )}
              {p.status !== "rascunho" && (
                <>
                  <div className="my-1 border-t border-line" />
                  <div className="px-3 pb-0.5 pt-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted">Marcar desfecho</div>
                  <button className={item} onClick={() => desfecho("negociacao")}>Em negociação</button>
                  <button className={item} onClick={() => desfecho("aceita")}>✓ Aceita</button>
                  <button className={item} onClick={() => desfecho("recusada")}>✕ Recusada</button>
                  <div className="my-1 border-t border-line" />
                  {p.status === "expirada" ? (
                    <button className={item} onClick={reabrir}>↻ Reabrir (+7 dias)</button>
                  ) : (p.status === "enviada" || p.status === "aberta") && (
                    <button className={`${item} text-amber-800`} onClick={expirar}>⏱ Expirar proposta</button>
                  )}
                </>
              )}
              <div className="my-1 border-t border-line" />
              <button className={`${item} text-rose-700`} onClick={() => { setOpen(false); onDelete(); }}>Excluir</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProposalsTable({ rows, isAdmin, showProject }: { rows: ProposalRow[]; isAdmin: boolean; showProject?: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const showDeleted = sp.get("excluidas") === "1";
  const [editing, setEditing] = useState<ProposalRow | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProposalRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  // fixadas ficam no topo, na ordem em que foram fixadas; a troca aparece na hora (sem esperar o servidor)
  const [fixadas, setFixadas] = useState<Record<string, string | null>>({});
  const fixadaEm = (p: ProposalRow) => (p.id in fixadas ? fixadas[p.id] : p.pinnedAt);
  const list = rows
    .filter((p) => `${p.name} ${p.ownerName} ${p.project.name}`.toLowerCase().includes(q.toLowerCase()))
    .map((p, i) => ({ p, i, f: !p.deletedAt ? fixadaEm(p) : null }))
    .sort((a, b) => (a.f && b.f ? a.f.localeCompare(b.f) : a.f ? -1 : b.f ? 1 : a.i - b.i))
    .map((x) => x.p);

  async function fixar(p: ProposalRow, fixada: boolean) {
    setFixadas((o) => ({ ...o, [p.id]: fixada ? new Date().toISOString() : null }));
    await fetch(`/api/proposals/${p.id}/fixar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fixada }) });
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    await fetch(`/api/proposals/${deleting.id}`, { method: "DELETE" });
    setBusy(false);
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="card overflow-visible">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar proposta ou proprietário…" className="input w-72 py-1.5 pl-8 text-sm" />
        </div>
        <span className="text-sm text-muted">{list.filter((p) => !p.deletedAt).length} proposta(s)</span>
        {isAdmin && (
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => router.replace(e.target.checked ? `${path}?excluidas=1` : path)}
              className="h-4 w-4 accent-[#A2782F]"
            />
            Mostrar excluídas
          </label>
        )}
      </div>

      {list.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gold-soft text-gold-deep">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6" /></svg>
          </div>
          <p className="font-display text-lg text-navy">Nenhuma proposta ainda</p>
          <p className="mt-1 text-sm text-muted">Crie a primeira proposta para este loteamento.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-alt text-left text-[10.5px] uppercase tracking-[0.1em] text-muted">
              <th className="px-4 py-2.5 font-bold">Proposta</th>
              {showProject && <th className="px-3 py-2.5 font-bold">Loteamento</th>}
              <th className="px-3 py-2.5 font-bold">Status</th>
              <th className="px-3 py-2.5 text-right font-bold">Lotes</th>
              <th className="px-3 py-2.5 text-right font-bold">VGV à vista</th>
              <th className="px-3 py-2.5 text-right font-bold">Proprietário</th>
              <th className="px-3 py-2.5 font-bold">Acompanhamento</th>
              <th className="px-3 py-2.5 font-bold">Carta de intenção</th>
              <th className="px-3 py-2.5 font-bold">Atualizada</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr
                key={p.id}
                onClick={() => !p.deletedAt && router.push(`/app/proposta/${p.id}`)}
                className={`group border-b border-line last:border-0 ${p.deletedAt ? "bg-rose-50/40 opacity-60" : "cursor-pointer hover:bg-gold-soft/50"} ${fixadaEm(p) && !p.deletedAt ? "bg-gold-soft/40 shadow-[inset_3px_0_0_#C1943D]" : ""}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-start gap-1.5">
                    <span className="font-semibold text-navy group-hover:text-gold-deep">{p.name}</span>
                    {!p.deletedAt && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fixar(p, !fixadaEm(p)); }}
                        title={fixadaEm(p) ? "Desafixar (volta para a ordem normal)" : "Fixar no topo da lista"}
                        aria-label={fixadaEm(p) ? "Desafixar proposta" : "Fixar proposta no topo"}
                        className={`-mt-0.5 rounded px-1 text-[14px] leading-6 transition ${fixadaEm(p) ? "text-gold-deep" : "text-muted opacity-0 hover:text-navy group-hover:opacity-60 focus:opacity-100"}`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill={fixadaEm(p) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M9 3h6l-1 6 4 3v2h-5v7l-1 1-1-1v-7H6v-2l4-3z" /></svg>
                      </button>
                    )}
                  </div>
                  <div className="text-[12.5px] text-muted">
                    {p.ownerName} · {FORMATOS_INICIAIS[parseFormato(p.formato)].label}
                    {p.overridesCount > 0 && <span className="ml-1.5 rounded-sm bg-[#fff6d6] px-1 text-[11px] text-amber-800 ring-1 ring-[#e0a800]">✎ {p.overridesCount}</span>}
                  </div>
                </td>
                {showProject && <td className="px-3 py-3 text-ink">{p.project.name}<div className="text-[12px] text-muted">{p.project.municipio} · {p.project.uf}</div></td>}
                <td className="px-3 py-3">
                  {p.deletedAt ? <span className="text-[12px] font-semibold text-rose-700">Excluída</span> : <StatusBadge status={p.status} />}
                </td>
                <td className="tabular px-3 py-3 text-right">{fmtNum(p.lotes, 0)}</td>
                <td className="tabular px-3 py-3 text-right">{fmtMi(p.vgvAvista)}</td>
                <td className="tabular px-3 py-3 text-right font-semibold text-navy">{fmtPct(p.terPct, 0)}</td>
                <td className="px-3 py-3 text-[12.5px]">
                  {p.status === "rascunho" ? (
                    <span className="text-muted">não enviada</span>
                  ) : (
                    <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5">
                      <span className="text-muted">Aberturas</span><b className="text-navy">{p.viewCount}</b>
                      <span className="text-muted">Leitura</span><b className="text-navy">{p.readSeconds ? readTime(p.readSeconds) : "—"}</b>
                      <span className="text-muted">Leu até</span><b className="text-navy">{p.maxScroll ? `${p.maxScroll}%` : "—"}</b>
                      <span className="text-muted">Última</span><b className="text-navy">{p.lastViewedAt ? relTime(p.lastViewedAt) : "ainda não"}</b>
                    </div>
                  )}
                </td>
                <td className="px-3 py-3 text-[12.5px]" onClick={(e) => p.carta && e.stopPropagation()}>
                  {!p.options.cartaIntencao ? (
                    <span className="text-muted">Sem carta</span>
                  ) : p.carta ? (
                    <button
                      onClick={() => setLetter(p.carta!.id)}
                      className="rounded-sm bg-emerald-50 px-2 py-1 text-left font-semibold text-emerald-800 ring-1 ring-emerald-200 hover:bg-emerald-100"
                      title="Ver os dados da carta e abrir a minuta"
                    >
                      {p.carta.minuta === "assinada" ? "✓ Assinada" : p.carta.minuta === "enviada" ? "Minuta enviada" : "Dados recebidos"}
                      <span className="block text-[11px] font-normal text-emerald-700">{fmtDate(p.carta.createdAt)} · ver dados e minuta</span>
                    </button>
                  ) : p.status === "rascunho" ? (
                    <span className="text-muted">—</span>
                  ) : (
                    <span className="rounded-sm bg-alt px-2 py-1 text-muted ring-1 ring-line">Aguardando</span>
                  )}
                </td>
                <td className="px-3 py-3 text-[12.5px] text-muted">{fmtDate(p.updatedAt)}</td>
                <td className="pr-3">
                  <RowMenu p={p} isAdmin={isAdmin} fixada={!!fixadaEm(p)} onFixar={() => fixar(p, !fixadaEm(p))} onEdit={() => setEditing(p)} onDelete={() => setDeleting(p)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && <EditNumbersModal proposal={editing} onClose={() => setEditing(null)} />}
      <LetterModal id={letter} onClose={() => setLetter(null)} />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        eyebrow="Excluir proposta"
        title="Tem certeza?"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setDeleting(null)}>Cancelar</button>
            <button className="btn-danger" onClick={confirmDelete} disabled={busy}>{busy ? "Excluindo…" : "Sim, excluir"}</button>
          </>
        }
      >
        <p className="text-[15px]">
          A proposta <b className="text-navy">{deleting?.name}</b> vai sair da lista e o link enviado para <b className="text-navy">{deleting?.ownerName}</b> vai parar de funcionar.
        </p>
        <p className="mt-3 rounded bg-alt px-3 py-2 text-[13px] text-muted">Nada é apagado de verdade: um administrador pode reativá-la em “Mostrar excluídas”.</p>
      </Modal>
    </div>
  );
}
