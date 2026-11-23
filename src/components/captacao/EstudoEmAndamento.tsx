"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { chamar } from "./chamar";

/** status "parado": o bloco fica liberado, com a faixa para retomar até `ate` (pedido 23/11/2026) */
export type Andamento = { id: string; tipo: "estudo" | "mercado"; status: string; pct: number; fase: string | null; ate?: string };

const NOME = { estudo: "Viabilidade Legal", mercado: "Viabilidade Mercadológica" } as const;

/**
 * Bloco do estudo enquanto a VPS trabalha (pedido 22/11/2026): fica desativado, com "Realizando o estudo" e o %.
 * A tela se atualiza sozinha a cada 15 s; quando o estudo entra, o bloco volta preenchido.
 * "Parar estudo" (pedido 23/11/2026) destrava na hora; o que a VPS já fez fica guardado 5 dias para retomar.
 */
export default function EstudoEmAndamento({ areaId, andamento, children }: { areaId: string; andamento: Andamento | null; children: ReactNode }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const ativo = !!andamento && andamento.status !== "parado";
  useEffect(() => {
    if (!ativo) return;
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [ativo, router]);
  async function agir(acao: "parar" | "retomar") {
    if (!andamento) return;
    if (acao === "parar" && !confirm(`Parar a ${NOME[andamento.tipo]}? O que já foi feito fica guardado por 5 dias para retomar.`)) return;
    setOcupado(true);
    setErro("");
    try {
      await chamar(`/api/areas/${areaId}/estudo-vps`, "PATCH", { estudo: andamento.id, acao });
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }
  if (!andamento) return <>{children}</>;
  if (!ativo)
    return (
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-3 rounded-md border border-gold-line bg-gold-soft px-4 py-2.5 text-[13.5px] text-gold-ink">
          <span>
            ⏸ <b>{NOME[andamento.tipo]} parada</b>
            {andamento.pct ? ` em ${andamento.pct}%` : ""}. O que já foi feito fica guardado até {andamento.ate}.
          </span>
          <span className="flex-1" />
          <button type="button" className="btn-navy px-4 py-1.5 text-[13.5px]" disabled={ocupado} onClick={() => agir("retomar")}>
            ▶️ Retomar de onde parou
          </button>
          {erro && <span className="w-full text-rose-700">{erro}</span>}
        </div>
        {children}
      </div>
    );
  const naFila = andamento.status === "fila";
  return (
    <div className="relative">
      <fieldset disabled className="pointer-events-none select-none opacity-40" aria-hidden>
        {children}
      </fieldset>
      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="card w-full max-w-md border-2 border-gold-line p-5 text-center shadow-lg">
          <div className="text-[15px] font-bold text-navy">
            {naFila ? `⏳ ${NOME[andamento.tipo]} na fila` : `🧠 Realizando a ${NOME[andamento.tipo]}…`}
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-navy-50">
            <div className="h-full rounded-full bg-gold transition-all duration-700" style={{ width: `${naFila ? 2 : andamento.pct}%` }} />
          </div>
          <div className="mt-2 text-[13px] text-muted">
            {naFila ? "Começa assim que a VPS terminar o pedido anterior." : <><b className="text-navy">{andamento.pct}%</b>{andamento.fase ? ` · ${andamento.fase}` : " · estimado pelo tempo"}</>}
          </div>
          <p className="mt-2 text-[12px] text-muted">O aviso de pronto sai no JBL - Avisos e o resumo, no JBL - Central.</p>
          <button type="button" className="mt-3 rounded border border-rose-200 px-4 py-1.5 text-[13px] font-semibold text-rose-700 hover:bg-rose-50" disabled={ocupado} onClick={() => agir("parar")}>
            {ocupado ? "Parando…" : "⏹ Parar estudo"}
          </button>
          {erro && <p className="mt-2 text-[12.5px] text-rose-700">{erro}</p>}
        </div>
      </div>
    </div>
  );
}
