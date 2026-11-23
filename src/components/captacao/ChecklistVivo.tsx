"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FONTES, grauDaFonte, perguntar, SECOES, type Fonte, type Resposta } from "@/lib/captacao";
import ChecklistEstudo, { type Cabecalho } from "./ChecklistEstudo";
import { chamar } from "./chamar";

/**
 * Checklist vivo (pedido 19/11/2026): o professor no topo, a caixa de perguntas, "adicionar informação"
 * (Enter distribui nas seções) e as 30 seções abertas, cada resposta com a origem. Conclusão no fim.
 */
type Derivada = Resposta & { aba: string };

export default function ChecklistVivo({ id, checklist, derivadas, conclusao, cab }: { id: string; checklist: Resposta[]; derivadas: Derivada[]; conclusao: string; cab: Cabecalho }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [fonte, setFonte] = useState<Fonte>("manual");
  const [msg, setMsg] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [achados, setAchados] = useState<Resposta[] | null>(null);
  const [concl, setConcl] = useState(conclusao);
  const todas = useMemo(() => [...derivadas, ...checklist], [derivadas, checklist]);

  async function distribuir(t = texto, extra: Record<string, unknown> = {}) {
    if (!t.trim()) return;
    try {
      const r = await chamar<{ secoes: string[] }>(`/api/areas/${id}/info`, "POST", { texto: t, fonte, ...extra });
      setMsg(`✅ ${r.secoes.length} informação(ões): ${[...new Set(r.secoes)].join(" · ")}`);
      setTexto("");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <div className="grid gap-5">
      {/* o checklist no modelo do Word, seção por seção (pedido 23/11/2026) */}
      <ChecklistEstudo id={id} cab={cab} todas={todas} />

      <section className="card p-5">
        <h3 className="eyebrow mb-2">Perguntar sobre esta área</h3>
        <input className="input" placeholder="Ex.: qual a zona? tem córrego? qual o preço do lote?" value={pergunta} onChange={(e) => setPergunta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setAchados(perguntar(todas, pergunta))} />
        {achados && (
          <div className="mt-3 grid gap-2 text-[14px]">
            {achados.length ? achados.map((r, i) => (
              <div key={i} className="rounded border border-line p-3">
                <b className="text-navy">{SECOES[r.secao].titulo} › {r.pergunta}:</b> {r.resposta}
                <div className="mt-1 text-[12.5px] text-muted">{FONTES[r.fonte].icone} {FONTES[r.fonte].tipo}. {grauDaFonte(r)}</div>
              </div>
            )) : (
              <div className="rounded border border-dashed border-gold-line bg-gold-soft p-3">
                Não encontrei isso no checklist.{" "}
                <button className="font-semibold text-gold-deep underline" onClick={() => distribuir(`Pendente: ${pergunta}`, { secao: 28, pergunta: "Pendência" })}>Anotar como pendência</button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card border-gold-line p-5">
        <h3 className="eyebrow mb-2">Adicionar informação</h3>
        <p className="mb-2 text-[13px] text-muted">Escreva livre e aperte Enter: cada frase vai para o item certo, com a origem (Shift+Enter quebra linha).</p>
        <textarea className="input" rows={3} value={texto} placeholder="Ex.: A matrícula está no nome dos 3 irmãos. Tem poste da CPFL na estrada. Lote vizinho a R$ 600 o m²."
          onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); distribuir(); } }} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select className="input w-auto py-1.5 text-[13px]" value={fonte} onChange={(e) => setFonte(e.target.value as Fonte)}>
            {(Object.keys(FONTES) as Fonte[]).map((f) => <option key={f} value={f}>Origem: {FONTES[f].rotulo}</option>)}
          </select>
          <span className="flex-1" />
          <button className="btn-gold py-1.5 text-[13px]" onClick={() => distribuir()}>Distribuir no checklist</button>
        </div>
        {msg && <p className="mt-2 text-[13px] font-semibold text-navy">{msg}</p>}
      </section>

      <section className="card border-2 border-gold-line p-5">
        <h3 className="font-display text-xl text-navy">📌 Conclusão do estudo</h3>
        <textarea className="input mt-2" rows={5} value={concl} onChange={(e) => setConcl(e.target.value)} placeholder="A favor, pendências que decidem e recomendação." />
        <button className="btn-gold mt-2 py-1.5 text-[13px]" onClick={async () => { await chamar(`/api/areas/${id}`, "PATCH", { conclusao: concl }); setMsg("✅ Conclusão salva."); router.refresh(); }}>Salvar conclusão</button>
      </section>
    </div>
  );
}
