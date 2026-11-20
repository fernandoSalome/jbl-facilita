"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Hipotese } from "@/lib/captacao";
import { chamar } from "./chamar";

/** Estudo de 30 dias: afirmações do estudo que precisam ser provadas, com a prova esperada */
export default function HipotesesArea({ id, hipoteses }: { id: string; hipoteses: Hipotese[] }) {
  const router = useRouter();
  const [hs, setHs] = useState(hipoteses);
  const [nova, setNova] = useState({ texto: "", origem: "", prova: "" });
  const salvar = async (lista: Hipotese[]) => {
    setHs(lista);
    await chamar(`/api/areas/${id}`, "PATCH", { hipoteses: lista });
    router.refresh();
  };
  return (
    <section className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-[12px] uppercase tracking-wider text-muted">
          <tr><th className="px-4 py-2">Afirmação do estudo</th><th className="px-4 py-2">De onde veio</th><th className="px-4 py-2">Prova</th><th className="px-4 py-2">Situação</th></tr>
        </thead>
        <tbody>
          {hs.map((h, i) => (
            <tr key={i} className="border-t border-line">
              <td className="px-4 py-2">{h.texto}</td>
              <td className="px-4 py-2 text-muted">{h.origem}</td>
              <td className="px-4 py-2">{h.prova}</td>
              <td className="px-4 py-2">
                <select className="input w-auto py-1 text-[13px]" value={h.status} onChange={(e) => salvar(hs.map((x, j) => (j === i ? { ...x, status: e.target.value as Hipotese["status"] } : x)))}>
                  <option value="pendente">A provar</option><option value="ok">Provada</option><option value="falsa">Falsa</option>
                </select>
              </td>
            </tr>
          ))}
          <tr className="border-t border-line bg-alt">
            <td className="px-4 py-2"><input className="input py-1 text-[13px]" placeholder="Nova afirmação" value={nova.texto} onChange={(e) => setNova({ ...nova, texto: e.target.value })} /></td>
            <td className="px-4 py-2"><input className="input py-1 text-[13px]" placeholder="Origem" value={nova.origem} onChange={(e) => setNova({ ...nova, origem: e.target.value })} /></td>
            <td className="px-4 py-2"><input className="input py-1 text-[13px]" placeholder="Prova esperada" value={nova.prova} onChange={(e) => setNova({ ...nova, prova: e.target.value })} /></td>
            <td className="px-4 py-2"><button className="btn-gold py-1 text-[13px]" disabled={!nova.texto.trim()} onClick={() => { salvar([...hs, { ...nova, status: "pendente" }]); setNova({ texto: "", origem: "", prova: "" }); }}>+ prova</button></td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}
