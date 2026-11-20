import Link from "next/link";

/** Faixa do próximo passo no topo da área (modo simples): uma frase, uma explicação e um botão */
export default function ProximoPasso({ titulo, explica, botao, href }: { titulo: string; explica: string; botao: string; href: string }) {
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-md border-2 border-gold bg-gold-soft px-5 py-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-navy text-xl text-gold">➜</span>
      <span className="min-w-[220px] flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-gold-ink">Próximo passo</span>
        <b className="block font-display text-[22px] leading-tight text-navy">{titulo}</b>
        <span className="block text-[14px] text-ink">{explica}</span>
      </span>
      <Link href={href} className="btn-gold px-6 py-3 text-[15px]">{botao}</Link>
    </section>
  );
}
