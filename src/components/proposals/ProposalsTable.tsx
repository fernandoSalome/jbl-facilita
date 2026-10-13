"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { ProposalRow } from "@/lib/queries";
import { fmtDate, fmtMi, fmtNum, fmtPct, relTime } from "@/lib/format";
import Modal from "@/components/ui/Modal";
import StatusBadge from "./StatusBadge";
import EditNumbersModal from "./EditNumbersModal";

function readTime(s: number) {
  if (s < 60) return `${s}s`;
  return `${Math.round(s / 60)} min`;
}

function RowMenu({ p, isAdmin, onEdit, onDelete }: { p: ProposalRow; isAdmin: boolean; onEdit: () => void; onDelete: () => void }) {
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
    router.push(`/app/projetos/${p.project.id}/propostas/${r.id}`);
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
              <Link className={item} href={`/app/projetos/${p.project.id}/propostas/${p.id}`}>Abrir proposta</Link>
              <button className={item} onClick={() => { setOpen(false); onEdit(); }}>Editar números</button>
              <button className={item} onClick={duplicate}>Duplicar</button>
              {p.status !== "rascunho" && (
                <button className={item} onClick={() => { navigator.clipboard.writeText(`${location.origin}/p/${p.publicToken}`); setOpen(false); }}>Copiar link</button>
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
  const [deleting, setDeleting] = useState<ProposalRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const list = rows.filter((p) => `${p.name} ${p.ownerName} ${p.project.name}`.toLowerCase().includes(q.toLowerCase()));

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
              <th className="px-3 py-2.5 font-bold">Leitura</th>
              <th className="px-3 py-2.5 font-bold">Atualizada</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr
                key={p.id}
                onClick={() => !p.deletedAt && router.push(`/app/projetos/${p.project.id}/propostas/${p.id}`)}
                className={`group border-b border-line last:border-0 ${p.deletedAt ? "bg-rose-50/40 opacity-60" : "cursor-pointer hover:bg-gold-soft/50"}`}
              >
                <td className="px-4 py-3">
                  <div className="font-semibold text-navy group-hover:text-gold-deep">{p.name}</div>
                  <div className="text-[12.5px] text-muted">
                    {p.ownerName}
                    {p.options.cartaIntencao ? " · com carta de intenção" : " · sem carta"}
                    {p.overridesCount > 0 && <span className="ml-1.5 rounded-sm bg-[#fff6d6] px-1 text-[11px] text-amber-800 ring-1 ring-[#e0a800]">✎ {p.overridesCount}</span>}
                  </div>
                </td>
                {showProject && <td className="px-3 py-3 text-ink">{p.project.name}<div className="text-[12px] text-muted">{p.project.municipio} · {p.project.uf}</div></td>}
                <td className="px-3 py-3">
                  {p.deletedAt ? <span className="text-[12px] font-semibold text-rose-700">Excluída</span> : <StatusBadge status={p.status} />}
                  {p.letters > 0 && <div className="mt-1 text-[11.5px] font-semibold text-emerald-700">✓ {p.letters} carta(s)</div>}
                </td>
                <td className="tabular px-3 py-3 text-right">{fmtNum(p.lotes, 0)}</td>
                <td className="tabular px-3 py-3 text-right">{fmtMi(p.vgvAvista)}</td>
                <td className="tabular px-3 py-3 text-right font-semibold text-navy">{fmtPct(p.terPct, 0)}</td>
                <td className="px-3 py-3 text-[12.5px]">
                  {p.viewCount > 0 ? (
                    <>
                      <div className="font-semibold text-navy">{p.viewCount}× · {readTime(p.readSeconds)}</div>
                      <div className="text-muted">aberta {relTime(p.lastViewedAt)} · leu {p.maxScroll}%</div>
                    </>
                  ) : p.status === "rascunho" ? (
                    <span className="text-muted">não enviada</span>
                  ) : (
                    <span className="text-muted">ainda não aberta</span>
                  )}
                </td>
                <td className="px-3 py-3 text-[12.5px] text-muted">{fmtDate(p.updatedAt)}</td>
                <td className="pr-3">
                  <RowMenu p={p} isAdmin={isAdmin} onEdit={() => setEditing(p)} onDelete={() => setDeleting(p)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && <EditNumbersModal proposal={editing} onClose={() => setEditing(null)} />}

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
