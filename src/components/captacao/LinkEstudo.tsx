"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chamar } from "./chamar";

/** Botão do estudo de viabilidade: gera o link para mandar a um parceiro, copia, abre ou desativa */
export default function LinkEstudo({ id, token, temRelatorio }: { id: string; token: string | null; temRelatorio: boolean }) {
  const router = useRouter();
  const [t, setT] = useState(token);
  const [msg, setMsg] = useState("");
  const url = t ? `${typeof window === "undefined" ? "" : window.location.origin}/estudo/${t}` : "";
  async function gerar() {
    try {
      const r = await chamar<{ token: string }>(`/api/areas/${id}/link`, "POST");
      setT(r.token);
      setMsg("");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  return (
    <section className="card border-2 border-gold-line p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-xl text-navy">🔗 Link do estudo para parceiro</h3>
        <span className="flex-1" />
        {!t && <button className="btn-gold" onClick={gerar}>Gerar link</button>}
      </div>
      <p className="mt-1 text-[13px] text-muted">Página com a logo da JBL e a explicação do estudo, como uma proposta. Não mostra o nome do proprietário, o corretor, as conversas, o checklist, a margem nem a parte do proprietário.</p>
      {t && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input className="input max-w-xl py-1.5 text-[13px]" readOnly value={url} onFocus={(e) => e.target.select()} />
          <button className="btn-gold py-1.5 text-[13px]" onClick={async () => { await navigator.clipboard.writeText(url); setMsg("✅ Link copiado."); }}>Copiar</button>
          <a className="btn-ghost py-1.5 text-[13px]" href={url} target="_blank" rel="noreferrer">Ver como o parceiro vê</a>
          <a className="btn-ghost py-1.5 text-[13px]" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Segue o estudo de viabilidade da área, preparado pela JBL Incorporadora: ${url}`)}`}>Mandar no WhatsApp</a>
          <button className="text-[12.5px] font-semibold text-rose-700 hover:underline" onClick={async () => { if (!confirm("Desativar? Quem tem o link não consegue mais abrir.")) return; await chamar(`/api/areas/${id}/link`, "DELETE"); setT(null); router.refresh(); }}>Desativar link</button>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-[13px]">
        <b className="text-navy">Raio-x completo no link:</b>
        <span className={temRelatorio ? "font-semibold text-emerald-700" : "text-muted"}>{temRelatorio ? "✅ incluído (texto, tabelas e imagens)" : "não incluído: o link mostra só o resumo"}</span>
        <label className="btn-ghost cursor-pointer py-1 text-[12.5px]">{temRelatorio ? "Trocar o raio-x" : "Subir o raio-x (.html)"}
          <input type="file" accept=".html,.htm" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setMsg("Lendo o raio-x…");
            const fd = new FormData();
            fd.append("arquivo", f);
            try { const r = await chamar<{ secoes: number; imagens: number }>(`/api/areas/${id}/relatorio`, "POST", fd); setMsg(`✅ Raio-x incluído: ${r.secoes} seções e ${r.imagens} imagens.`); router.refresh(); } catch (err) { setMsg((err as Error).message); }
          }} />
        </label>
        {temRelatorio && <button className="text-[12.5px] font-semibold text-rose-700 hover:underline" onClick={async () => { await chamar(`/api/areas/${id}/relatorio`, "DELETE"); router.refresh(); }}>Tirar do link</button>}
      </div>
      {msg && <p className="mt-2 text-[13px] font-semibold text-navy">{msg}</p>}
    </section>
  );
}
