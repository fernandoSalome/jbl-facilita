"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Modelo da minuta da SPE (pedido 25/11/2026): sobe o PDF uma vez e ele aparece para o proprietário no passo da
 * Carta de Intenção, para ver e baixar. Fica no banco, não no git (o repositório é público).
 */
export default function ModeloSpe({ info, admin }: { info: { nome: string; tamanho: number; quando: string; por: string | null } | null; admin: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  async function subir(f: File) {
    setEnviando(true);
    setMsg("Enviando…");
    const fd = new FormData();
    fd.append("arquivo", f);
    try {
      const r = await fetch("/api/modelos/spe", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Não foi possível enviar.");
      setMsg("✅ Modelo da SPE atualizado.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }
  return (
    <section className="card mx-8 mb-8 border-2 border-gold-line p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h2 className="font-display text-xl text-navy">📄 Modelo da minuta da SPE</h2>
          <p className="mt-1 text-[13px] text-muted">Aparece para o proprietário no passo a passo, no passo da Carta de Intenção, com “Baixar Modelo SPE”. Só PDF, até 4 MB.</p>
        </div>
        {info && <a className="btn-ghost" href="/api/modelos/spe" target="_blank" rel="noreferrer">Ver o modelo</a>}
        {admin && (
          <label className={`btn-gold cursor-pointer ${enviando ? "pointer-events-none opacity-60" : ""}`}>
            {info ? "Trocar o PDF" : "Subir o PDF"}
            <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) subir(f); }} />
          </label>
        )}
      </div>
      <p className="mt-3 text-[13px]">
        {info
          ? <><b className="text-navy">{info.nome}</b> · {(info.tamanho / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} KB · atualizado em {info.quando}{info.por ? ` por ${info.por}` : ""}</>
          : <span className="text-muted">Nenhum modelo ainda: o botão não aparece para o proprietário.</span>}
      </p>
      {msg && <p className="mt-2 text-[13px] font-semibold text-navy">{msg}</p>}
    </section>
  );
}
