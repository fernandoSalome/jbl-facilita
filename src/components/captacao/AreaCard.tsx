import Link from "next/link";
import { tituloArea } from "@/lib/captacao";

type A = { id: string; nome: string; cidade: string; uf: string; dono: string | null; corretor: string | null; hectares: number | null; situacao: string; _count: { conversas: number } };

/** Card do funil: título "Cidade · dono (ou corretor)", embaixo só o tamanho (pedido 19/11/2026) */
export default function AreaCard({ a }: { a: A }) {
  return (
    <Link href={`/app/captacao/${a.id}`} className="card block p-3 transition hover:border-gold hover:shadow-md">
      <div className="font-semibold leading-snug text-navy">{tituloArea(a)}</div>
      <div className="mt-1 flex items-center justify-between text-[12px] text-muted">
        <span>{a.hectares ? `${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha` : "tamanho a medir"}</span>
        {a._count.conversas > 0 && <span title="conversas ligadas">💬 {a._count.conversas}</span>}
      </div>
      {a.situacao !== "ativa" && <span className="mt-1.5 inline-block rounded-sm bg-navy-50 px-1.5 py-px text-[10px] font-bold uppercase tracking-wider text-navy">{a.situacao}</span>}
    </Link>
  );
}
