import Link from "next/link";
import { fmtM2 } from "@/lib/format";
import { FASES } from "@/lib/fases";

export default function ProjectCard({ p, count }: { p: { id: string; name: string; municipio: string; uf: string; areaTotal: number; aerialImage: string | null; fase: string }; count: number }) {
  const fase = FASES.find(([k]) => k === p.fase)?.[1] ?? p.fase;
  return (
    <Link href={`/app/projetos/${p.id}/propostas`} className="card group overflow-hidden transition hover:border-gold hover:shadow-lg">
      <div className="relative h-36 bg-navy">
        {p.aerialImage ? <img src={p.aerialImage} alt="" className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" /> : (
          <div className="grid h-full place-items-center font-display text-4xl text-gold/60">{p.name.slice(0, 1)}</div>
        )}
        <span className="absolute left-3 top-3 rounded-sm bg-white/95 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-navy">{fase}</span>
      </div>
      <div className="p-4">
        <div className="font-display text-lg text-navy group-hover:text-gold-deep">{p.name}</div>
        <div className="text-[12.5px] text-muted">{p.municipio} · {p.uf} · {fmtM2(p.areaTotal, 0)}</div>
        <div className="mt-2 text-[12.5px] font-semibold text-navy">{count} proposta(s)</div>
      </div>
    </Link>
  );
}
