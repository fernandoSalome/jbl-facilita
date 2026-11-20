"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chamar } from "./chamar";

type C = { id: string; nome: string; uf: string; leis: string; mapa: string | null; conferidoEm: string; alerta: string | null; notas: string | null };
const VAZIA = { nome: "", uf: "SP", leis: "", mapa: "", conferidoEm: "", alerta: "", notas: "" };

/** Tabela da biblioteca de cidades, com edição e inclusão */
export default function CidadesEditor({ cidades }: { cidades: C[] }) {
  const router = useRouter();
  const [f, setF] = useState<typeof VAZIA>(VAZIA);
  const [msg, setMsg] = useState("");
  const salvar = async () => {
    try {
      await chamar("/api/cidades", "POST", f);
      setF(VAZIA);
      setMsg("✅ Salvo.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  return (
    <div className="grid gap-5">
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-[12px] uppercase tracking-wider text-muted"><tr><th className="px-4 py-2">Cidade</th><th className="px-4 py-2">Leis vigentes</th><th className="px-4 py-2">Mapa</th><th className="px-4 py-2">Conferido</th><th className="px-4 py-2">Alerta</th><th /></tr></thead>
          <tbody>
            {cidades.map((c) => (
              <tr key={c.id} className="border-t border-line align-top">
                <td className="px-4 py-2 font-semibold text-navy">{c.nome} · {c.uf}</td>
                <td className="px-4 py-2">{c.leis}{c.notas && <div className="mt-1 text-[12px] text-muted">{c.notas}</div>}</td>
                <td className="px-4 py-2">{c.mapa ?? "—"}</td>
                <td className="px-4 py-2">{c.conferidoEm ? new Date(`${c.conferidoEm}T12:00`).toLocaleDateString("pt-BR") : "—"}</td>
                <td className="px-4 py-2">{c.alerta ? <span className="rounded-sm bg-gold-soft px-1.5 py-0.5 text-[12px] font-semibold text-gold-ink">{c.alerta}</span> : "—"}</td>
                <td className="whitespace-nowrap px-4 py-2">
                  <button className="mr-2 text-[12px] font-semibold text-navy hover:underline" onClick={() => setF({ nome: c.nome, uf: c.uf, leis: c.leis, mapa: c.mapa ?? "", conferidoEm: c.conferidoEm, alerta: c.alerta ?? "", notas: c.notas ?? "" })}>Editar</button>
                  <button className="text-[12px] font-semibold text-rose-700 hover:underline" onClick={async () => { if (confirm(`Tirar ${c.nome}?`)) { await chamar(`/api/cidades?id=${c.id}`, "DELETE"); router.refresh(); } }}>Tirar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="card grid gap-3 p-5 md:grid-cols-3">
        <h3 className="eyebrow md:col-span-3">Incluir ou atualizar cidade</h3>
        <label><span className="label">Cidade</span><input className="input" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
        <label><span className="label">UF</span><input className="input" maxLength={2} value={f.uf} onChange={(e) => setF({ ...f, uf: e.target.value })} /></label>
        <label><span className="label">Conferido em</span><input type="date" className="input" value={f.conferidoEm} onChange={(e) => setF({ ...f, conferidoEm: e.target.value })} /></label>
        <label className="md:col-span-2"><span className="label">Leis vigentes</span><input className="input" value={f.leis} onChange={(e) => setF({ ...f, leis: e.target.value })} /></label>
        <label><span className="label">Mapa</span><input className="input" value={f.mapa} onChange={(e) => setF({ ...f, mapa: e.target.value })} /></label>
        <label><span className="label">Alerta</span><input className="input" placeholder="Ex.: PLC 4/2026 em votação" value={f.alerta} onChange={(e) => setF({ ...f, alerta: e.target.value })} /></label>
        <label className="md:col-span-2"><span className="label">Notas</span><input className="input" value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} /></label>
        <div className="flex items-center gap-3 md:col-span-3"><button className="btn-gold" onClick={salvar}>Salvar cidade</button>{msg && <span className="text-sm font-semibold text-navy">{msg}</span>}</div>
      </section>
    </div>
  );
}
