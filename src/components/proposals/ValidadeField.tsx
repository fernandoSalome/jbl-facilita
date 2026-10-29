"use client";

import { fmtDate } from "@/lib/format";

/**
 * Prazo do link da proposta: "Sem prazo" (o link fica aberto) ou "Com prazo" de N dias, contados
 * do envio. Embaixo, em palavras, quando o link vence. Usado na criação, na edição e na barra do topo
 * (compact: tudo numa linha, menor).
 *   enviadaEm: data do envio (vazio = ainda não enviada: os dias contam a partir do envio)
 *   venceEm:   data de vencimento gravada, quando é a que vale (ex.: depois de "Reabrir +7 dias")
 */
export default function ValidadeField({
  dias,
  semValidade,
  onDias,
  onSemValidade,
  compact,
  enviadaEm,
  venceEm,
}: {
  dias: string | number;
  semValidade?: boolean;
  onDias: (v: string) => void;
  onSemValidade: (v: boolean) => void;
  compact?: boolean;
  enviadaEm?: string | null;
  venceEm?: string | null;
}) {
  const n = Number(dias) || 0;
  const vence = venceEm ? new Date(venceEm) : enviadaEm && n > 0 ? new Date(new Date(enviadaEm).getTime() + n * 864e5) : null;
  const vencido = !!vence && vence.getTime() < Date.now();
  const resumo = semValidade
    ? "O link fica aberto, sem data para acabar."
    : n <= 0
      ? "Coloque por quantos dias o link vale."
      : vence
        ? vencido
          ? `O link venceu em ${fmtDate(vence.toISOString())}: o cliente vê “proposta expirada”.`
          : `O link vale até ${fmtDate(vence.toISOString())}.`
        : `O link vale ${n} ${n === 1 ? "dia" : "dias"}, contados a partir do envio.`;

  const opcao = (ativo: boolean) =>
    `whitespace-nowrap px-3 ${compact ? "py-1.5" : "py-2"} text-[13px] font-semibold transition ${ativo ? "bg-navy text-white" : "bg-white text-muted hover:text-navy"}`;

  return (
    <div className={compact ? "flex flex-wrap items-center gap-x-2 gap-y-0.5" : ""}>
      <span className={compact ? "whitespace-nowrap text-[12.5px] font-semibold text-navy" : "label"}>Prazo do link</span>
      <div className="flex flex-wrap items-stretch gap-2">
        <div className="flex overflow-hidden rounded border border-line" role="radiogroup" aria-label="Prazo do link">
          <button type="button" role="radio" aria-checked={!!semValidade} className={opcao(!!semValidade)} onClick={() => onSemValidade(true)}>
            Sem prazo
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!semValidade}
            className={`${opcao(!semValidade)} border-l border-line`}
            onClick={() => {
              onSemValidade(false);
              if (n <= 0) onDias("15");
            }}
          >
            Com prazo
          </button>
        </div>
        {!semValidade && (
          <label className="flex items-stretch">
            <input
              className={`input rounded-r-none text-right ${compact ? "w-14 py-1.5 text-[13px]" : "w-20"}`}
              value={dias}
              inputMode="numeric"
              aria-label="Quantos dias o link vale"
              onChange={(e) => onDias(e.target.value.replace(/\D/g, ""))}
            />
            <span className="grid place-items-center rounded-r border border-l-0 border-line bg-alt px-2.5 text-[13px] text-muted">dias</span>
          </label>
        )}
      </div>
      <p className={`${compact ? "basis-full text-[11.5px]" : "mt-1 text-[12px]"} ${vencido && !semValidade ? "font-semibold text-rose-700" : "text-muted"}`}>{resumo}</p>
    </div>
  );
}
