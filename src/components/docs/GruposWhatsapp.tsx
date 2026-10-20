"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Grupo = { id: string; jid: string; name: string; papel: string };

/** Grupos que o robô atende: só os cadastrados aqui */
export default function GruposWhatsapp({ grupos }: { grupos: Grupo[] }) {
  const router = useRouter();
  const [jid, setJid] = useState("");
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const ativos = grupos.filter((g) => g.papel !== "inativo");

  async function adicionar() {
    setBusy(true);
    setErro("");
    const r = await fetch("/api/whatsapp/grupos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jid }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErro(d.error ?? "Não foi possível adicionar.");
    setJid("");
    router.refresh();
  }
  async function remover(g: Grupo) {
    if (!confirm(`O robô para de responder no grupo "${g.name}". Continuar?`)) return;
    await fetch(`/api/whatsapp/grupos?id=${g.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <h3 className="eyebrow mb-2 mt-5">Grupos atendidos pelo robô</h3>
      {ativos.length ? (
        <ul className="grid gap-1.5 text-sm">
          {ativos.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3">
              <span>💬 <b>{g.name}</b> <span className="text-[12px] text-muted">{g.jid}</span></span>
              <button className="text-[12px] font-semibold text-rose-700 hover:underline" onClick={() => remover(g)}>Remover</button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Nenhum grupo cadastrado: o robô não responde em lugar nenhum.</p>
      )}
      <div className="mt-3 flex gap-2">
        <input className="input py-1.5 text-[13px]" placeholder="ID do grupo (ex.: 120363431551313202@g.us)" value={jid} onChange={(e) => setJid(e.target.value)} />
        <button className="btn-gold shrink-0 py-1.5 text-[13px]" disabled={busy || !jid.trim()} onClick={adicionar}>Adicionar</button>
      </div>
      {erro && <p className="mt-1 text-[12.5px] font-semibold text-rose-700">{erro}</p>}
      <p className="mt-2 text-[12px] text-muted">Mensagens de grupos que não estão aqui são ignoradas e não ficam guardadas.</p>
    </>
  );
}
