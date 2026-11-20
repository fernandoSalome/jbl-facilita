import Link from "next/link";
import { tituloArea } from "@/lib/captacao";
import type { Tom } from "@/lib/captacao-estudos";

export const COR_TOM: Record<Tom, string> = {
  ok: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warn: "bg-gold-soft text-gold-ink ring-gold-line",
  bad: "bg-rose-50 text-rose-800 ring-rose-200",
  run: "bg-navy-50 text-navy ring-line",
};

export type CardArea = { id: string; nome: string; cidade: string; uf: string; dono: string | null; corretor: string | null; hectares: number | null; situacao: string; card: { situacao: string; tom: Tom; passo: string } };

/** Card do funil, igual à maquete: "Cidade · dono", tamanho, 🤝 corretor, situação e o próximo passo */
export default function AreaCard({ a }: { a: CardArea }) {
  return (
    <Link href={`/app/captacao/${a.id}`} className="card block min-h-[132px] p-4 transition hover:-translate-y-0.5 hover:border-gold hover:shadow-md">
      <span className="block text-[15px] font-semibold leading-snug text-navy">{tituloArea(a)}</span>
      <span className="mt-0.5 block text-[12.5px] text-muted">{a.hectares ? `${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha` : "tamanho a definir"}</span>
      {a.corretor && <span className="mt-1.5 block text-[13px] text-ink">🤝 {a.corretor}</span>}
      <span className="mt-1 block text-[13px] text-ink">{a.card.situacao}</span>
      <span className={`mt-2.5 inline-block rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ${COR_TOM[a.card.tom]}`}>{a.card.passo}</span>
    </Link>
  );
}
