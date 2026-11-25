import BotaoImprimir from "@/components/captacao/BotaoImprimir";
import LinhaDoTempo from "@/components/andamento/LinhaDoTempo";
import { lerAndamento, montarPassos, progressoPassos, tratamentoPadrao } from "@/lib/passo-a-passo";

type AreaDoLink = { nome: string; cidade: string; uf: string; hectares: number | null; dono: string | null; andamento: unknown; updatedAt: Date };

/** A página que o proprietário vê pelo link (/andamento/<token>), no visual da proposta */
export default function PaginaAndamento({ a }: { a: AreaDoLink }) {
  const andamento = lerAndamento(a.andamento);
  const passos = montarPassos(andamento, a.dono);
  const prog = progressoPassos(passos);
  const proximo = passos.find((p) => p.situacao === "proximo");
  const tratamento = andamento.tratamento || tratamentoPadrao(a.dono);
  const ha = a.hectares ? ` · ${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha` : "";
  const atualizado = new Date(andamento.atualizadoEm ?? a.updatedAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-white text-ink">
      <header className="border-b-4 border-gold bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-6">
          <img src="/brand/lockup.webp" alt="Grupo JBL Incorporadora" className="h-11 w-auto md:h-14" />
          <div className="print:hidden"><BotaoImprimir /></div>
        </div>
      </header>

      <div className="bg-navy text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 md:px-6 md:py-16">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.25em] text-gold">Acompanhamento da parceria</div>
          <h1 className="font-display text-[34px] leading-tight md:text-[50px]">{a.nome || `Área em ${a.cidade}`}</h1>
          <p className="mt-2 text-lg text-white/80">{a.cidade} · {a.uf}{ha}</p>
          <p className="mt-6 max-w-2xl text-[16px] leading-relaxed text-white/85">
            {tratamento.charAt(0).toUpperCase() + tratamento.slice(1)}, nesta página você acompanha cada passo da nossa parceria: o que já foi
            realizado e o que vem a seguir. Ela é atualizada pela equipe da JBL a cada avanço.
          </p>

          <div className="mt-8 rounded-lg border border-white/15 bg-white/[0.06] p-5 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Progresso</div>
                <div className="mt-1 font-display text-[28px] leading-none">
                  {prog.feitos} <span className="text-white/60">de {prog.total} passos realizados</span>
                </div>
              </div>
              <div className="font-display text-[40px] leading-none text-gold">{prog.pct}%</div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-gradient-to-r from-[#d4aa55] to-gold" style={{ width: `${Math.max(prog.pct, 2)}%` }} />
            </div>
            {proximo ? (
              <p className="mt-4 text-[15px] text-white/85">
                <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Próximo passo</span>
                {proximo.numero}. {proximo.titulo}
              </p>
            ) : (
              <p className="mt-4 text-[15px] font-semibold text-gold">Todos os passos foram realizados.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <div className="eyebrow mb-8">Passo a passo</div>
        <LinhaDoTempo passos={passos} />
        <p className="mt-6 border-t border-line pt-6 text-[13px] leading-relaxed text-muted">
          Atualizado em {atualizado}. As datas e prazos são estimados e podem mudar conforme os órgãos competentes e as condições
          previstas na parceria. Página de uso exclusivo do destinatário.
        </p>
      </div>
    </main>
  );
}
