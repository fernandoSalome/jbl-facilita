"use client";

import { useMemo, useState } from "react";
import { calcular, INDICES, type StudyInputs } from "@/lib/calc";
import { fmtBRL, fmtBRL0, fmtNum, fmtPct } from "@/lib/format";

/**
 * Formulário no mesmo layout da aba "Dados do Parcelamento de Solo" da planilha:
 * as células azuis são as que se digita; as brancas o sistema calcula na hora.
 */

type Kind = "m2" | "pct" | "brl" | "num" | "anos" | "m" | "lotes";
type NumKey = { [K in keyof StudyInputs]: StudyInputs[K] extends number | null ? K : never }[keyof StudyInputs];

const SUFFIX: Record<Kind, string> = { m2: "m²", pct: "%", brl: "", num: "×", anos: "anos", m: "m", lotes: "lotes" };
const OPTIONAL: NumKey[] = ["extensaoRede", "lotesEtapa1", "reajusteManual"];

function toText(v: number | null | undefined, kind: Kind) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const n = kind === "pct" ? v * 100 : v;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: kind === "pct" ? 4 : 6 });
}

function parse(text: string, kind: Kind): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n)) return null;
  return kind === "pct" ? n / 100 : n;
}

const KINDS: Partial<Record<NumKey, Kind>> = {
  areaTotal: "m2", aproveitamento: "pct", metragemLote: "m2", incorporadorPct: "pct", valorM2: "brl", corretorPct: "pct",
  ipca: "pct", jurosAno: "pct", jurosMes: "pct", valorArea: "brl", entradaPct: "pct", multiplicador: "num", anos: "anos",
  entradaIncTerPct: "pct", parcelaEntregaPct: "pct", balaoPct: "pct", frenteLote: "m", custoInfraM2: "brl", extensaoRede: "m",
  lotesEtapa1: "lotes", desagio: "pct", taxaAplicacao: "pct", reajusteManual: "pct",
};

export function useStudyState(initial: StudyInputs) {
  const [inputs, setInputs] = useState<StudyInputs>(initial);
  const [texts, setTexts] = useState<Record<string, string>>(() => {
    const t: Record<string, string> = {};
    for (const [k, kind] of Object.entries(KINDS)) t[k] = toText(initial[k as NumKey] as number | null, kind as Kind);
    return t;
  });
  function set(key: NumKey, text: string) {
    const kind = KINDS[key]!;
    setTexts((s) => ({ ...s, [key]: text }));
    const v = parse(text, kind);
    if (v !== null || OPTIONAL.includes(key)) setInputs((s) => ({ ...s, [key]: v }));
  }
  function setIndice(v: string) {
    setInputs((s) => ({ ...s, indice: v }));
  }
  function clearManual() {
    setTexts((s) => ({ ...s, reajusteManual: "" }));
    setInputs((s) => ({ ...s, reajusteManual: null }));
  }
  return { inputs, texts, set, setIndice, clearManual };
}

type State = ReturnType<typeof useStudyState>;

/* ---------- peças no visual da planilha ---------- */

