"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type P = { id: string; name: string; municipio: string; uf: string };

export default function ProjectSwitcher({ projects, currentId }: { projects: P[]; currentId?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const current = projects.find((p) => p.id === currentId);

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const list = projects.filter((p) => `${p.name} ${p.municipio}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 rounded-md border border-white/15 bg-white/[0.06] px-3 py-2.5 text-left transition hover:border-gold/60"
      >
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded font-display text-sm ${current ? "bg-gold text-navy" : "bg-white text-navy"}`}>
          {current ? current.name.slice(0, 1) : "J"}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13.5px] font-semibold">{current ? current.name : "JBL Incorporadora"}</span>
          <span className="block truncate text-[11px] text-white/55">{current ? `${current.municipio} · ${current.uf}` : "Visão da empresa"}</span>
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/50"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 w-[320px] overflow-hidden rounded-md border border-line bg-white text-ink shadow-2xl">
          <div className="border-b border-line p-2">
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar loteamento…" className="input py-1.5 text-sm" />
          </div>
          <Link href="/app" onClick={() => setOpen(false)} className={`flex items-center gap-3 border-b border-line px-3 py-2.5 hover:bg-alt ${!current ? "bg-gold-soft" : ""}`}>
            <span className="grid h-8 w-8 place-items-center rounded bg-navy font-display text-sm text-gold">J</span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold text-navy">JBL Incorporadora</span>
              <span className="block text-[11px] text-muted">Empresa · todos os loteamentos</span>
            </span>
          </Link>
          <div className="px-3 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Loteamentos</div>
          <div className="max-h-72 overflow-auto">
            {list.map((p) => (
              <Link
                key={p.id}
                href={`/app/projetos/${p.id}/propostas`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 hover:bg-alt ${p.id === currentId ? "bg-gold-soft" : ""}`}
              >
                <span className="grid h-7 w-7 place-items-center rounded bg-gold-soft font-display text-xs text-gold-deep ring-1 ring-gold-line">{p.name.slice(0, 1)}</span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-medium text-navy">{p.name}</span>
                  <span className="block text-[11px] text-muted">{p.municipio} · {p.uf}</span>
                </span>
              </Link>
            ))}
            {list.length === 0 && <div className="px-3 py-3 text-sm text-muted">Nenhum loteamento encontrado.</div>}
          </div>
          <Link href="/app/projetos/novo" onClick={() => setOpen(false)} className="flex items-center gap-2 border-t border-line px-3 py-2.5 text-sm font-semibold text-gold-deep hover:bg-gold-soft">
            <span className="text-lg leading-none">+</span> Novo loteamento
          </Link>
        </div>
      )}
    </div>
  );
}
