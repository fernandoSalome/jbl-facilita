"use client";

/** Validade em dias, com o botão "Não expira" ao lado (a proposta fica no ar sem prazo; os dias somem) */
export default function ValidadeField({ dias, semValidade, onDias, onSemValidade }: { dias: string | number; semValidade?: boolean; onDias: (v: string) => void; onSemValidade: (v: boolean) => void }) {
  return (
    <div>
      <span className="label">Validade</span>
      <div className="flex items-stretch gap-2">
        {!semValidade && (
          <label className="flex items-stretch">
            <input
              className="input w-20 rounded-r-none text-right"
              value={dias}
              inputMode="numeric"
              aria-label="Validade em dias"
              onChange={(e) => onDias(e.target.value.replace(/\D/g, ""))}
            />
            <span className="grid place-items-center rounded-r border border-l-0 border-line bg-alt px-2.5 text-[13px] text-muted">dias</span>
          </label>
        )}
        <button
          type="button"
          onClick={() => onSemValidade(!semValidade)}
          title={semValidade ? "A proposta não expira. Clique para voltar a ter prazo em dias." : "Clique para a proposta não expirar"}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded border px-3 py-2 text-[13px] font-semibold transition ${semValidade ? "border-gold bg-gold-soft text-gold-ink" : "border-line bg-white text-muted hover:border-gold-line hover:text-navy"}`}
        >
          <span aria-hidden="true">∞</span> {semValidade ? "Não expira ✓" : "Não expira"}
        </button>
      </div>
    </div>
  );
}
