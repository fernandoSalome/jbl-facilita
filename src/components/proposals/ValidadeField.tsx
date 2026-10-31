"use client";

/**
 * Validade em dias, com a caixa "Não expira" ao lado (marcada, a proposta fica no ar sem prazo; os dias ficam apagados). O que vale fica dourado.
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
        {/* mesmo visual da caixa "Carta de intenção": marcada = a proposta não expira */}
        <label
          className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-[13px] font-semibold text-navy"
          title={semValidade ? "A proposta não expira. Desmarque para voltar a ter prazo em dias." : "Marque para a proposta não expirar"}
        >
          <input type="checkbox" checked={!!semValidade} onChange={(e) => onSemValidade(e.target.checked)} className="h-4 w-4 accent-[#A2782F]" />
          Não expira
        </label>
      </div>
    </div>
  );
}
