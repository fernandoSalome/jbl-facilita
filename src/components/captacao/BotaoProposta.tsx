"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chamar } from "./chamar";

/** Etapa Proposta: abre (ou cria uma vez) o loteamento e vai para as propostas, que seguem o fluxo de sempre */
export default function BotaoProposta({ id, temLoteamento }: { id: string; temLoteamento: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button className="btn-gold" disabled={busy} onClick={async () => {
      setBusy(true);
      try {
        const r = await chamar<{ id: string }>(`/api/areas/${id}/loteamento`, "POST");
        router.push(`/app/projetos/${r.id}/propostas`);
      } catch (e) {
        alert((e as Error).message);
        setBusy(false);
      }
    }}>{temLoteamento ? "Abrir propostas do loteamento" : "Criar loteamento e fazer a proposta"}</button>
  );
}
