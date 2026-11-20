"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { atualizarOriginais, resumoCentral, SEMAFOROS, STATUS_E1, VEREDITOS, type Estudo1, type Estudo2 } from "@/lib/captacao-estudos";
import { chamar } from "./chamar";
import ListaEditavel from "./ListaEditavel";
import LinkEstudo from "./LinkEstudo";

type A = { id: string; cidade: string; dono: string | null; corretor: string | null; nome: string; hectares: number | null; relatorio: string | null; estudoToken: string | null; relatorioCompleto: unknown; relatorioMercado: unknown };

const Fase = ({ n, t, sub, on, off }: { n: number; t: string; sub: string; on: boolean; off: boolean }) => (
  <div className={`flex-1 rounded-md border-2 px-4 py-3 ${on ? "border-gold bg-gold-soft" : off ? "border-line bg-alt opacity-60" : "border-navy-50 bg-white"}`}>
    <b className="text-navy">{n}. {t}</b>
    <div className="text-[12.5px] text-muted">{sub}</div>
  </div>
);
const linhas = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

/**
 * Campo da viabilidade (pedido 20/11/2026): caixa que mostra o texto inteiro (cresce com o conteúdo) e, se o
 * texto foi mudado à mão, "↩ Voltar ao original" embaixo.
 */
