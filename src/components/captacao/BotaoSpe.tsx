"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chamar } from "./chamar";

/** Etapa Contrato: com a SPE assinada, a área vira Projeto de Loteamento e abre */
export default function BotaoSpe({ id, projetoAberto }: { id: string; projetoAberto: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (projetoAberto) return <a className="btn-gold px-6 py-3 text-[15px]" href={`/app/projetos/${projetoAberto}/propostas`}>Abrir o Projeto de Loteamento</a>;
  return (
    <button className="btn-gold px-6 py-3 text-[15px]" disabled={busy} onClick={async () => {
      if (!confirm("Confirma que o contrato da SPE foi assinado? A área vira Projeto de Loteamento e aparece no seletor.")) return;
      setBusy(true);
      try {
        const r = await chamar<{ id: string }>(`/api/areas/${id}/spe`, "POST");
        router.push(`/app/projetos/${r.id}/propostas`);
      } catch (e) {
        alert((e as Error).message);
        setBusy(false);
      }
    }}>{busy ? "Abrindo o projeto…" : "✍️ Contrato da SPE assinado"}</button>
  );
}
