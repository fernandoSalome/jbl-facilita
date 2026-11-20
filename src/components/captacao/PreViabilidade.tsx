"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resumoCentral, SEMAFOROS, STATUS_E1, VEREDITOS, type Estudo1, type Estudo2 } from "@/lib/captacao-estudos";
import { chamar } from "./chamar";
import ListaEditavel from "./ListaEditavel";
import LinkEstudo from "./LinkEstudo";

type A = { id: string; cidade: string; dono: string | null; corretor: string | null; nome: string; hectares: number | null; relatorio: string | null; estudoToken: string | null; relatorioCompleto: unknown };

const Fase = ({ n, t, sub, on, off }: { n: number; t: string; sub: string; on: boolean; off: boolean }) => (
  <div className={`flex-1 rounded-md border-2 px-4 py-3 ${on ? "border-gold bg-gold-soft" : off ? "border-line bg-alt opacity-60" : "border-navy-50 bg-white"}`}>
    <b className="text-navy">{n}. {t}</b>
    <div className="text-[12.5px] text-muted">{sub}</div>
  </div>
);
const linhas = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/**
 * Pré-viabilidade em 3 fases (pedido 19/11/2026): terreno → (sim no Central) → mercadológico → apresentação.
 * Primeiro o terreno: se não passar, não gasta com mercado.
 */
