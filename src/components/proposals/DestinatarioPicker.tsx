"use client";

import type { Destinatario } from "@/lib/proposals";
import { tratamento } from "@/lib/destinatario";

/** "Proposta para": família, proprietário(a) ou uma pessoa (com nome e gênero). Muda a saudação e os textos. */
export default function DestinatarioPicker({ value, onChange, compact }: { value?: Destinatario; onChange: (d: Destinatario) => void; compact?: boolean }) {
  const d: Destinatario = value ?? { tipo: "familia" };
  const set = (p: Partial<Destinatario>) => onChange({ ...d, ...p });
  const tipos: [Destinatario["tipo"], string][] = [["familia", "Família"], ["proprietario", "Proprietário"], ["pessoa", "Pessoa específica"]];
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "py-1"}`}>
      <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-gold-deep">Proposta para</span>
      <div className="inline-flex rounded border border-line bg-white p-0.5 text-[13px] font-semibold">
        {tipos.map(([t, l]) => (
          <button key={t} type="button" onClick={() => set({ tipo: t })} className={`rounded-sm px-2.5 py-1 ${d.tipo === t ? "bg-navy text-white" : "text-muted hover:text-navy"}`}>{l}</button>
        ))}
      </div>
      {d.tipo === "pessoa" && (
        <input className="input w-44 py-1 text-[13px]" placeholder="Nome (ex.: Daniel)" value={d.nome ?? ""} onChange={(e) => set({ nome: e.target.value })} />
      )}
      {d.tipo !== "familia" && (
        <div className="inline-flex rounded border border-line bg-white p-0.5 text-[12.5px] font-semibold">
          <button type="button" onClick={() => set({ genero: "m" })} className={`rounded-sm px-2 py-1 ${d.genero !== "f" ? "bg-navy text-white" : "text-muted"}`}>Masc.</button>
          <button type="button" onClick={() => set({ genero: "f" })} className={`rounded-sm px-2 py-1 ${d.genero === "f" ? "bg-navy text-white" : "text-muted"}`}>Fem.</button>
        </div>
      )}
      <span className="text-[12px] italic text-muted">“{tratamento(d).saudacao}”</span>
    </div>
  );
}
