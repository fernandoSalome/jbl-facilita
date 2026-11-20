"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FONTES, grauDaFonte, perguntar, progresso, SECOES, type Fonte, type Resposta } from "@/lib/captacao";
import { chamar } from "./chamar";

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
type Derivada = Resposta & { aba: string };

/** Um ponto escrito à mão: ✏️ editar (ao salvar, o texto é arrumado) e 🗑 tirar */
function PontoEditavel({ id, r, indice }: { id: string; r: Resposta; indice: number }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(r.resposta);
  const [secao, setSecao] = useState(r.secao);
  const [busy, setBusy] = useState(false);
  if (!editando)
    return (
      <span className="group">
        {r.resposta}
        <Origem r={r} />
        <button className="ml-2 rounded border border-line px-1.5 text-[12px] font-semibold text-navy hover:border-gold" onClick={() => setEditando(true)}>✏️ Editar</button>
        <button className="ml-1 rounded border border-line px-1.5 text-[12px] font-semibold text-rose-700 hover:border-rose-300" onClick={async () => { if (confirm("Apagar este ponto do checklist?")) { await chamar(`/api/areas/${id}/checklist?indice=${indice}`, "DELETE"); router.refresh(); } }}>🗑 Apagar</button>
      </span>
    );
  return (
    <span className="grid gap-1.5">
      <textarea className="input text-[14px]" rows={2} value={texto} autoFocus onChange={(e) => setTexto(e.target.value)} />
      <select className="input w-auto py-1 text-[13px]" value={secao} onChange={(e) => setSecao(+e.target.value)} title="Seção do checklist">
        {SECOES.map((x, k) => <option key={k} value={k}>{k + 1}. {x.titulo}</option>)}
      </select>
      <span className="flex items-center gap-2">
        <button className="btn-gold py-1 text-[12.5px]" disabled={busy || !texto.trim()} onClick={async () => {
          setBusy(true);
          try { await chamar(`/api/areas/${id}/checklist`, "PATCH", { indice, texto, secao }); setEditando(false); router.refresh(); } catch (e) { alert((e as Error).message); }
          setBusy(false);
        }}>{busy ? "Arrumando o texto…" : "Salvar"}</button>
        <button className="btn-ghost py-1 text-[12.5px]" onClick={() => { setTexto(r.resposta); setEditando(false); }}>Cancelar</button>
        <span className="text-[12px] text-muted">Ao salvar, o texto é arrumado (sem mudar os fatos).</span>
      </span>
    </span>
  );
}

export default function ChecklistVivo({ id, checklist, derivadas, conclusao, simples = false }: { id: string; checklist: Resposta[]; derivadas: Derivada[]; conclusao: string; simples?: boolean }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [fonte, setFonte] = useState<Fonte>("manual");
  const [msg, setMsg] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [achados, setAchados] = useState<Resposta[] | null>(null);
  const [filtro, setFiltro] = useState(0);
  const [concl, setConcl] = useState(conclusao);
  const todas = useMemo(() => [...derivadas, ...checklist], [derivadas, checklist]);
  const pr = useMemo(() => progresso(todas), [todas]);

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
  const lista = checklist.map((r, indice) => ({ r, indice })).filter(({ r }) => FILTROS[filtro][1](r));
  const listaDer = derivadas.filter(FILTROS[filtro][1]);

  return (
    <div className="grid gap-5">


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

      <div className="flex flex-wrap items-center gap-2">
        {FILTROS.map(([n], i) => <button key={n} className={i === filtro ? "btn-navy py-1 text-[12.5px]" : "btn-ghost py-1 text-[12.5px]"} onClick={() => setFiltro(i)}>{n}</button>)}
        <span className="ml-auto text-[13px] text-muted">Checklist oficial JBL · {pr.pct}% · {derivadas.length} vindas dos passos · {checklist.length} escritas</span>
      </div>

      {SECOES.map((s, i) => {
        const rs = lista.filter(({ r }) => r.secao === i);
        const ds = listaDer.filter((r) => r.secao === i);
        const faltam = s.perguntas.filter((p) => !todas.some((r) => r.secao === i && r.pergunta === p));
        const { ok, esperadas } = pr.porSecao[i];
        return (
          <details key={i} open={!simples || ok > 0} className="card">
            <summary className="flex cursor-pointer items-center gap-3 px-4 py-3">
              <b className="flex-1 text-navy">{i + 1}. {s.titulo}</b>
              <span className="text-[12px] text-muted">{ok} de {esperadas}</span>
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface"><span className="block h-full bg-gold" style={{ width: `${Math.round((ok / esperadas) * 100)}%` }} /></span>
            </summary>
            <div className="grid gap-1.5 border-t border-line px-4 py-3 text-[14px]">
              {ds.map((r, j) => (
                <div key={`d${j}`} className="grid gap-2 md:grid-cols-[220px_1fr]">
                  <span className="text-muted">{r.pergunta}</span>
                  <span>{r.resposta}<a href={`?aba=${r.aba}`} className="ml-2 whitespace-nowrap rounded-sm border border-gold-line bg-gold-soft px-1.5 py-px text-[11px] text-gold-ink hover:border-gold" title="Vem do passo; para mudar, mude lá">⚡ automático · {r.ref}</a></span>
                </div>
              ))}
              {rs.map(({ r, indice }) => <div key={indice} className="grid gap-2 md:grid-cols-[220px_1fr]"><span className="text-muted">{r.pergunta}</span><PontoEditavel id={id} r={r} indice={indice} /></div>)}
              {faltam.map((p) => (
                <div key={p} className="grid items-center gap-2 md:grid-cols-[220px_1fr]">
                  <span className="text-muted">{p}</span>
                  <input className="input py-1 text-[13px]" placeholder="Preencher (fica como Manual)" onKeyDown={(e) => { const v = (e.target as HTMLInputElement).value; if (e.key === "Enter" && v.trim()) distribuir(v, { secao: i, pergunta: p }); }} />
                </div>
              ))}
              {!rs.length && !ds.length && !faltam.length && <span className="text-[13px] text-muted">Nada ainda.</span>}
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
