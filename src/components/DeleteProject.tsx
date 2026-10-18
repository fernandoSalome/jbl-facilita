"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteProject({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function excluir() {
    if (prompt(`Para excluir, digite o nome do loteamento:\n${name}`)?.trim() !== name.trim()) return;
    setBusy(true);
    const r = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (!r.ok) {
      setBusy(false);
      return alert("Só administradores podem excluir loteamentos.");
    }
    router.push("/app/projetos");
    router.refresh();
  }
  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 border-rose-200 p-5">
      <div>
        <b className="text-rose-800">Excluir loteamento</b>
        <p className="text-[13px] text-muted">O loteamento e as propostas dele somem das listas. Só administradores podem fazer isso.</p>
      </div>
      <button className="rounded border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50" disabled={busy} onClick={excluir}>
        {busy ? "Excluindo…" : "Excluir loteamento"}
      </button>
    </div>
  );
}
