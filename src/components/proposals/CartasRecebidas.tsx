"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import LetterModal from "./LetterModal";

type Linha = {
  id: string;
  protocolo: string;
  recebidaEm: string;
  nome: string;
  telefone: string;
  email: string;
  propostaId: string;
  proposta: string;
  loteamento: string;
  status: string;
  linkEnviadoEm: string | null;
  assinadaEm: string | null;
  temAssinada: boolean;
};

const data = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");
const ANDAMENTO: Record<string, { txt: string; cls: string }> = {
  revisao: { txt: "Dados recebidos", cls: "bg-sky-50 text-sky-800 ring-sky-200" },
  enviada: { txt: "Minuta enviada", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  assinada: { txt: "✓ Assinada", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};

/** Lista das cartas de intenção recebidas, com acesso aos dados, à minuta e à carta assinada */
export default function CartasRecebidas({ linhas }: { linhas: Linha[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"" | "revisao" | "enviada" | "assinada">("");
  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return linhas.filter((l) => (!filtro || l.status === filtro) && (!b || [l.nome, l.proposta, l.loteamento, l.protocolo, l.telefone, l.email].some((x) => x.toLowerCase().includes(b))));
  }, [linhas, busca, filtro]);

  if (!linhas.length) return <p className="rounded border border-line bg-white p-8 text-center text-muted">Nenhuma carta de intenção recebida ainda. Quando alguém enviar os dados pela proposta, aparece aqui.</p>;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Buscar por nome, proposta, protocolo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        {(["", "revisao", "enviada", "assinada"] as const).map((f) => (
          <button key={f} onClick={() => setFiltro(f)} className={`rounded px-3 py-1.5 text-[13px] font-semibold ${filtro === f ? "bg-navy text-white" : "border border-line bg-white text-navy"}`}>
            {f ? ANDAMENTO[f].txt : "Todas"} ({f ? linhas.filter((l) => l.status === f).length : linhas.length})
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[860px] text-[13.5px]">
          <thead className="bg-alt text-left text-[12px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2.5">Recebida</th>
              <th className="px-3 py-2.5">Quem enviou</th>
              <th className="px-3 py-2.5">Proposta</th>
              <th className="px-3 py-2.5">Andamento</th>
              <th className="px-3 py-2.5 text-right">Abrir</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((l) => {
              const a = ANDAMENTO[l.status] ?? ANDAMENTO.revisao;
              return (
                <tr key={l.id} className="border-t border-line align-top hover:bg-alt/60">
                  <td className="px-3 py-3 whitespace-nowrap">
                    {data(l.recebidaEm)}
                    <div className="font-mono text-[11.5px] text-muted">{l.protocolo}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-navy">{l.nome || "—"}</div>
                    <div className="text-[12px] text-muted">{[l.telefone, l.email].filter(Boolean).join(" · ") || "sem contato"}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Link className="font-semibold text-navy hover:underline" href={`/app/proposta/${l.propostaId}`}>{l.proposta}</Link>
                    <div className="text-[12px] text-muted">{l.loteamento}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-[12px] font-semibold ring-1 ${a.cls}`}>{a.txt}</span>
                    <div className="mt-0.5 text-[11.5px] text-muted">{l.status === "assinada" ? `em ${data(l.assinadaEm)}` : l.status === "enviada" && l.linkEnviadoEm ? `link enviado em ${data(l.linkEnviadoEm)}` : ""}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button className="btn-ghost px-2.5 py-1 text-[12.5px]" onClick={() => setAberta(l.id)}>Ver dados</button>
                      <Link className="btn-ghost px-2.5 py-1 text-[12.5px]" href={`/app/minuta/${l.id}`}>Minuta</Link>
                      {l.temAssinada && <a className="btn-gold px-2.5 py-1 text-[12.5px]" href={`/api/letters/${l.id}/minuta/pdf?assinada=1`} target="_blank" rel="noreferrer">Assinada (PDF)</a>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <LetterModal id={aberta} onClose={() => setAberta(null)} />
    </>
  );
}
