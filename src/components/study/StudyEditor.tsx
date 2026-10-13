"use client";

import { useMemo, useState } from "react";
import { calcular, type StudyInputs } from "@/lib/calc";
import { fmtBRL, fmtBRL0, fmtM2, fmtNum, fmtPct } from "@/lib/format";

type Kind = "m2" | "pct" | "brl" | "num" | "anos" | "m";
type Field = { key: keyof StudyInputs; label: string; kind: Kind; hint?: string; optional?: boolean };

/** Campos na mesma ordem da aba "Dados do Parcelamento de Solo" */
const GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Área e lotes",
    fields: [
      { key: "areaTotal", label: "Tamanho da área", kind: "m2" },
      { key: "aproveitamento", label: "Aproveitamento", kind: "pct", hint: "Parte que vira lote" },
      { key: "metragemLote", label: "Metragem do lote", kind: "m2" },
      { key: "frenteLote", label: "Frente do lote", kind: "m", hint: "Só para exibir (ex.: 8 × 25)" },
    ],
  },
  {
    title: "Comercialização",
    fields: [
      { key: "valorM2", label: "Valor do m² a comercializar", kind: "brl" },
      { key: "corretorPct", label: "Comissão do corretor", kind: "pct" },
      { key: "entradaPct", label: "Entrada", kind: "pct" },
      { key: "multiplicador", label: "Multiplicador da parcela", kind: "num", hint: "Ex.: 1,68" },
      { key: "anos", label: "Prazo do parcelamento", kind: "anos" },
    ],
  },
  {
    title: "Reajuste",
    fields: [
      { key: "ipca", label: "IPCA ao ano", kind: "pct" },
      { key: "jurosMes", label: "Juros ao mês", kind: "pct" },
      { key: "reajusteManual", label: "Reajuste anual total", kind: "pct", optional: true, hint: "Vazio = IPCA + juros × 12" },
    ],
  },
  {
    title: "Parceria e obras",
    fields: [
      { key: "incorporadorPct", label: "Participação do incorporador", kind: "pct", hint: "Terrenista fica com o restante" },
      { key: "custoInfraM2", label: "Custo da infraestrutura por m²", kind: "brl", hint: "Sobre a área aproveitável" },
    ],
  },
];

const SUFFIX: Record<Kind, string> = { m2: "m²", pct: "%", brl: "", num: "×", anos: "anos", m: "m" };

