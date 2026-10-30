"use client";

import type { DataProposta } from "@/lib/proposals";

/**
 * Data escrita na proposta (bloco dos profissionais, validade, rodapé): sempre escolhida.
 * Proposta antiga sem data escolhida mostra a data que está valendo (`atual`, AAAA-MM-DD).
 */
export default function DataField({ value, onChange, atual }: { value?: DataProposta; onChange: (v: DataProposta) => void; atual?: string }) {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const dia = value?.modo === "fixa" && value.dia ? value.dia : atual ?? hoje;
  return (
    <label>
      <span className="label">Escolher data da proposta</span>
      <input type="date" className="input w-auto py-1.5" value={dia} onChange={(e) => e.target.value && onChange({ modo: "fixa", dia: e.target.value })} />
    </label>
  );
}
