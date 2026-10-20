"use client";

import type { Destinatario } from "@/lib/proposals";
import { tratamento } from "@/lib/destinatario";

/**
 * "Proposta para": a família (com o sobrenome) ou uma pessoa (Sr./Sra. e o nome).
 * Muda a saudação e os textos da proposta inteira.
 */
export default function DestinatarioPicker({ value, onChange, compact }: { value?: Destinatario; onChange: (d: Destinatario) => void; compact?: boolean }) {
  const d: Destinatario = value ?? { tipo: "familia" };
  const pessoa = d.tipo !== "familia";
  const set = (p: Partial<Destinatario>) => onChange({ ...d, ...p });
  const btn = (on: boolean) => `rounded-sm px-2.5 py-1 ${on ? "bg-navy text-white" : "text-muted hover:text-navy"}`;
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "py-1"}`}>
      <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-gold-deep">Proposta para</span>
      <div className="inline-flex rounded border border-line bg-white p-0.5 text-[13px] font-semibold">
        <button type="button" onClick={() => onChange({ tipo: "familia", nome: pessoa ? "" : d.nome })} className={btn(!pessoa)}>Família</button>
        <button type="button" onClick={() => onChange({ tipo: "pessoa", nome: pessoa ? d.nome : "", genero: d.genero ?? "m" })} className={btn(pessoa)}>Pessoa</button>
      </div>
      {pessoa && (
        <div className="inline-flex rounded border border-line bg-white p-0.5 text-[12.5px] font-semibold">
          <button type="button" onClick={() => set({ tipo: "pessoa", genero: "m" })} className={btn(d.genero !== "f")}>Sr.</button>
          <button type="button" onClick={() => set({ tipo: "pessoa", genero: "f" })} className={btn(d.genero === "f")}>Sra.</button>
        </div>
      )}
      <input
        className="input w-48 py-1 text-[13px]"
        placeholder={pessoa ? "Nome (ex.: João Silva)" : "Sobrenome da família (ex.: Silva)"}
        value={d.nome ?? ""}
        onChange={(e) => set({ tipo: pessoa ? "pessoa" : "familia", nome: e.target.value })}
      />
      <span className="text-[12px] italic text-muted">“{tratamento(d).saudacao}”</span>
    </div>
  );
}
