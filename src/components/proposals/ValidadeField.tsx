"use client";

/**
 * Validade em dias, com o botão "Não expira" ao lado (a proposta fica no ar sem prazo; os dias ficam apagados). O que vale fica dourado.
 * compact: na barra do topo, com o rótulo ao lado e menor.
 */
export default function ValidadeField({ dias, semValidade, onDias, onSemValidade, compact }: { dias: string | number; semValidade?: boolean; onDias: (v: string) => void; onSemValidade: (v: boolean) => void; compact?: boolean }) {
  return (
    <div className={compact ? "flex items-center gap-2" : ""}>
      <span className={compact ? "whitespace-nowrap text-[12.5px] font-semibold text-navy" : "label"}>{compact ? "Expirar proposta" : "Validade"}</span>
      <div className="flex items-stretch gap-2">
        {/* os dias ficam sempre à vista: dourados quando valem; clicar neles sai do "Não expira" */}
        <label className="flex items-stretch" onClick={() => semValidade && onSemValidade(false)}>
          <input
            className={`input rounded-r-none text-right ${compact ? "w-14 py-1.5 text-[13px]" : "w-20"} ${semValidade ? "cursor-pointer text-muted" : "border-gold bg-gold-soft text-gold-ink"}`}
            value={dias}
            inputMode="numeric"
            aria-label="Validade em dias"
            readOnly={!!semValidade}
            onChange={(e) => onDias(e.target.value.replace(/\D/g, ""))}
          />
          <span className={`grid place-items-center rounded-r border border-l-0 px-2.5 text-[13px] ${semValidade ? "border-line bg-alt text-muted" : "border-gold bg-gold-soft text-gold-ink"}`}>dias</span>
        </label>
        <button
          type="button"
          onClick={() => onSemValidade(!semValidade)}
          title={semValidade ? "A proposta não expira. Clique para voltar a ter prazo em dias." : "Clique para a proposta não expirar"}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded border px-3 ${compact ? "py-1.5" : "py-2"} text-[13px] font-semibold transition ${semValidade ? "border-gold bg-gold-soft text-gold-ink" : "border-line bg-white text-muted hover:border-gold-line hover:text-navy"}`}
        >
          <span aria-hidden="true">∞</span> {semValidade ? "Não expira ✓" : "Não expira"}
        </button>
      </div>
    </div>
  );
}