function Campo({ label, value, onChange, original, opcoes, placeholder, numero }: { label: string; value: string; onChange: (v: string) => void; original?: string; opcoes?: [string, string][]; placeholder?: string; numero?: boolean }) {
  const mudou = original !== undefined && original !== value;
  const rows = Math.min(8, Math.max(numero ? 1 : 2, Math.ceil(value.length / 38), value.split("\n").length));
  return (
    <label className="block">
      <span className="label">{label}</span>
      {opcoes ? (
        <select className="input text-[15px]" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {opcoes.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      ) : numero ? (
        <input className="input text-[15px]" inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <textarea className="input resize-y text-[15px] leading-snug" rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {mudou && (
        <button type="button" className="mt-1 text-[12.5px] font-semibold text-gold-deep hover:underline" title={`Original: ${original}`} onClick={(e) => { e.preventDefault(); onChange(original!); }}>
          ↩ Voltar ao original
        </button>
      )}
    </label>
  );
}

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

  // como estava salvo (função: plano1 é declarado mais abaixo)
  const salvo1 = () => plano1({ ...e1, alertasTxt: e1.alertas.map((x) => (x.comoResolver ? `${x.texto} → ${x.comoResolver}` : x.texto)).join("\n"), estrategiaTxt: e1.estrategia.join("\n") });
  const estudo1 = (status = f.status): Estudo1 => ({
    ...f,
    status,
    originais: atualizarOriginais(salvo1(), plano1(f), f.originais),
    alertas: linhas(f.alertasTxt).map((l) => {
      const [texto, comoResolver = ""] = l.split("→").map((x) => x.trim());
      return { texto, comoResolver };
    }),
    estrategia: linhas(f.estrategiaTxt),
  });
  async function salvar1(status?: Estudo1["status"]) {
    try {
      const novo = estudo1(status);
      await chamar(`/api/areas/${a.id}`, "PATCH", { estudo1: novo });
      setF({ ...f, status: novo.status, originais: novo.originais });
      setMsg("✅ Viabilidade Legal salva.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function central() {
    try {
      await chamar(`/api/areas/${a.id}`, "PATCH", { estudo1: estudo1("pronto") });
      await chamar(`/api/areas/${a.id}/central`, "POST");
      setMsg("📲 Resumo enviado no JBL - Central. A resposta “1” ou “2” no grupo decide a Viabilidade Mercadológica.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function salvar2() {
    try {
      const originais = atualizarOriginais(plano2(e2), plano2(m), m.originais);
      await chamar(`/api/areas/${a.id}`, "PATCH", { estudo2: { ...m, originais } });
      setM({ ...m, originais });
      setMsg("✅ Viabilidade Mercadológica salva.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  const n = (v: number | null) => (v == null ? "" : String(v));
  const setN = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  type F = typeof f;
  // os campos como texto, para comparar com o original
  const plano1 = (x: F): Record<string, string> => ({
    semaforo: x.semaforo ?? "", zona: x.zona, loteMinimo: x.loteMinimo, aproveitavelPct: n(x.aproveitavelPct),
    "lotes.pior": n(x.lotes.pior), "lotes.medio": n(x.lotes.medio), "lotes.bom": n(x.lotes.bom), produto: x.produto,
    alertasTxt: x.alertasTxt, estrategiaTxt: x.estrategiaTxt,
    "regiao.m2Min": n(x.regiao.m2Min), "regiao.m2Max": n(x.regiao.m2Max), "regiao.tipologia": x.regiao.tipologia, "regiao.expansao": x.regiao.expansao, "regiao.cidades": x.regiao.cidades,
  });
  const plano2 = (x: Estudo2): Record<string, string> => ({
    lacunas: x.lacunas, produto: x.produto, veredito: x.veredito ?? "", risco: x.risco,
    "financeiro.vgv": x.financeiro.vgv, "financeiro.infraPorLote": x.financeiro.infraPorLote, "financeiro.margem": x.financeiro.margem, "financeiro.parteDono": x.financeiro.parteDono, "financeiro.velocidade": x.financeiro.velocidade,
  });
  const v1 = plano1(f);
  const v2 = plano2(m);
  const set1 = (k: string, v: string) => {
    const [a1, b1] = k.split(".");
    if (a1 === "lotes") return setF({ ...f, lotes: { ...f.lotes, [b1]: setN(v) } });
    if (a1 === "regiao") return setF({ ...f, regiao: { ...f.regiao, [b1]: b1.startsWith("m2") ? setN(v) : v } });
    if (k === "aproveitavelPct") return setF({ ...f, aproveitavelPct: setN(v) });
    if (k === "semaforo") return setF({ ...f, semaforo: (v || null) as Estudo1["semaforo"] });
    setF({ ...f, [k]: v });
  };
  const set2 = (k: string, v: string) => {
    const [a2, b2] = k.split(".");
    if (a2 === "financeiro") return setM({ ...m, financeiro: { ...m.financeiro, [b2]: v } });
    if (k === "veredito") return setM({ ...m, veredito: (v || null) as Estudo2["veredito"] });
    setM({ ...m, [k]: v });
  };
  const c1 = (k: string, label: string, extra: Partial<Parameters<typeof Campo>[0]> = {}) => <Campo key={k} label={label} value={v1[k]} onChange={(v) => set1(k, v)} original={f.originais[k]} {...extra} />;
  const c2 = (k: string, label: string, extra: Partial<Parameters<typeof Campo>[0]> = {}) => <Campo key={k} label={label} value={v2[k]} onChange={(v) => set2(k, v)} original={m.originais[k]} {...extra} />;

  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-2 md:flex-row">
        <Fase n={1} t="Viabilidade Legal" sub="Dá para lotear? Quanto sobra?" on={!mercadoLiberado} off={false} />
        <Fase n={2} t="Viabilidade Mercadológica" sub="Concorrentes, revenda, encaixe" on={mercadoLiberado && !temMercado} off={!mercadoLiberado} />
        <Fase n={3} t="Apresentação" sub="Slides para a reunião" on={temMercado} off={!temMercado} />
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-xl text-navy">🔬 1. Viabilidade Legal</h3>
          <span className="rounded-sm bg-navy-50 px-2 py-0.5 text-[12px] font-bold text-navy">{STATUS_E1[terreno]}</span>
          <span className="flex-1" />
          {/* abre sempre dentro da área, nunca no Claude Artifact (pedido 20/11/2026) */}
          {!!a.relatorioCompleto && <a className="btn-navy px-5 py-2.5 text-[15px]" href="?aba=estudo">📄 Abrir a Viabilidade Legal completa</a>}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {c1("semaforo", "Semáforo", { opcoes: Object.entries(SEMAFOROS) })}
          {c1("zona", "Zona")}
          {c1("loteMinimo", "Lote mínimo")}
          {c1("aproveitavelPct", "% aproveitável", { numero: true })}
          {c1("lotes.pior", "Lotes · pior", { numero: true })}
          {c1("lotes.medio", "Lotes · médio", { numero: true })}
          {c1("lotes.bom", "Lotes · bom", { numero: true })}
          <div className="md:col-span-2">{c1("produto", "Produto sugerido")}</div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {c1("alertasTxt", "⚠️ Alertas principais (um por linha · “alerta → como resolver”)")}
          {c1("estrategiaTxt", "🧭 Estratégia da gleba (entrada, frente, forma, fases, vizinho)")}
        </div>
        <h4 className="label mt-4">Região</h4>
        <div className="grid gap-4 md:grid-cols-3">
          {c1("regiao.m2Min", "m² vendido · mín (R$)", { numero: true })}
          {c1("regiao.m2Max", "m² vendido · máx (R$)", { numero: true })}
          {c1("regiao.expansao", "Expansão urbana", { placeholder: "no vetor / neutra / fora" })}
          <div className="md:col-span-2">{c1("regiao.tipologia", "Tipologia em volta")}</div>
          {c1("regiao.cidades", "Cidades em volta")}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn-ghost" onClick={() => salvar1()}>Salvar</button>
          <button className="btn-ghost" onClick={central}>📲 Mandar resumo ao JBL - Central</button>
          {/* o botão que leva à próxima etapa fica sempre em destaque (pedido 20/11/2026) */}
          <button className={terreno === "sim" ? "btn-ghost" : "btn-gold"} onClick={() => salvar1("sim")}>Sim, fazer a Viabilidade Mercadológica</button>
          <button className="btn-ghost" onClick={() => salvar1("nao")}>Não, parar na Viabilidade Legal</button>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-[13px] font-semibold text-navy">Ver o resumo que vai para o grupo</summary>
          <pre className="mt-2 whitespace-pre-wrap rounded border border-line bg-alt p-3 text-[13px]">{resumoCentral(a, estudo1())}</pre>
        </details>
      </section>

      <section className={`card p-5 ${mercadoLiberado || temMercado ? "" : "opacity-60"}`}>
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-xl text-navy">📊 2. Viabilidade Mercadológica</h3>
          {!mercadoLiberado && !temMercado && <span className="text-[13px] text-muted">Só depois do “sim” no Central (ou no botão acima).</span>}
          {m.veredito && <span className="rounded-sm bg-gold-soft px-2 py-0.5 text-[12px] font-bold text-gold-ink">{VEREDITOS[m.veredito]}</span>}
          <span className="flex-1" />
          {!!a.relatorioMercado && <a className="btn-navy px-5 py-2.5 text-[15px]" href="?aba=estudo#estudo-2">📄 Abrir a Viabilidade Mercadológica</a>}
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
            <div className="grid gap-4 md:grid-cols-2">
              {c2("lacunas", "Lacunas (o que ninguém oferece)")}
              {c2("produto", "Produto recomendado")}
            </div>
            <h4 className="label">Prévia financeira (margem de erro ±25%)</h4>
            <div className="grid gap-4 md:grid-cols-3">
              {c2("financeiro.vgv", "VGV")}
              {c2("financeiro.infraPorLote", "Infra por lote")}
              {c2("financeiro.margem", "Margem")}
              {c2("financeiro.parteDono", "Parte do proprietário")}
              {c2("financeiro.velocidade", "Venda por mês")}
              {c2("veredito", "Veredito", { opcoes: Object.entries(VEREDITOS) })}
            </div>
            {c2("risco", "Principal risco de mercado")}
            <div><button className="btn-gold" onClick={salvar2}>Salvar a Viabilidade Mercadológica</button></div>
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
      <LinkEstudo id={a.id} token={a.estudoToken} temRelatorio={!!a.relatorioCompleto} temMercado={!!a.relatorioMercado} />
      {msg && <p className="text-sm font-semibold text-navy">{msg}</p>}
    </div>
  );
}
