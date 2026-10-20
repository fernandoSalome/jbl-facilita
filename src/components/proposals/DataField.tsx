"use client";

import type { DataProposta } from "@/lib/proposals";

const OPCOES: [DataProposta["modo"], string, string][] = [
  ["criacao", "Dia da criação", "fixa no dia em que a proposta foi criada"],
  ["auto", "Automática", "o dia em que a pessoa abre a proposta"],
  ["fixa", "Escolher", "uma data definida por você"],
];

/** Data escrita na proposta (bloco dos profissionais, validade, rodapé) */
export default function DataField({ value, onChange }: { value?: DataProposta; onChange: (v: DataProposta) => void }) {
  const modo = value?.modo ?? "criacao";
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return (
    <div>
      <span className="label">Data da proposta</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {OPCOES.map(([m, label, dica]) => (
          <button
            key={m}
            type="button"
            title={dica}
            onClick={() => onChange(m === "fixa" ? { modo: m, dia: value?.dia ?? hoje } : { modo: m })}
            className={`rounded border-[1.5px] px-2.5 py-1.5 text-[13px] font-semibold transition ${modo === m ? "border-gold bg-gold-soft text-navy" : "border-line text-muted hover:border-gold-line"}`}
          >
            {label}
          </button>
        ))}
        {modo === "fixa" && (
          <input type="date" className="input w-auto py-1.5" value={value?.dia ?? hoje} onChange={(e) => e.target.value && onChange({ modo: "fixa", dia: e.target.value })} />
        )}
      </div>
    </div>
  );
}
