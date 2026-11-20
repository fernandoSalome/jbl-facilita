"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chamar } from "./chamar";

type Coluna = { k: string; titulo: string; tipo?: "numero" | "select"; opcoes?: [string, string][]; largura?: string };

/** Tabela simples que grava um campo JSON da área (custos, pessoas, concorrentes, revenda...) */
export default function ListaEditavel({ id, campo, colunas, linhas, base = {}, dentro }: { id: string; campo: string; colunas: Coluna[]; linhas: Record<string, unknown>[]; base?: Record<string, unknown>; dentro?: string }) {
  const router = useRouter();
  const [ls, setLs] = useState(linhas);
  const [nova, setNova] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  async function salvar(lista: Record<string, unknown>[]) {
    setLs(lista);
    try {
      await chamar(`/api/areas/${id}`, "PATCH", { [campo]: dentro ? { ...base, [dentro]: lista } : lista });
      setMsg("");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  const celula = (c: Coluna, v: unknown, mudar: (v: string) => void) =>
    c.tipo === "select" ? (
      <select className="input py-1 text-[13px]" value={String(v ?? "")} onChange={(e) => mudar(e.target.value)}>{c.opcoes!.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
    ) : (
      <input className="input py-1 text-[13px]" inputMode={c.tipo === "numero" ? "decimal" : undefined} value={String(v ?? "")} onChange={(e) => mudar(e.target.value)} />
    );
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-[12px] uppercase tracking-wider text-muted"><tr>{colunas.map((c) => <th key={c.k} className="px-3 py-2" style={{ width: c.largura }}>{c.titulo}</th>)}<th /></tr></thead>
        <tbody>
          {ls.map((l, i) => (
            <tr key={i} className="border-t border-line">
              {colunas.map((c) => <td key={c.k} className="px-3 py-1.5">{celula(c, l[c.k], (v) => setLs(ls.map((x, j) => (j === i ? { ...x, [c.k]: v } : x))))}</td>)}
              <td className="whitespace-nowrap px-3 py-1.5">
                <button className="mr-2 text-[12px] font-semibold text-navy hover:underline" onClick={() => salvar(ls)}>Salvar</button>
                <button className="text-[12px] font-semibold text-rose-700 hover:underline" onClick={() => salvar(ls.filter((_, j) => j !== i))}>Tirar</button>
              </td>
            </tr>
          ))}
          <tr className="border-t border-line bg-alt">
            {colunas.map((c) => <td key={c.k} className="px-3 py-1.5">{celula(c, nova[c.k] ?? (c.opcoes?.[0]?.[0] ?? ""), (v) => setNova({ ...nova, [c.k]: v }))}</td>)}
            <td className="px-3 py-1.5"><button className="btn-gold py-1 text-[12.5px]" onClick={() => { salvar([...ls, { ...Object.fromEntries(colunas.map((c) => [c.k, c.opcoes?.[0]?.[0] ?? ""])), ...nova }]); setNova({}); }}>+ Incluir</button></td>
          </tr>
        </tbody>
      </table>
      {msg && <p className="px-3 py-2 text-[12.5px] font-semibold text-rose-700">{msg}</p>}
    </div>
  );
}
