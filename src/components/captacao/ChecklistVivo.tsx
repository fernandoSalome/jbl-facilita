"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FONTES, grauDaFonte, perguntar, progresso, SECOES, type Fonte, type Questao, type Resposta } from "@/lib/captacao";
import { chamar } from "./chamar";

const COR_CAT: Record<Questao["categoria"], string> = {
  Geral: "bg-navy-50 text-navy",
  Jurídica: "bg-rose-50 text-rose-800",
  Ambiental: "bg-emerald-50 text-emerald-800",
  Mercado: "bg-gold-soft text-gold-ink",
  Financeira: "bg-gold-soft text-gold-ink",
  Acesso: "bg-navy-50 text-navy",
};
const FILTROS: [string, (r: Resposta) => boolean][] = [
  ["Todas", () => true],
  ["Do WhatsApp", (r) => r.fonte === "whatsapp"],
  ["Da reunião", (r) => r.fonte === "reuniao"],
  ["Do raio-x", (r) => r.fonte === "raiox"],
  ["De documento", (r) => r.fonte === "documento"],
];

function Origem({ r }: { r: Resposta }) {
  const f = FONTES[r.fonte];
  return <span className="ml-2 whitespace-nowrap rounded-sm border border-line bg-white px-1.5 py-px text-[11px] text-muted" title={grauDaFonte(r)}>{f.icone} {f.rotulo} · {r.ref}</span>;
}

/**
 * Checklist vivo (pedido 19/11/2026): o professor no topo, a caixa de perguntas, "adicionar informação"
 * (Enter distribui nas seções) e as 30 seções abertas, cada resposta com a origem. Conclusão no fim.
 */
export default function ChecklistVivo({ id, checklist, prof, conclusao }: { id: string; checklist: Resposta[]; prof: { nota: number; leitura: string; questoes: Questao[] }; conclusao: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [fonte, setFonte] = useState<Fonte>("manual");
  const [msg, setMsg] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [achados, setAchados] = useState<Resposta[] | null>(null);
  const [filtro, setFiltro] = useState(0);
  const [concl, setConcl] = useState(conclusao);
  const pr = useMemo(() => progresso(checklist), [checklist]);

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
  const lista = checklist.filter(FILTROS[filtro][1]);

  return (
    <div className="grid gap-5">
      <section className="card border-2 border-gold p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-xl text-navy">🎓 Questionamentos do professor</h3>
          <span className={`rounded-sm px-2 py-0.5 text-[12px] font-bold ${prof.nota >= 8 ? "bg-emerald-100 text-emerald-800" : prof.nota >= 5 ? "bg-gold-soft text-gold-ink" : "bg-rose-100 text-rose-800"}`}>nota {prof.nota}/10</span>
          <span className="text-[12.5px] text-muted">relê o checklist a cada informação nova</span>
        </div>
        <p className="mt-2 text-[14px]">{prof.leitura}</p>
        <ul className="mt-3 grid gap-2">
          {prof.questoes.map((q, i) => (
            <li key={i} className="flex items-baseline gap-3 text-[14px]">
              <span className={`min-w-[86px] rounded-sm px-2 py-0.5 text-center text-[11px] font-bold ${COR_CAT[q.categoria]}`}>{q.categoria}</span>
              <span className="flex-1">{q.texto}{q.pedirA && <span className="ml-2 text-[12px] font-semibold text-gold-deep">📲 perguntar a {q.pedirA}</span>}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-5">
        <h3 className="eyebrow mb-2">Perguntar sobre esta área</h3>
        <input className="input" placeholder="Ex.: qual a zona? tem córrego? qual o preço do lote?" value={pergunta} onChange={(e) => setPergunta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setAchados(perguntar(checklist, pergunta))} />
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

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map(([n], i) => <button key={n} className={i === filtro ? "btn-navy py-1 text-[12.5px]" : "btn-ghost py-1 text-[12.5px]"} onClick={() => setFiltro(i)}>{n}</button>)}
        <span className="ml-auto text-[13px] text-muted">Checklist oficial JBL · {pr.pct}% · {checklist.length} respostas</span>
      </div>

      {SECOES.map((s, i) => {
        const rs = lista.filter((r) => r.secao === i);
        const faltam = s.perguntas.filter((p) => !checklist.some((r) => r.secao === i && r.pergunta === p));
        const { ok, esperadas } = pr.porSecao[i];
        return (
          <details key={i} open className="card">
            <summary className="flex cursor-pointer items-center gap-3 px-4 py-3">
              <b className="flex-1 text-navy">{i + 1}. {s.titulo}</b>
              <span className="text-[12px] text-muted">{ok} de {esperadas}</span>
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface"><span className="block h-full bg-gold" style={{ width: `${Math.round((ok / esperadas) * 100)}%` }} /></span>
            </summary>
            <div className="grid gap-1.5 border-t border-line px-4 py-3 text-[14px]">
              {rs.map((r, j) => <div key={j} className="grid gap-2 md:grid-cols-[220px_1fr]"><span className="text-muted">{r.pergunta}</span><span>{r.resposta}<Origem r={r} /></span></div>)}
              {faltam.map((p) => (
                <div key={p} className="grid items-center gap-2 md:grid-cols-[220px_1fr]">
                  <span className="text-muted">{p}</span>
                  <input className="input py-1 text-[13px]" placeholder="Preencher (fica como Manual)" onKeyDown={(e) => { const v = (e.target as HTMLInputElement).value; if (e.key === "Enter" && v.trim()) distribuir(v, { secao: i, pergunta: p }); }} />
                </div>
              ))}
              {!rs.length && !faltam.length && <span className="text-[13px] text-muted">Nada ainda.</span>}
            </div>
          </details>
        );
      })}

      <section className="card border-2 border-gold-line p-5">
        <h3 className="font-display text-xl text-navy">📌 Conclusão do estudo</h3>
        <textarea className="input mt-2" rows={5} value={concl} onChange={(e) => setConcl(e.target.value)} placeholder="A favor, pendências que decidem e recomendação." />
        <button className="btn-gold mt-2 py-1.5 text-[13px]" onClick={async () => { await chamar(`/api/areas/${id}`, "PATCH", { conclusao: concl }); setMsg("✅ Conclusão salva."); router.refresh(); }}>Salvar conclusão</button>
      </section>
    </div>
  );
}
