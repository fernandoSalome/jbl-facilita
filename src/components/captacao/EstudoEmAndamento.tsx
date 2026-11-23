"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

export type Andamento = { tipo: "estudo" | "mercado"; status: string; pct: number; fase: string | null };

const NOME = { estudo: "Viabilidade Legal", mercado: "Viabilidade Mercadológica" } as const;

/**
 * Bloco do estudo enquanto a VPS trabalha (pedido 22/11/2026): fica desativado, com "Realizando o estudo" e o %.
 * A tela se atualiza sozinha a cada 15 s; quando o estudo entra, o bloco volta preenchido.
 */
export default function EstudoEmAndamento({ andamento, children }: { andamento: Andamento | null; children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!andamento) return;
    const t = setInterval(() => router.refresh(), 15_000);
    return () => clearInterval(t);
  }, [andamento, router]);
  if (!andamento) return <>{children}</>;
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
        </div>
      </div>
    </div>
  );
}
