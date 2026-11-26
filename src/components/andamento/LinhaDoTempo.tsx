import { dataPorExtenso, type PassoMostrado } from "@/lib/passo-a-passo";

/**
 * Linha do tempo do passo a passo (pedido 25/11/2026), igual na página do proprietário e na pré-visualização:
 * realizados em dourado com a data, o próximo em destaque e os que vêm depois mais claros.
 */
export default function LinhaDoTempo({ passos, extras }: { passos: PassoMostrado[]; extras?: Partial<Record<string, React.ReactNode>> }) {
  return (
    <ol className="relative">
      {passos.map((p, i) => {
        const ultimo = i === passos.length - 1;
        const feito = p.situacao === "feito";
        const proximo = p.situacao === "proximo";
        // a linha que liga ao passo de baixo fica dourada quando os dois já foram realizados
        const linhaFeita = feito && passos[i + 1]?.situacao === "feito";
        return (
          <li key={p.id} className="relative flex gap-3 break-inside-avoid md:gap-5">
            <div className="relative flex w-12 shrink-0 justify-center">
              {!ultimo && <span className={`absolute left-1/2 top-12 -ml-px h-[calc(100%-3rem)] w-[2px] ${linhaFeita ? "bg-gold" : "bg-line"}`} />}
              {feito ? (
                <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full bg-gold text-white shadow-[0_6px_16px_-8px_rgba(162,120,47,0.9)]">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
              ) : proximo ? (
                <span className="relative z-10 grid h-12 w-12 place-items-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-gold/30 print:hidden" />
                  <span className="relative grid h-12 w-12 place-items-center rounded-full border-[3px] border-gold bg-navy font-display text-[15px] text-white">{p.numero}</span>
                </span>
              ) : (
                <span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border-2 border-line bg-white font-display text-[15px] text-muted">{p.numero}</span>
              )}
            </div>

            <div className={`mb-6 min-w-0 flex-1 rounded-lg border p-4 md:p-6 ${proximo ? "border-gold bg-gold-soft shadow-[0_12px_30px_-18px_rgba(18,42,69,0.45)]" : feito ? "border-gold-line bg-white" : "border-line bg-alt"}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-display text-[13px] ${feito || proximo ? "text-gold-deep" : "text-muted"}`}>{p.numero}.</span>
                {feito && <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold-ink">Realizado{p.feitoEm ? ` · ${dataPorExtenso(p.feitoEm)}` : ""}</span>}
                {proximo && <span className="rounded-full bg-navy px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-gold">Próximo passo</span>}
                {p.situacao === "depois" && <span className="rounded-full border border-line bg-white px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-muted">A seguir</span>}
              </div>
              <h3 className={`mt-2 font-display text-[21px] leading-snug md:text-[23px] ${p.situacao === "depois" ? "text-navy/70" : "text-navy"}`}>{p.titulo}</h3>
              <div className={`mt-2 grid gap-2.5 text-[15px] leading-relaxed ${p.situacao === "depois" ? "text-ink/70" : "text-ink"}`}>
                {p.texto.split(/\n{2,}/).map((par, j) => <p key={j}>{par}</p>)}
              </div>
              {extras?.[p.id]}
              {p.nota && (
                <p className="mt-4 rounded-md border-l-[3px] border-gold bg-white px-4 py-2.5 text-[14px] text-navy">
                  <b className="mr-1 text-gold-deep">Atualização:</b>{p.nota}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
