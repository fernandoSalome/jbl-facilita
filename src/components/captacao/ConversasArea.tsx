"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PAPEIS } from "@/lib/captacao";
import { chamar } from "./chamar";

type C = { id: string; nome: string; telefone: string; papel: string; nutrir: boolean };

/** Conversas que alimentam o checklist: papel, nutrir, limpar e extrair, desvincular (pedido 19/11/2026) */
export default function ConversasArea({ id, conversas }: { id: string; conversas: C[] }) {
  const router = useRouter();
  const [nova, setNova] = useState({ nome: "", telefone: "", papel: "proprietario" });
  const [msg, setMsg] = useState("");
  const rodar = async (f: () => Promise<unknown>, ok?: string) => {
    try {
      await f();
      if (ok) setMsg(ok);
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  };
  const limpar = (c: C, f?: File) =>
    f && rodar(async () => {
      const fd = new FormData();
      fd.append("arquivo", f);
      fd.append("conversa", c.id);
      const r = await chamar<{ falas: number; n: number }>(`/api/areas/${id}/limpar`, "POST", fd);
      setMsg(`🧹 ${c.nome}: ${r.falas} falas úteis, ${r.n} informações no checklist.`);
    });

  return (
    <section className="card p-5">
      <h3 className="eyebrow mb-1">Conversas que alimentam o checklist</h3>
      <p className="mb-3 text-[13px] text-muted">Com “nutrir” ligado, as mensagens novas dessa pessoa entram no checklist sozinhas. “Limpar e extrair” lê a conversa exportada do WhatsApp (Mais › Exportar conversa › sem mídia) e guarda só o que importa.</p>
      <ul className="grid gap-2">
        {conversas.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-2 rounded border border-line p-2.5 text-sm">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-navy font-display text-gold">{c.nome[0]}</span>
            <span className="min-w-[160px] flex-1"><b className="text-navy">{c.nome}</b><br /><span className="text-[12px] text-muted">+{c.telefone}</span></span>
            <select className="input w-auto py-1 text-[13px]" value={c.papel} onChange={(e) => rodar(() => chamar(`/api/areas/${id}/conversas`, "PATCH", { conversaId: c.id, papel: e.target.value }))}>
              {Object.entries(PAPEIS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
            </select>
            <label className="flex items-center gap-1 text-[13px]"><input type="checkbox" checked={c.nutrir} onChange={(e) => rodar(() => chamar(`/api/areas/${id}/conversas`, "PATCH", { conversaId: c.id, nutrir: e.target.checked }))} /> nutrir checklist</label>
            <label className="btn-ghost cursor-pointer py-1 text-[13px]">🧹 Limpar e extrair<input type="file" accept=".txt" className="hidden" onChange={(e) => limpar(c, e.target.files?.[0])} /></label>
            <button className="text-[12.5px] font-semibold text-rose-700 hover:underline" onClick={() => confirm(`Desvincular ${c.nome}?`) && rodar(() => chamar(`/api/areas/${id}/conversas?conversa=${c.id}`, "DELETE"))}>Desvincular</button>
          </li>
        ))}
        {!conversas.length && <li className="text-sm text-muted">Nenhuma conversa ligada.</li>}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <input className="input max-w-[200px] py-1.5 text-[13px]" placeholder="Nome" value={nova.nome} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
        <input className="input max-w-[180px] py-1.5 text-[13px]" placeholder="Telefone com DDD" value={nova.telefone} onChange={(e) => setNova({ ...nova, telefone: e.target.value })} />
        <select className="input w-auto py-1.5 text-[13px]" value={nova.papel} onChange={(e) => setNova({ ...nova, papel: e.target.value })}>{Object.entries(PAPEIS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
        <button className="btn-gold py-1.5 text-[13px]" onClick={() => rodar(async () => { await chamar(`/api/areas/${id}/conversas`, "POST", nova); setNova({ nome: "", telefone: "", papel: "proprietario" }); }, "✅ Conversa ligada.")}>+ Vincular conversa</button>
      </div>
      {msg && <p className="mt-2 text-[13px] font-semibold text-navy">{msg}</p>}
    </section>
  );
}