function toText(v: number | null, kind: Kind) {
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

export function useStudyState(initial: StudyInputs) {
  const [inputs, setInputs] = useState<StudyInputs>(initial);
  const [texts, setTexts] = useState<Record<string, string>>(() => {
    const t: Record<string, string> = {};
    for (const g of GROUPS) for (const f of g.fields) t[f.key] = toText(initial[f.key] as number | null, f.kind);
    return t;
  });
  function set(f: Field, text: string) {
    setTexts((s) => ({ ...s, [f.key]: text }));
    const v = parse(text, f.kind);
    if (v !== null || f.optional) setInputs((s) => ({ ...s, [f.key]: v }));
  }
  return { inputs, texts, set };
}

export default function StudyEditor({ state, compact }: { state: ReturnType<typeof useStudyState>; compact?: boolean }) {
  const { inputs, texts, set } = state;
  const r = useMemo(() => calcular(inputs), [inputs]);
  const invalid = r.jblPct < 0;

  return (
    <div className="grid gap-6">
      {/* Entradas */}
      <div className={`grid gap-x-6 gap-y-5 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        {GROUPS.map((g) => (
          <fieldset key={g.title} className="min-w-0">
            <legend className="mb-2.5 flex w-full items-center gap-2 border-b border-gold-line pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">
              {g.title}
            </legend>
            <div className="grid gap-2.5">
              {g.fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="mb-1 flex items-baseline justify-between gap-2 text-[12.5px] font-semibold text-navy">
                    {f.label}
                    {f.hint && <span className="truncate text-[10.5px] font-normal text-muted">{f.hint}</span>}
                  </span>
                  <span className="relative block">
                    {f.kind === "brl" && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">R$</span>}
                    <input
                      inputMode="decimal"
                      value={texts[f.key] ?? ""}
                      onChange={(e) => set(f, e.target.value)}
                      placeholder={f.optional ? fmtPct(r.reajusteCalculado) : ""}
                      className={`input tabular py-1.5 text-right ${f.kind === "brl" ? "pl-9" : ""} pr-12`}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">{SUFFIX[f.kind]}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Resultados ao vivo */}
      <div className="rounded-md border border-line bg-alt">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div className="eyebrow">Resultado do estudo</div>
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> calculando ao vivo
          </span>
        </div>

        <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-3 xl:grid-cols-6">
          {[
            ["Área aproveitável", fmtM2(r.areaUtil), `${fmtNum(r.areaDoacao, 0)} m² de vias e doação`],
            ["Lotes", fmtNum(r.lotes, 2), `${r.lotesInteiros} lotes inteiros · ${fmtNum(r.inputs.frenteLote, 0)} × ${fmtNum(r.fundoLote, 1)} m`],
            ["Valor do lote", fmtBRL0(r.valorLote), `Entrada ${fmtBRL0(r.entrada)}`],
            ["VGV à vista", fmtBRL0(r.vgvAvista), `${fmtBRL0(r.vgvAvistaLiq)} sem comissão`],
            ["Custo das obras", fmtBRL0(r.custoInfra), `${fmtM2(r.areaUtil, 0)} × ${fmtBRL(r.inputs.custoInfraM2)}`],
            [`VGV global · ${r.nParcelas} meses`, fmtBRL0(r.principal.carteiraEmp), `Reajuste de ${fmtPct(r.reajuste)} ao ano`],
          ].map(([k, v, d]) => (
            <div key={k} className="min-w-0 bg-white px-4 py-3.5">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{k}</div>
              <div className="tabular mt-1 truncate font-display text-[22px] leading-tight text-navy">{v}</div>
              <div className="mt-0.5 truncate text-[11.5px] text-muted">{d}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,320px)_1fr]">
          <div>
            <div className="mb-2 text-[12.5px] font-semibold text-navy">Divisão da parceria (sobre o VGV à vista)</div>
            <div className="flex h-9 overflow-hidden rounded text-[11.5px] font-bold">
              <div className="grid place-items-center bg-gold text-navy" style={{ width: `${Math.max(r.terrenistaPct, 0) * 100}%` }}>{fmtPct(r.terrenistaPct, 0)}</div>
              <div className="grid place-items-center bg-navy text-white" style={{ width: `${Math.max(r.jblPct, 0) * 100}%` }}>{fmtPct(r.jblPct, 0)}</div>
              <div className="grid place-items-center bg-[#C9D3DE] text-navy" style={{ width: `${Math.max(r.infraPct, 0) * 100}%` }}>{fmtPct(r.infraPct, 0)}</div>
            </div>
            <dl className="mt-3 grid gap-1.5 text-[13px]">
              {[
                ["bg-gold", "Proprietários", r.vgvAvistaTer],
                ["bg-navy", "JBL Incorporadora", r.vgvAvista * r.jblPct],
                ["bg-[#C9D3DE]", "Infraestrutura", r.custoInfra],
              ].map(([c, k, v]) => (
                <div key={k as string} className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-sm ${c}`} />
                  <dt className="flex-1 text-ink">{k}</dt>
                  <dd className="tabular font-semibold text-navy">{fmtBRL0(v as number)}</dd>
                </div>
              ))}
            </dl>
            {invalid && (
              <p className="mt-3 rounded border-l-[3px] border-rose-500 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">
                O custo das obras passa da parte do incorporador. Revise o custo por m² ou a participação.
              </p>
            )}
          </div>

          <div className="min-w-0 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[10.5px] uppercase tracking-[0.08em] text-muted">
                  <th className="pb-2 font-bold">Prazo</th>
                  <th className="pb-2 text-right font-bold">Parcela do cliente</th>
                  <th className="pb-2 text-right font-bold">Proprietários / mês (1º ano)</th>
                  <th className="pb-2 text-right font-bold">Proprietários / mês (último ano)</th>
                  <th className="pb-2 text-right font-bold">Proprietários · total</th>
                  <th className="pb-2 text-right font-bold">Empreendimento · total</th>
                </tr>
              </thead>
              <tbody className="tabular">
                <tr className="border-t border-line">
                  <td className="py-1.5 font-semibold text-navy">À vista</td>
                  <td className="text-right text-muted">—</td>
                  <td className="text-right text-muted">—</td>
                  <td className="text-right text-muted">—</td>
                  <td className="text-right">{fmtBRL0(r.vgvAvistaTer)}</td>
                  <td className="text-right">{fmtBRL0(r.vgvAvista)}</td>
                </tr>
                {r.cenarios.map((c) => (
                  <tr key={c.meses} className={`border-t border-line ${c.meses === r.nParcelas ? "bg-gold-soft" : ""}`}>
                    <td className="py-1.5 font-semibold text-navy">
                      {fmtNum(c.meses / 12, c.meses % 12 ? 1 : 0)} anos <span className="font-normal text-muted">· {c.meses}x</span>
                    </td>
                    <td className="text-right">{fmtBRL(c.parcela)}</td>
                    <td className="text-right">{fmtBRL0(c.mensalTer)}</td>
                    <td className="text-right">{fmtBRL0(c.mensalTerFinal)}</td>
                    <td className="text-right font-semibold text-navy">{fmtBRL0(c.carteiraTer)}</td>
                    <td className="text-right">{fmtBRL0(c.carteiraEmp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
