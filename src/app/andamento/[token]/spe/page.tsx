import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { andamentoPorToken } from "@/lib/passo-a-passo-db";
import { infoModeloSpe } from "@/lib/modelo-spe-db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Modelo da SPE · JBL Incorporadora", robots: { index: false, follow: false } };

/** Modelo da minuta da SPE para o proprietário ler e baixar (pedido 25/11/2026), aberto pelo passo a passo */
export default async function ModeloSpePublico({ params }: { params: { token: string } }) {
  const [a, modelo] = await Promise.all([andamentoPorToken(params.token), infoModeloSpe()]);
  if (!a || !modelo) notFound();
  const pdf = `/api/public/andamento/${params.token}/spe`;
  return (
    <main className="flex min-h-screen flex-col bg-surface text-ink">
      <header className="border-b-4 border-gold bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 md:px-6">
          <img src="/brand/lockup.webp" alt="Grupo JBL Incorporadora" className="h-11 w-auto md:h-14" />
        </div>
      </header>
      <div className="bg-navy text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end gap-4 px-4 py-8 md:px-6">
          <div className="flex-1">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.25em] text-gold">Carta de Intenção e análise da SPE</div>
            <h1 className="font-display text-[30px] leading-tight md:text-[40px]">Modelo da minuta da SPE</h1>
            <p className="mt-2 max-w-2xl text-[15px] text-white/80">Modelo do contrato da Sociedade de Propósito Específico, para análise e avaliação jurídica. As condições finais são definidas na formalização da parceria.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/andamento/${params.token}`} className="btn border border-white/30 text-white hover:bg-white/10">◀ Voltar</a>
            <a href={`${pdf}?baixar=1`} className="btn-gold">Baixar Modelo SPE</a>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-6">
        <iframe src={pdf} title="Modelo da minuta da SPE" className="h-[80vh] w-full rounded-md border border-line bg-white" />
        <p className="mt-3 text-[13px] text-muted">
          Não abriu aqui? <a href={pdf} target="_blank" rel="noreferrer" className="font-semibold text-navy underline">Abrir o PDF</a> ou use o botão “Baixar Modelo SPE”.
        </p>
      </div>
    </main>
  );
}
