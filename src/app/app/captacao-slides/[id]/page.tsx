import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { buscarArea } from "@/lib/captacao-db";
import { lerEstudo1, lerEstudo2, slides } from "@/lib/captacao-estudos";
import { lerPoligono } from "@/lib/kml";
import MapaArea from "@/components/captacao/MapaArea";
import BotaoImprimir from "@/components/captacao/BotaoImprimir";

export const dynamic = "force-dynamic";

/** Apresentação da reunião (9 slides, modelo JBL): tela cheia, e "Imprimir" gera o PDF, um slide por página */
export default async function SlidesArea({ params }: { params: { id: string } }) {
  await requireSession();
  const a = await buscarArea(params.id);
  if (!a) notFound();
  const ss = slides(a, lerEstudo1(a.estudo1), lerEstudo2(a.estudo2));
  const poligono = lerPoligono(a.poligono);
  return (
    <main className="min-h-screen bg-navy py-8 print:bg-white print:py-0">
      <style>{`@page { size: 1280px 720px; margin: 0 } @media print { .slide { break-after: page; border-radius: 0 !important; margin: 0 !important } }`}</style>
      <div className="mx-auto mb-6 flex max-w-[1100px] justify-end gap-2 print:hidden"><BotaoImprimir /></div>
      {ss.map((s, i) => (
        <section key={i} className="slide relative mx-auto mb-8 flex aspect-video max-w-[1100px] flex-col justify-center overflow-hidden rounded-md bg-white px-20">
          <span className="absolute left-0 top-0 h-full w-3 bg-gold" />
          <div className="eyebrow mb-4">{i + 1} · {s.titulo}</div>
          <h2 className="h-display text-[54px] leading-tight">{s.destaque}</h2>
          {s.titulo === "A sua área" && poligono ? (
            <div className="mt-6 grid grid-cols-[1.3fr_1fr] items-center gap-8">
              <MapaArea poligono={poligono} altura={260} />
              <ul className="grid gap-2 text-[20px] text-ink">{s.linhas.map((l) => <li key={l}>• {l}</li>)}</ul>
            </div>
          ) : (
            <ul className="mt-6 grid gap-2 text-[22px] text-ink">{s.linhas.map((l) => <li key={l}>• {l}</li>)}</ul>
          )}
          <div className="absolute bottom-6 right-10 font-display text-[15px] tracking-wide text-gold-deep">JBL Incorporadora</div>
        </section>
      ))}
    </main>
  );
}
