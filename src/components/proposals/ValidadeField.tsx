"use client";

/** Validade em dias, com o botão "Não expira" ao lado (a proposta fica no ar sem prazo) */
export default function ValidadeField({ dias, semValidade, onDias, onSemValidade }: { dias: string | number; semValidade?: boolean; onDias: (v: string) => void; onSemValidade: (v: boolean) => void }) {
  return (
    <div>
      <span className="label">Validade (dias)</span>
      <div className="flex items-stretch gap-2">
        <input
          className={`input w-20 text-right ${semValidade ? "bg-alt text-muted line-through" : ""}`}
          value={dias}
          disabled={semValidade}
          inputMode="numeric"
          onChange={(e) => onDias(e.target.value.replace(/\D/g, ""))}
        />
        <button
          type="button"
          onClick={() => onSemValidade(!semValidade)}
          title={semValidade ? "A proposta não expira. Clique para voltar a ter prazo." : "Clique para a proposta não expirar"}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded border px-3 text-[13px] font-semibold transition ${semValidade ? "border-gold bg-gold-soft text-gold-ink" : "border-line bg-white text-muted hover:border-gold-line hover:text-navy"}`}
        >
          <span aria-hidden="true">∞</span> Não expira
        </button>
      </div>
    </div>
  );
}
