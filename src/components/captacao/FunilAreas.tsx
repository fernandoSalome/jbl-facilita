"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ETAPAS, nomeEtapa, SITUACOES, tituloArea } from "@/lib/captacao";
import AreaCard, { COR_TOM, type CardArea } from "./AreaCard";

type A = CardArea & { etapa: string; updatedAt: string };
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Funil por etapa (ou lista), com busca por cidade, proprietário ou corretor */
export default function FunilAreas({ areas }: { areas: A[] }) {
  const [busca, setBusca] = useState("");
  const [sit, setSit] = useState("ativa");
  const [vista, setVista] = useState<"funil" | "lista">("funil");
  const lista = useMemo(() => {
    const q = norm(busca.trim());
    return areas.filter((a) => a.situacao === sit && (!q || norm(`${a.cidade} ${a.dono ?? ""} ${a.corretor ?? ""} ${a.nome}`).includes(q)));
  }, [areas, busca, sit]);

  return (
    <div className="p-8">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input className="input max-w-sm py-2" type="search" placeholder="🔎 Buscar proprietário, cidade, área ou corretor" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {SITUACOES.map(([k, n]) => (
          <button key={k} className={k === sit ? "btn-navy py-1.5 text-[13px]" : "btn-ghost py-1.5 text-[13px]"} onClick={() => setSit(k)}>
            {n} <span className="opacity-60">{areas.filter((a) => a.situacao === k).length}</span>
          </button>
        ))}
        <span className="flex-1" />
        <button className={vista === "funil" ? "btn-navy py-1.5 text-[13px]" : "btn-ghost py-1.5 text-[13px]"} onClick={() => setVista("funil")}>Funil</button>
        <button className={vista === "lista" ? "btn-navy py-1.5 text-[13px]" : "btn-ghost py-1.5 text-[13px]"} onClick={() => setVista("lista")}>Lista</button>
      </div>
      {vista === "funil" ? (
        <div className="grid gap-3 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${ETAPAS.length}, minmax(290px, 1fr))` }}>
          {ETAPAS.map(([k, n]) => {
            const col = lista.filter((a) => a.etapa === k);
            return (
              <div key={k} className="rounded-md bg-surface p-2.5">
                <div className="mb-2.5 flex items-center justify-between px-1 text-[12px] font-bold uppercase tracking-wider text-navy">
                  <span>{ETAPAS.findIndex(([e]) => e === k) + 1}. {n}</span> <span className="rounded-full bg-white px-2 text-muted">{col.length}</span>
                </div>
                <div className="grid gap-2.5">{col.map((a) => <AreaCard key={a.id} a={a} />)}{!col.length && <div className="px-1 py-2 text-[13px] text-muted">—</div>}</div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-[12px] uppercase tracking-wider text-muted">
              <tr><th className="px-4 py-2">Área</th><th className="px-4 py-2">Proprietário</th><th className="px-4 py-2">Corretor</th><th className="px-4 py-2">Etapa</th><th className="px-4 py-2">Situação</th><th className="px-4 py-2">Alerta</th></tr>
            </thead>
            <tbody>
              {lista.map((a) => (
                <tr key={a.id} className="border-t border-line hover:bg-gold-soft">
                  <td className="px-4 py-2"><Link className="font-semibold text-navy hover:underline" href={`/app/captacao/${a.id}`}>{a.cidade} · {a.nome || tituloArea(a)}</Link> <span className="text-[12px] text-muted">{a.hectares ? `${a.hectares.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ha` : ""}</span></td>
                  <td className="px-4 py-2">{a.dono ?? "—"}</td>
                  <td className="px-4 py-2">{a.corretor ?? "—"}</td>
                  <td className="px-4 py-2">{ETAPAS.findIndex(([e]) => e === a.etapa) + 1}. {nomeEtapa(a.etapa)}</td>
                  <td className="px-4 py-2">{a.card.situacao}</td>
                  <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ring-1 ${COR_TOM[a.card.tom]}`}>{a.card.passo}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!lista.length && <p className="mt-6 text-center text-sm text-muted">Nenhuma área aqui.</p>}
    </div>
  );
}