function Box({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-sm border border-gold/70 bg-white">
      <div className="flex items-center justify-between bg-navy px-3 py-1.5 text-[12.5px] font-bold text-white">
        <span>{title}</span>
        {right && <span>{right}</span>}
      </div>
      <div className="divide-y divide-gold/30">{children}</div>
    </div>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <div className="bg-navy/90 px-3 py-1 text-center text-[12px] font-bold text-white">{children}</div>;
}

function In({ s, k, label, hint }: { s: State; k: NumKey; label: string; hint?: string }) {
  const kind = KINDS[k]!;
  return (
    <label className="grid grid-cols-[1fr_minmax(118px,46%)] items-center gap-2 px-3 py-1" title={hint}>
      <span className="text-[13px] font-semibold text-navy">
        {label}
        {hint && <span className="ml-1 cursor-help text-[11px] font-normal text-muted">ⓘ</span>}
      </span>
      <span className="relative">
        {kind === "brl" && <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-navy/60">R$</span>}
        <input
          inputMode="decimal"
          value={s.texts[k] ?? ""}
          onChange={(e) => s.set(k, e.target.value)}
          placeholder={OPTIONAL.includes(k) ? "opcional" : ""}
          className={`tabular w-full rounded-sm border border-[#9DC3E6] bg-[#DDEBF7] py-1 text-right text-[13.5px] font-semibold text-navy outline-none transition placeholder:font-normal placeholder:text-navy/35 focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold-soft ${kind === "brl" ? "pl-8" : "pl-2"} ${SUFFIX[kind] ? "pr-10" : "pr-2"}`}
        />
        {SUFFIX[kind] && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-navy/60">{SUFFIX[kind]}</span>}
      </span>
    </label>
  );
}

function Out({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_minmax(118px,46%)] items-center gap-2 px-3 py-1">
      <span className="text-[13px] font-semibold text-navy">{label}</span>
      <span className={`tabular px-2 py-1 text-right text-[13.5px] ${strong ? "font-bold text-navy" : "text-ink"}`}>{value}</span>
    </div>
  );
}

export default function StudyEditor({ state, compact }: { state: State; compact?: boolean }) {
  const s = state;
  const r = useMemo(() => calcular(s.inputs), [s.inputs]);
  const i = r.inputs;
  const p2 = r.plano02;
  const invalid = r.jblPct < 0;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-[#9DC3E6] bg-[#DDEBF7]" /> campos para preencher (as células azuis da planilha)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-line bg-white" /> calculado automaticamente</span>
        <span className="ml-auto flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> calculando ao vivo</span>
      </div>

      <div className={`grid gap-4 ${compact ? "lg:grid-cols-3" : "lg:grid-cols-3"}`}>
        {/* coluna 1 */}
        <div className="grid content-start gap-4">
          <Box title="Dados do Parcelamento de Solo" right="Dados">
            <In s={s} k="areaTotal" label="Tamanho da Área (m²)" />
            <In s={s} k="aproveitamento" label="Aproveitamento %" />
            <Out label="Área Útil (m²)" value={fmtNum(r.areaUtil)} />
            <Out label="Doação de Área + Vias (m²)" value={fmtNum(r.areaDoacao)} />
            <In s={s} k="metragemLote" label="Metragem do Lote (m²)" />
            <Out label="Total de Lotes" value={fmtNum(r.lotes, 3)} strong />
          </Box>
          <Box title="Parceria do Parcelamento de Solo">
            <In s={s} k="incorporadorPct" label="Incorporador (%)" />
            <Out label="Terrenista (%)" value={fmtPct(r.terrenistaPct)} strong />
          </Box>
        </div>

        {/* coluna 2 */}
        <div className="grid content-start gap-4">
          <Box title="Comercialização do Parcelamento de Solo" right="Valor M²">
            <In s={s} k="valorM2" label="Valor do m² a ser Comercializado" />
          </Box>
          <Box title="Comissionamento" right="Valor">
            <In s={s} k="corretorPct" label="Corretor (%)" />
            <Out label="Valor" value={fmtBRL(r.comissao)} />
          </Box>
          <Box title="Reajuste" right="Dados">
            <label className="grid grid-cols-[1fr_minmax(118px,46%)] items-center gap-2 px-3 py-1">
              <span className="text-[13px] font-semibold text-navy">Índice Financeiro</span>
              <select
                value={i.indice}
                onChange={(e) => s.setIndice(e.target.value)}
                className="rounded-sm border border-[#9DC3E6] bg-[#DDEBF7] py-1 pl-2 text-[13.5px] font-semibold text-navy outline-none focus:border-gold"
              >
                {INDICES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <In s={s} k="ipca" label={`${i.indice} ao ano`} />
            <In s={s} k="jurosAno" label="Juros (Ano)" />
            <In s={s} k="jurosMes" label="Juros (Mês)" />
            <Out label="Total do Reajuste" value={fmtPct(r.reajusteCalculado)} strong />
            {i.reajusteManual !== null && (
              <div className="bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                Esta proposta usa um reajuste fixo de <b>{fmtPct(i.reajusteManual)}</b> (como no PDF de jan/2026), no lugar da fórmula.{" "}
                <button type="button" onClick={s.clearManual} className="font-semibold text-gold-deep underline">Usar a fórmula da planilha</button>
              </div>
            )}
          </Box>
          <Box title="Valor da Área" right="Valor">
            <In s={s} k="valorArea" label="Valor" />
          </Box>
        </div>

        {/* coluna 3 */}
        <div className="grid content-start gap-4">
          <Box title="Condição de Venda" right="Dados">
            <Sub>À Vista</Sub>
            <Out label="Valor do Lote a ser Comercializado" value={fmtBRL(r.valorLote)} strong />
            <Sub>Parcelado</Sub>
            <In s={s} k="entradaPct" label="Entrada (%)" />
            <Out label="Valor da Entrada" value={fmtBRL(r.entrada)} />
            <Out label="Entrada parte Corretor" value={fmtBRL(r.entradaCorretor)} />
            <Out label="Entrada parte Incorporador" value={fmtBRL(r.entradaInc)} />
            <Out label="Entrada parte Terrenista" value={fmtBRL(r.entradaTer)} />
            <In s={s} k="multiplicador" label="Multiplicador para encontrar a Parcela" />
            <In s={s} k="anos" label="Em quantos Anos ocorrerá o Parcelamento" />
            <Out label="Número de Parcelas" value={String(r.nParcelas)} />
            <Out label="Valor da Parcela a ser Comercializada" value={fmtBRL(r.parcela)} strong />
            <Out label="Valor do Lote em Contrato" value={fmtBRL(r.valorLoteContrato)} />
          </Box>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* Plano de Venda 02 */}
        <div className="overflow-hidden rounded-sm border border-gold/70 bg-white">
          <div className="bg-navy px-3 py-1.5 text-center text-[12.5px] font-bold text-white">Plano de Venda 02</div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-navy/90 text-[12px] text-white">
                <th className="px-3 py-1 text-left font-bold" />
                <th className="px-2 py-1 font-bold">Dados</th>
                <th className="px-2 py-1 font-bold">%</th>
                <th className="px-2 py-1 font-bold">Incorporador</th>
                <th className="px-2 py-1 font-bold">Terrenista</th>
              </tr>
            </thead>
            <tbody className="tabular divide-y divide-gold/30">
              {(
                [
                  ["Valor do Lote", p2.lote, null],
                  ["Corretagem", p2.corretagem, null],
                  ["Entrada Inc/Ter", p2.entrada, "entradaIncTerPct"],
                  ["Parcela até entrega", p2.parcelaEntrega, "parcelaEntregaPct"],
                  ["Balão entrega do Emp.", p2.balao, "balaoPct"],
                  ["Valor Remanescente", p2.remanescente, null],
                ] as [string, { total: number; inc: number; ter: number; pct: number }, NumKey | null][]
              ).map(([label, row, key]) => (
                <tr key={label}>
                  <td className="px-3 py-1 font-semibold text-navy">{label}</td>
                  <td className="px-2 py-1 text-right">{fmtBRL(row.total)}</td>
                  <td className="w-[104px] px-2 py-1 text-right">
                    {key ? (
                      <span className="relative block">
                        <input
                          inputMode="decimal"
                          value={s.texts[key] ?? ""}
                          onChange={(e) => s.set(key, e.target.value)}
                          className="w-full rounded-sm border border-[#9DC3E6] bg-[#DDEBF7] py-0.5 pl-2 pr-6 text-right font-semibold text-navy outline-none focus:border-gold focus:bg-white"
                        />
                        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-navy/60">%</span>
                      </span>
                    ) : (
                      fmtPct(row.pct)
                    )}
                  </td>
                  <td className="px-2 py-1 text-right">{fmtBRL(row.inc)}</td>
                  <td className="px-2 py-1 text-right">{fmtBRL(row.ter)}</td>
                </tr>
              ))}
              <tr className="bg-alt">
                <td className="px-3 py-1 font-semibold text-navy">Valor da Parcela</td>
                <td className="px-2 py-1 text-right">{fmtBRL(p2.parcelaRemanescente.total)}</td>
                <td />
                <td className="px-2 py-1 text-right">{fmtBRL(p2.parcelaRemanescente.inc)}</td>
                <td className="px-2 py-1 text-right">{fmtBRL(p2.parcelaRemanescente.ter)}</td>
              </tr>
              <tr className="bg-alt">
                <td className="px-3 py-1 font-semibold text-navy">Valor do Lote (Total Parcela)</td>
                <td className="px-2 py-1 text-right">{fmtBRL(p2.valorFinalLote.total)}</td>
                <td />
                <td className="px-2 py-1 text-right">{fmtBRL(p2.valorFinalLote.inc)}</td>
                <td className="px-2 py-1 text-right">{fmtBRL(p2.valorFinalLote.ter)}</td>
              </tr>
              <tr className="bg-gold-soft font-semibold text-navy">
                <td className="px-3 py-1">Total da Carteira</td>
                <td className="px-2 py-1 text-right">{fmtBRL0(p2.totalCarteira.total)}</td>
                <td />
                <td className="px-2 py-1 text-right">{fmtBRL0(p2.totalCarteira.inc)}</td>
                <td className="px-2 py-1 text-right">{fmtBRL0(p2.totalCarteira.ter)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Dados que a planilha não tem, usados no site da proposta */}
        <Box title="Para o site da proposta" right="não está na planilha">
          <In s={s} k="frenteLote" label="Frente do lote" hint="Só para escrever “lotes de 8 × 25 metros”" />
          <In s={s} k="custoInfraM2" label="Custo da infraestrutura por m²" hint="Multiplica a área aproveitável" />
          <Out label="Custo das obras" value={fmtBRL(r.custoInfra)} strong />
          <In s={s} k="extensaoRede" label="Extensão da rede principal" hint="Vazio = estimativa pela área (base: São Judas Tadeu II)" />
          <In s={s} k="lotesEtapa1" label="Lotes da primeira etapa" hint="Vazio = primeira etapa “a definir”" />
          <In s={s} k="desagio" label="Deságio da antecipação" />
          <In s={s} k="taxaAplicacao" label="Aplicação simulada ao mês" />
        </Box>
      </div>

      {/* Outros períodos */}
      <div className="overflow-hidden rounded-sm border border-gold/70 bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-navy text-[12px] text-white">
              <th colSpan={2} className="px-3 py-1.5 text-left font-bold">Outros Períodos de Parcelamento</th>
              <th colSpan={3} className="border-l border-white/20 px-2 py-1.5 font-bold">Arrecadação Mensal (Primeiros 12 meses)</th>
              <th colSpan={3} className="border-l border-white/20 px-2 py-1.5 font-bold">Arrecadação Carteira</th>
            </tr>
            <tr className="bg-navy/90 text-[11.5px] text-white">
              <th className="px-3 py-1 text-left font-bold">Número de Parcelas</th>
              <th className="px-2 py-1 text-right font-bold">Valor da Parcela</th>
              <th className="border-l border-white/20 px-2 py-1 text-right font-bold">Empreendimento</th>
              <th className="px-2 py-1 text-right font-bold">Incorporador</th>
              <th className="px-2 py-1 text-right font-bold">Terrenista</th>
              <th className="border-l border-white/20 px-2 py-1 text-right font-bold">Empreendimento</th>
              <th className="px-2 py-1 text-right font-bold">Incorporador</th>
              <th className="px-2 py-1 text-right font-bold">Terrenista</th>
            </tr>
          </thead>
          <tbody className="tabular divide-y divide-gold/30">
            {r.cenarios.map((c) => (
              <tr key={c.meses} className={c.meses === r.nParcelas ? "bg-gold-soft font-semibold" : ""}>
                <td className="px-3 py-1 font-semibold text-navy">Em {fmtNum(c.meses / 12, c.meses % 12 ? 1 : 0)} anos ({c.meses} Parcelas)</td>
                <td className="px-2 py-1 text-right">{fmtBRL(c.parcela)}</td>
                <td className="border-l border-gold/30 px-2 py-1 text-right">{fmtBRL(c.mensalEmp)}</td>
                <td className="px-2 py-1 text-right">{fmtBRL(c.mensalInc)}</td>
                <td className="px-2 py-1 text-right">{fmtBRL(c.mensalTer)}</td>
                <td className="border-l border-gold/30 px-2 py-1 text-right">{fmtBRL0(c.carteiraEmp)}</td>
                <td className="px-2 py-1 text-right">{fmtBRL0(c.carteiraInc)}</td>
                <td className="px-2 py-1 text-right font-semibold text-navy">{fmtBRL0(c.carteiraTer)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo da proposta */}
      <div className="grid gap-4 rounded-md border border-line bg-alt p-4 md:grid-cols-[minmax(0,340px)_1fr]">
        <div>
          <div className="mb-2 text-[12.5px] font-semibold text-navy">Divisão na proposta (sobre o VGV à vista)</div>
          <div className="flex h-9 overflow-hidden rounded text-[11.5px] font-bold">
            <div className="grid place-items-center bg-gold text-navy" style={{ width: `${Math.max(r.terrenistaPct, 0) * 100}%` }}>{fmtPct(r.terrenistaPct, 0)}</div>
            <div className="grid place-items-center bg-navy text-white" style={{ width: `${Math.max(r.jblPct, 0) * 100}%` }}>{fmtPct(r.jblPct, 0)}</div>
            <div className="grid place-items-center bg-[#C9D3DE] text-navy" style={{ width: `${Math.max(r.infraPct, 0) * 100}%` }}>{fmtPct(r.infraPct, 0)}</div>
          </div>
          <div className="mt-1.5 flex justify-between text-[11.5px] text-muted"><span>Proprietários</span><span>JBL</span><span>Obras</span></div>
          {invalid && <p className="mt-2 rounded border-l-[3px] border-rose-500 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">O custo das obras passa da parte do incorporador.</p>}
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line lg:grid-cols-4">
          {[
            ["VGV à vista", fmtBRL0(r.vgvAvista)],
            [`VGV global · ${r.nParcelas} meses`, fmtBRL0(r.principal.carteiraEmp)],
            ["Proprietários à vista", fmtBRL0(r.vgvAvistaTer)],
            [`Proprietários · ${r.nParcelas} meses`, fmtBRL0(r.principal.carteiraTer)],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-3 py-2.5">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted">{k}</div>
              <div className="tabular font-display text-[19px] text-navy">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
