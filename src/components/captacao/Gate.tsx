"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACAO_DA_ETAPA, nomeEtapa, proximaEtapa, type Etapa } from "@/lib/captacao";
import { chamar } from "./chamar";

/** Botões do topo à direita: avançar de etapa, geladeira, descartar (sem "ainda não", pedido 19/11/2026) */
export default function Gate({ id, etapa, situacao }: { id: string; etapa: Etapa; situacao: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const prox = proximaEtapa(etapa);
  async function mudar(dados: Record<string, string>) {
    setBusy(true);
    try {
      await chamar(`/api/areas/${id}`, "PATCH", dados);
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  }
  if (situacao !== "ativa") return <button className="btn-gold" disabled={busy} onClick={() => mudar({ situacao: "ativa" })}>Reativar área</button>;
  return (
    <>
      {prox && <button className="btn-gold" disabled={busy} title={`Vai para ${nomeEtapa(prox)}`} onClick={() => mudar({ etapa: prox })}>✓ {ACAO_DA_ETAPA[etapa]}</button>}
      <button className="btn-ghost" disabled={busy} onClick={() => mudar({ situacao: "geladeira" })}>❄️ Geladeira</button>
      <button className="btn-ghost" disabled={busy} onClick={() => confirm("Descartar esta área?") && mudar({ situacao: "descartada" })}>✖ Descartar</button>
    </>
  );
}