export default function PreViabilidade({ a, e1, e2 }: { a: A; e1: Estudo1; e2: Estudo2 }) {
  const router = useRouter();
  const [f, setF] = useState({
    ...e1,
    alertasTxt: e1.alertas.map((x) => (x.comoResolver ? `${x.texto} → ${x.comoResolver}` : x.texto)).join("\n"),
    estrategiaTxt: e1.estrategia.join("\n"),
  });
  const [m, setM] = useState(e2);
  const [msg, setMsg] = useState("");
  const terreno = e1.status;
  const mercadoLiberado = terreno === "sim";
  const temMercado = !!(e2.veredito || e2.concorrentes.length);

  const estudo1 = (status = f.status): Estudo1 => ({
    ...f,
    status,
    alertas: linhas(f.alertasTxt).map((l) => {
      const [texto, comoResolver = ""] = l.split("→").map((x) => x.trim());
      return { texto, comoResolver };
    }),
    estrategia: linhas(f.estrategiaTxt),
  });
  async function salvar1(status?: Estudo1["status"]) {
    try {
      await chamar(`/api/areas/${a.id}`, "PATCH", { estudo1: estudo1(status) });
      if (status) setF({ ...f, status });
      setMsg("✅ Estudo do terreno salvo.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function central() {
    try {
      await chamar(`/api/areas/${a.id}`, "PATCH", { estudo1: estudo1("pronto") });
      await chamar(`/api/areas/${a.id}/central`, "POST");
      setMsg("📲 Resumo enviado no JBL - Central. A resposta “1” ou “2” no grupo decide o mercadológico.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function salvar2() {
    try {
      await chamar(`/api/areas/${a.id}`, "PATCH", { estudo2: m });
      setMsg("✅ Mercadológico salvo.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  const n = (v: number | null) => (v == null ? "" : String(v));
  const setN = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-2 md:flex-row">
        <Fase n={1} t="Triagem do terreno" sub="Dá para lotear? Quanto sobra?" on={!mercadoLiberado} off={false} />
        <Fase n={2} t="Mercadológico preliminar" sub="Concorrentes, revenda, encaixe" on={mercadoLiberado && !temMercado} off={!mercadoLiberado} />
        <Fase n={3} t="Apresentação" sub="Slides para a reunião" on={temMercado} off={!temMercado} />
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-xl text-navy">🔬 1. Terreno</h3>
          <span className="rounded-sm bg-navy-50 px-2 py-0.5 text-[12px] font-bold text-navy">{STATUS_E1[terreno]}</span>
          {a.relatorio && <a className="text-[13px] font-semibold text-gold-deep underline" href={a.relatorio} target="_blank" rel="noreferrer">abrir o raio-x completo</a>}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label><span className="label">Semáforo</span><select className="input" value={f.semaforo ?? ""} onChange={(e) => setF({ ...f, semaforo: (e.target.value || null) as Estudo1["semaforo"] })}><option value="">—</option>{Object.entries(SEMAFOROS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label><span className="label">Zona</span><input className="input" value={f.zona} onChange={(e) => setF({ ...f, zona: e.target.value })} /></label>
          <label><span className="label">Lote mínimo</span><input className="input" value={f.loteMinimo} onChange={(e) => setF({ ...f, loteMinimo: e.target.value })} /></label>
          <label><span className="label">% aproveitável</span><input className="input" inputMode="decimal" value={n(f.aproveitavelPct)} onChange={(e) => setF({ ...f, aproveitavelPct: setN(e.target.value) })} /></label>
          {(["pior", "medio", "bom"] as const).map((k) => (
            <label key={k}><span className="label">Lotes · {k === "medio" ? "médio" : k}</span><input className="input" inputMode="numeric" value={n(f.lotes[k])} onChange={(e) => setF({ ...f, lotes: { ...f.lotes, [k]: setN(e.target.value) } })} /></label>
          ))}
          <label><span className="label">Produto sugerido</span><input className="input" value={f.produto} onChange={(e) => setF({ ...f, produto: e.target.value })} /></label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label><span className="label">⚠️ Alertas principais (um por linha · “alerta → como resolver”)</span><textarea className="input" rows={5} value={f.alertasTxt} onChange={(e) => setF({ ...f, alertasTxt: e.target.value })} /></label>
          <label><span className="label">🧭 Estratégia da gleba (entrada, frente, forma, fases, vizinho)</span><textarea className="input" rows={5} value={f.estrategiaTxt} onChange={(e) => setF({ ...f, estrategiaTxt: e.target.value })} /></label>
        </div>
        <h4 className="label mt-3">Região</h4>
        <div className="grid gap-3 md:grid-cols-5">
          <label><span className="label">m² vendido · mín (R$)</span><input className="input" inputMode="numeric" value={n(f.regiao.m2Min)} onChange={(e) => setF({ ...f, regiao: { ...f.regiao, m2Min: setN(e.target.value) } })} /></label>
          <label><span className="label">m² vendido · máx (R$)</span><input className="input" inputMode="numeric" value={n(f.regiao.m2Max)} onChange={(e) => setF({ ...f, regiao: { ...f.regiao, m2Max: setN(e.target.value) } })} /></label>
          <label><span className="label">Tipologia em volta</span><input className="input" value={f.regiao.tipologia} onChange={(e) => setF({ ...f, regiao: { ...f.regiao, tipologia: e.target.value } })} /></label>
          <label><span className="label">Expansão urbana</span><input className="input" placeholder="no vetor / neutra / fora" value={f.regiao.expansao} onChange={(e) => setF({ ...f, regiao: { ...f.regiao, expansao: e.target.value } })} /></label>
          <label><span className="label">Cidades em volta</span><input className="input" value={f.regiao.cidades} onChange={(e) => setF({ ...f, regiao: { ...f.regiao, cidades: e.target.value } })} /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={() => salvar1()}>Salvar</button>
          <button className="btn-gold" onClick={central}>📲 Mandar resumo ao JBL - Central</button>
          <button className="btn-ghost" onClick={() => salvar1("sim")}>Sim, fazer mercadológico</button>
          <button className="btn-ghost" onClick={() => salvar1("nao")}>Não, parar no terreno</button>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-navy">Ver o resumo que vai para o grupo</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded border border-line bg-alt p-3 text-[13px]">{resumoCentral(a, estudo1())}</pre>
        </details>
      </section>

      <section className={`card p-5 ${mercadoLiberado || temMercado ? "" : "opacity-60"}`}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-xl text-navy">📊 2. Mercadológico preliminar</h3>
          {!mercadoLiberado && !temMercado && <span className="text-[13px] text-muted">Só depois do “sim” no Central (ou no botão acima).</span>}
          {m.veredito && <span className="rounded-sm bg-gold-soft px-2 py-0.5 text-[12px] font-bold text-gold-ink">{VEREDITOS[m.veredito]}</span>}
        </div>
        {(mercadoLiberado || temMercado) && (
          <div className="mt-4 grid gap-4">
            <h4 className="label">Concorrência em volta</h4>
            <ListaEditavel id={a.id} campo="estudo2" dentro="concorrentes" base={m} linhas={m.concorrentes} colunas={[
              { k: "nome", titulo: "Empreendimento", largura: "22%" }, { k: "distancia", titulo: "Dist." }, { k: "tipo", titulo: "Tipo" }, { k: "lote", titulo: "Lote" },
              { k: "lancamento", titulo: "Lançamento" }, { k: "hoje", titulo: "Hoje" }, { k: "estagio", titulo: "Estágio" }, { k: "vendido", titulo: "Vendido" },
            ]} />
            <h4 className="label">Revenda nos vizinhos</h4>
            <ListaEditavel id={a.id} campo="estudo2" dentro="revenda" base={m} linhas={m.revenda} colunas={[
              { k: "nome", titulo: "Loteamento", largura: "26%" }, { k: "lotes", titulo: "Lotes à venda" }, { k: "variacao", titulo: "Revenda × lançamento" }, { k: "tempo", titulo: "Tempo anunciado" }, { k: "ocupacao", titulo: "Ocupação" },
            ]} />
            <div className="grid gap-3 md:grid-cols-2">
              <label><span className="label">Lacunas (o que ninguém oferece)</span><textarea className="input" rows={3} value={m.lacunas} onChange={(e) => setM({ ...m, lacunas: e.target.value })} /></label>
              <label><span className="label">Produto recomendado</span><textarea className="input" rows={3} value={m.produto} onChange={(e) => setM({ ...m, produto: e.target.value })} /></label>
            </div>
            <h4 className="label">Prévia financeira (margem de erro ±25%)</h4>
            <div className="grid gap-3 md:grid-cols-5">
              {([["vgv", "VGV"], ["infraPorLote", "Infra por lote"], ["margem", "Margem"], ["parteDono", "Parte do proprietário"], ["velocidade", "Venda por mês"]] as const).map(([k, t]) => (
                <label key={k}><span className="label">{t}</span><input className="input" value={m.financeiro[k]} onChange={(e) => setM({ ...m, financeiro: { ...m.financeiro, [k]: e.target.value } })} /></label>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-[220px_1fr]">
              <label><span className="label">Veredito</span><select className="input" value={m.veredito ?? ""} onChange={(e) => setM({ ...m, veredito: (e.target.value || null) as Estudo2["veredito"] })}><option value="">—</option>{Object.entries(VEREDITOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label><span className="label">Principal risco de mercado</span><input className="input" value={m.risco} onChange={(e) => setM({ ...m, risco: e.target.value })} /></label>
            </div>
            <div><button className="btn-gold" onClick={salvar2}>Salvar mercadológico</button></div>
          </div>
        )}
      </section>

      <section className={`card p-5 ${temMercado ? "border-2 border-gold-line" : "opacity-60"}`}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-xl text-navy">🎞 3. Apresentação para a reunião</h3>
          <span className="flex-1" />
          <Link className="btn-gold" href={`/app/captacao-slides/${a.id}`} target="_blank">Apresentar / baixar PDF</Link>
        </div>
        <p className="mt-2 text-[13px] text-muted">9 slides no modelo da JBL, montados com o que está nos dois estudos: capa, quem somos, parceria, a área, o que dá para fazer, mercado, produto, quanto pode render e próximos passos.</p>
      </section>
      <LinkEstudo id={a.id} token={a.estudoToken} temRelatorio={!!a.relatorioCompleto} />
      {msg && <p className="text-sm font-semibold text-navy">{msg}</p>}
    </div>
  );
}
