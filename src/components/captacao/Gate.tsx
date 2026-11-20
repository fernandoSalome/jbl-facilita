"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ACAO_DA_ETAPA, MESES_GELADEIRA, nomeEtapa, proximaEtapa, rotuloMeses, type Etapa } from "@/lib/captacao";
import { chamar } from "./chamar";

/** Botões do topo à direita: avançar de etapa, geladeira, descartar (sem "ainda não", pedido 19/11/2026).
 *  Descartar e geladeira abrem um quadro para o motivo; a geladeira também pede o tempo (pedido 20/11/2026). */
export default function Gate({ id, etapa, situacao }: { id: string; etapa: Etapa; situacao: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [quadro, setQuadro] = useState<"" | "descartada" | "geladeira">("");
  const [motivo, setMotivo] = useState("");
  const [meses, setMeses] = useState<number>(3);
  const prox = proximaEtapa(etapa);
  async function mudar(dados: Record<string, unknown>) {
    setBusy(true);
    try {
      await chamar(`/api/areas/${id}`, "PATCH", dados);
      setQuadro("");
      setMotivo("");
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
      <button className="btn-ghost" disabled={busy} onClick={() => setQuadro("geladeira")}>❄️ Geladeira</button>
      <button className="btn-ghost" disabled={busy} onClick={() => setQuadro("descartada")}>✖ Descartar</button>
      {quadro && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" onClick={() => !busy && setQuadro("")}>
          <div className="card w-full max-w-lg p-6 text-left" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl text-navy">{quadro === "geladeira" ? "❄️ Colocar na geladeira" : "✖ Descartar a área"}</h3>
            {quadro === "geladeira" && (
              <>
                <p className="mt-3 text-[13px] font-semibold text-navy">Por quanto tempo?</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {MESES_GELADEIRA.map((m) => (
                    <button key={m} className={m === meses ? "btn-navy py-1.5 text-[13px]" : "btn-ghost py-1.5 text-[13px]"} onClick={() => setMeses(m)}>{rotuloMeses(m)}</button>
                  ))}
                </div>
                <p className="mt-2 text-[12.5px] text-muted">5 dias antes de acabar o tempo, o robô avisa no grupo.</p>
              </>
            )}
            <p className="mt-4 text-[13px] font-semibold text-navy">{quadro === "geladeira" ? "Motivo da espera" : "Motivo do descarte"}</p>
            <textarea className="input mt-1.5" rows={4} autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)}
              placeholder={quadro === "geladeira" ? "Ex.: inventário em andamento; dono só decide depois da colheita." : "Ex.: APP toma 60% da área; zona não permite loteamento."} />
            <p className="mt-1 text-[12.5px] text-muted">Fica guardado e aparece quando a área for aberta de novo.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-ghost" disabled={busy} onClick={() => setQuadro("")}>Cancelar</button>
              <button className="btn-gold" disabled={busy || motivo.trim().length < 3} onClick={() => mudar({ situacao: quadro, motivo, ...(quadro === "geladeira" ? { meses } : {}) })}>
                {busy ? "Salvando…" : quadro === "geladeira" ? `Geladeira por ${rotuloMeses(meses)}` : "Descartar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
