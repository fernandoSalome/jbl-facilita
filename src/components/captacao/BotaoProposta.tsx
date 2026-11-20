"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chamar } from "./chamar";

/** Etapa Proposta: cria (uma vez) a proposta com os dados dos estudos e abre o editor de sempre */
export default function BotaoProposta({ id, temProposta }: { id: string; temProposta: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn-gold px-6 py-3 text-[15px]" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const r = await chamar<{ id: string }>(`/api/areas/${id}/proposta`, "POST");
        router.push(`/app/proposta/${r.id}`);
      } catch (e) {
        alert((e as Error).message);
        setBusy(false);
      }
    }}>{busy ? "Montando a proposta…" : temProposta ? "✏️ Abrir a proposta no editor" : "Criar a proposta com os dados do estudo"}</button>
  );
}
