"use client";

import { useMemo, useRef, useState } from "react";
import { calcular, INDICES, type StudyInputs } from "@/lib/calc";
import { fmtBRL, fmtBRL0, fmtNum, fmtPct } from "@/lib/format";

/**
 * Formulário no mesmo layout da aba "Dados do Parcelamento de Solo" da planilha:
 * as células azuis são as que se digita; as brancas o sistema calcula na hora.
 */

type Kind = "m2" | "pct" | "brl" | "num" | "anos" | "m" | "lotes" | "ruas";
type NumKey = { [K in keyof StudyInputs]-?: StudyInputs[K] extends number | null ? K : never }[keyof StudyInputs];

const SUFFIX: Record<Kind, string> = { m2: "m²", pct: "%", brl: "R$", num: "×", anos: "anos", m: "m", lotes: "lotes", ruas: "ruas" };
const OPTIONAL: NumKey[] = ["extensaoRede", "lotesEtapa1", "areaEtapa1", "loteEtapa1", "valorM2Etapa1", "areaPerimetralE1", "ruaE1", "descontoE1", "ruasObrigE1", "compQuadraE1", "frenteE1", "reajusteManual"];

function toText(v: number | null | undefined, kind: Kind) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const n = kind === "pct" ? v * 100 : v;
  return n.toLocaleString("pt-BR", kind === "brl" ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 2 });
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
  lotesEtapa1: "lotes", areaEtapa1: "m2", loteEtapa1: "m2", valorM2Etapa1: "brl", areaPerimetralE1: "m", ruaE1: "m", descontoE1: "m", ruasObrigE1: "ruas", compQuadraE1: "m", frenteE1: "m", desagio: "pct", taxaAplicacao: "pct", reajusteManual: "pct",
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
  /** Liga/desliga a primeira etapa (desmembramento) */
  function setEtapa(on: boolean) {
    // desligada, a quantidade de lotes some (senão a proposta voltaria com a etapa ligada)
    if (!on) setTexts((s) => ({ ...s, lotesEtapa1: "" }));
    setInputs((s) => ({ ...s, primeiraEtapa: on, ...(on ? { etapaADefinir: false } : { lotesEtapa1: null }) }));
  }
  /** Primeira etapa existente, mas sem os números ainda: a proposta mostra "a definir". Um ou outro. */
  function setEtapaADefinir(on: boolean) {
    if (on) setTexts((s) => ({ ...s, lotesEtapa1: "" }));
    setInputs((s) => ({ ...s, etapaADefinir: on, ...(on ? { primeiraEtapa: false, lotesEtapa1: null } : {}) }));
  }
  function clearManual() {
    setTexts((s) => ({ ...s, reajusteManual: "" }));
    setInputs((s) => ({ ...s, reajusteManual: null }));
  }
  return { inputs, texts, set, setIndice, setEtapa, setEtapaADefinir, clearManual };
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

/**
 * Campo de número como no Excel: um clique seleciona o valor todo (digitar substitui);
 * dois cliques entram na edição com o cursor onde clicou, para mudar só um trecho.
 */
function useCelula() {
  const novo = useRef(false);
  const cursor = useRef<number | null>(null);
  return {
    onMouseDown: (e: React.MouseEvent<HTMLInputElement>) => {
      novo.current = document.activeElement !== e.currentTarget;
    },
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select(),
    onMouseUp: (e: React.MouseEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      if (novo.current) {
        e.preventDefault();
        el.select();
        novo.current = false;
      } else cursor.current = el.selectionStart;
    },
    onDoubleClick: (e: React.MouseEvent<HTMLInputElement>) => {
      const el = e.currentTarget;
      const pos = cursor.current ?? el.value.length;
      requestAnimationFrame(() => el.setSelectionRange(pos, pos));
    },
  };
}

function In({ s, k, label, hint, disabled }: { s: State; k: NumKey; label: string; hint?: string; disabled?: boolean }) {
  const kind = KINDS[k]!;
  const celula = useCelula();
  return (
    <label className="grid grid-cols-[1fr_minmax(118px,46%)] items-center gap-2 px-3 py-1" title={hint}>
      <span className="text-[13px] font-semibold text-navy">
        {label}
        {hint && <span className="ml-1 cursor-help text-[11px] font-normal text-muted">ⓘ</span>}
      </span>
      <span className="relative">
        <input
          inputMode="decimal"
          {...celula}
          // dinheiro: ao sair do campo fica com 2 casas (350 → 350,00)
          onBlur={() => {
            if (kind !== "brl") return;
            const v = parse(s.texts[k] ?? "", kind);
            if (v !== null) s.set(k, toText(v, kind));
          }}
          disabled={disabled}
          value={disabled ? "" : (s.texts[k] ?? "")}
          onChange={(e) => s.set(k, e.target.value)}
          placeholder={disabled ? "a definir" : OPTIONAL.includes(k) ? "opcional" : ""}
          className={`tabular w-full rounded-sm border border-[#9DC3E6] bg-[#DDEBF7] py-1 text-right text-[13.5px] font-semibold text-navy outline-none transition placeholder:font-normal placeholder:text-navy/35 focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold-soft disabled:cursor-not-allowed disabled:opacity-60 pl-2 ${SUFFIX[kind] ? "pr-10" : "pr-2"}`}
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
            <Out label="Total de Lotes" value={fmtNum(r.lotes, 2)} strong />
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
          {/* Dados que a planilha não tem, usados no site da proposta */}
          <Box title="Para o site da proposta" right="não está na planilha">
            <In s={s} k="frenteLote" label="Frente do lote" hint="Só para escrever “lotes de 8 × 25 metros”" />
            <In s={s} k="custoInfraM2" label="Custo da infraestrutura por m²" hint="Multiplica a área aproveitável" />
            <Out label="Custo das obras" value={fmtBRL(r.custoInfra)} strong />
            <In s={s} k="desagio" label="Deságio da antecipação" />
            <In s={s} k="taxaAplicacao" label="Aplicação simulada ao mês" />
          </Box>
        </div>
      </div>

      {/* Primeira etapa: uma linha de quadras para começar a vender antes */}
      <div className="overflow-hidden rounded-sm border border-gold/70 bg-white">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 bg-navy px-3 py-1.5 text-[12.5px] font-bold text-white">
          {/* uma opção só: sem primeira etapa (padrão), com os números ou a definir */}
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={!i.primeiraEtapa && !i.etapaADefinir}
              onChange={() => { s.setEtapa(false); s.setEtapaADefinir(false); }}
              className="h-4 w-4 accent-[#C1943D]"
            />
            Não tem primeira etapa
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={i.primeiraEtapa && !i.etapaADefinir} onChange={(e) => (e.target.checked ? s.setEtapa(true) : (s.setEtapa(false), s.setEtapaADefinir(false)))} className="h-4 w-4 accent-[#C1943D]" />
            Tem primeira etapa (desmembramento)
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={!!i.etapaADefinir} onChange={(e) => s.setEtapaADefinir(e.target.checked)} className="h-4 w-4 accent-[#C1943D]" />
            Primeira etapa existente, mas a definir
          </label>
          <span className="ml-auto font-normal text-white/70">
            {i.etapaADefinir ? "aparece na proposta com os números “a definir”" : i.primeiraEtapa ? "aparece na proposta" : "a seção “A primeira etapa” não aparece na proposta"}
          </span>
        </div>
        {i.primeiraEtapa && !i.etapaADefinir && <EtapaBloco s={s} r={r} />}
        {i.etapaADefinir && (
          <div className="px-3 py-2.5 text-[13px] text-muted">
            Na proposta, a seção “A primeira etapa” aparece com lotes, metragem, área e VGV <b className="text-navy">a definir</b>. Para colocar os números, marque “Tem primeira etapa”.
          </div>
        )}
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

function Titulo({ children }: { children: React.ReactNode }) {
  return <div className="bg-navy/90 px-3 py-1 text-[11.5px] font-bold uppercase tracking-wider text-white">{children}</div>;
}

/** Bloco da primeira etapa: medidas (azuis), quadras, áreas e resultado */
function EtapaBloco({ s, r }: { s: State; r: ReturnType<typeof calcular> }) {
  const i = r.inputs;
  const off = !!i.etapaADefinir;
  const q = r.etapa1?.quadras ?? null;
  const v = (x: string) => (off ? "a definir" : q ? x : "—");
  const m2 = (n: number) => `${fmtNum(n)} m²`;
  return (
    <div>
    <div className="grid divide-gold/30 md:grid-cols-2 md:divide-x">
      <div className="divide-y divide-gold/30">
        <Titulo>Medidas da 1ª etapa</Titulo>
        <Out label="Tamanho da área aproveitável (m²)" value={fmtNum(r.areaUtil)} />
        <In s={s} k="areaPerimetralE1" label="Perímetro da área da 1ª etapa (m)" hint="Comprimento da linha de quadras" disabled={off} />
        <In s={s} k="ruaE1" label="Largura da rua (m)" disabled={off} />
        <In s={s} k="compQuadraE1" label="Comprimento da quadra (m)" hint="Vazio = uma quadra só, do tamanho da linha" disabled={off} />
        <In s={s} k="frenteE1" label="Frente do lote (m)" hint={`Vazio = ${fmtNum(i.frenteLote, 0)} m, a frente do estudo`} disabled={off} />
        <In s={s} k="loteEtapa1" label="Metragem do lote (m²)" hint={`Vazio = ${fmtNum(i.metragemLote, 0)} m², o lote do estudo. Fundo = m² ÷ frente`} disabled={off} />
        <In s={s} k="ruasObrigE1" label="Desconto de ruas contínuas vindas de fora" hint="Quantidade de ruas. × largura da rua, sai do perímetro (tira lotes, não muda a área)" disabled={off} />
        <In s={s} k="descontoE1" label="Outras medidas a descontar do perímetro (m)" hint="Tira lotes, não muda a área: 2.000 m − 200 m = os lotes são contados em 1.800 m" disabled={off} />
        <In s={s} k="valorM2Etapa1" label="Valor do m² do lote (1ª etapa)" hint={`Vazio = ${fmtBRL(i.valorM2)}, o m² do estudo`} disabled={off} />
        <Titulo>Quadras</Titulo>
        <Out label="Fundo do lote (metragem do lote / frente do lote)" value={v(q ? `${fmtNum(q.fundo)} m` : "")} />
        <Out label="Quadras inteiras" value={v(q ? `${q.cheias} ${q.cheias === 1 ? "quadra" : "quadras"} × ${fmtNum(q.porQuadra)} lotes = ${fmtNum(q.cheias * q.porQuadra)} lotes` : "")} />
        <Out label="Quadra menor" value={v(q ? (q.lotesResto ? `${fmtNum(q.resto)} m = ${fmtNum(q.lotesResto)} lotes` : "não sobra") : "")} />
        <Out label="Total de quadras" value={v(q ? String(q.quarteiroes) : "")} />
        <Out label="Ruas entre as quadras" value={v(q ? (q.ruasEntre ? `${q.ruasEntre} ${q.ruasEntre === 1 ? "rua" : "ruas"} × ${fmtNum(q.rua, 0)} metros` : "nenhuma") : "")} />
      </div>
      <div className="divide-y divide-gold/30">
        <Titulo>Área da 1ª etapa</Titulo>
        <Out label="Perímetro da área da 1ª etapa" value={v(q ? `${fmtNum(q.perimetro)} m` : "")} />
        <Out
          label={`(−) Ruas entre as quadras${q?.ruasEntre ? ` (${q.ruasEntre} × ${fmtNum(q.rua, 0)} m)` : ""}`}
          value={v(q ? (q.ruasEntre ? `−${fmtNum(q.ruasEntre * q.rua)} m` : "—") : "")}
        />
        <Out
          label={`(−) Ruas contínuas vindas de fora${q?.ruasObrig ? ` (${q.ruasObrig} × ${fmtNum(q.rua, 0)} m)` : ""}`}
          value={v(q ? (q.obrigM ? `−${fmtNum(q.obrigM)} m` : "—") : "")}
        />
        <Out label="(−) Outras medidas a descontar" value={v(q ? (q.desconto ? `−${fmtNum(q.desconto)} m` : "—") : "")} />
        <Out label="Perímetro que sobra para lotes" value={v(q ? `${fmtNum(Math.max(0, q.linha - q.ruasEntre * q.rua))} m` : "")} strong />
        <Out label="Área total da etapa (perímetro × fundo)" value={v(q ? m2(q.areaTotal) : "")} strong />
        <Titulo>Resultado</Titulo>
        <Out
          label="Quantidade de lotes da 1ª etapa"
          value={off ? "a definir" : r.etapa1 ? fmtNum(r.etapa1.lotes, 2) : "—"}
          strong
        />
        <Out label="Da área aproveitável" value={off ? "a definir" : r.etapa1 ? fmtPct(r.etapa1.pct) : "—"} />
        <Out label="VGV parcial à vista" value={off ? "a definir" : r.etapa1 ? fmtBRL(r.etapa1.avista) : "—"} />
        <Out label={`VGV parcial em ${r.nParcelas} meses`} value={off ? "a definir" : r.etapa1 ? fmtBRL(r.etapa1.prazo) : "—"} strong />
      </div>
    </div>
    {q && !off && <Desenho q={q} lote={r.etapa1!.lote} />}
    </div>
  );
}

/* ---------- desenho da linha de quadras (ilustrativo, fora de escala no fundo) ---------- */

type Quadras = NonNullable<NonNullable<ReturnType<typeof calcular>["etapa1"]>["quadras"]>;

export function Desenho({ q, lote }: { q: Quadras; lote: number }) {
  const W = 1000, X0 = 40, LARG = W - 2 * X0, Y = 46, H = 46;
  const esc = q.perimetro > 0 ? LARG / q.perimetro : 0;
  const n = (x: number, d = 0) => fmtNum(x, d);
  // trechos ao longo da linha: quadras inteiras, ruas, quadra menor, sobra e desconto
  type Trecho = { tipo: "quadra" | "rua" | "sobra" | "desconto" | "obrig"; m: number; lotes?: number };
  const t: Trecho[] = [];
  for (let k = 0; k < q.cheias; k++) {
    if (k > 0) t.push({ tipo: "rua", m: q.rua });
    t.push({ tipo: "quadra", m: q.comp, lotes: q.porQuadra });
  }
  if (q.lotesResto > 0) {
    if (q.cheias > 0) t.push({ tipo: "rua", m: q.rua });
    t.push({ tipo: "quadra", m: q.resto, lotes: q.lotesResto });
  }
  const usado = t.reduce((a, x) => a + x.m, 0);
  if (q.linha - usado > 0.01) t.push({ tipo: "sobra", m: q.linha - usado });
  if (q.obrigM > 0) t.push({ tipo: "obrig", m: q.obrigM });
  if (q.desconto > 0) t.push({ tipo: "desconto", m: q.desconto });
  let x = X0;
  const peças = t.map((tr) => {
    const w = tr.m * esc;
    const p = { ...tr, x, w };
    x += w;
    return p;
  });
  return (
    <div className="border-t border-gold/30 px-3 py-3">
      <div className="mb-1 text-[11.5px] font-bold uppercase tracking-wider text-navy">Desenho da 1ª etapa (ilustrativo)</div>
      <svg viewBox={`0 0 ${W} ${q.obrigM > 0 ? 250 : 166}`} className="h-auto w-full" role="img" aria-label="Linha de quadras da primeira etapa">
        <defs>
          <pattern id="e1-hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="#C0392B" strokeWidth="2" opacity="0.45" />
          </pattern>
          <pattern id="e1-obrig" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width="6" height="6" fill="#EAF1FB" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#2E6DB4" strokeWidth="2" opacity="0.45" />
          </pattern>
        </defs>
        {/* cota do perímetro */}
        <line x1={X0} x2={X0 + LARG} y1={18} y2={18} stroke="#122A45" strokeWidth="1" />
        <line x1={X0} x2={X0} y1={12} y2={24} stroke="#122A45" />
        <line x1={X0 + LARG} x2={X0 + LARG} y1={12} y2={24} stroke="#122A45" />
        <text x={W / 2} y={13} textAnchor="middle" fontSize="13" fontWeight="700" fill="#122A45">Perímetro {n(q.perimetro)} m</text>
        {/* cota do fundo */}
        <line x1={X0 - 14} x2={X0 - 14} y1={Y} y2={Y + H} stroke="#122A45" />
        <text x={X0 - 18} y={Y + H / 2} textAnchor="middle" fontSize="11" fill="#122A45" transform={`rotate(-90 ${X0 - 18} ${Y + H / 2})`}>fundo {n(q.fundo, 1)} m</text>
        {peças.map((p, k) => {
          if (p.tipo === "rua")
            return (
              <g key={k}>
                <rect x={p.x} y={Y} width={p.w} height={H} fill="#DDE3E9" />
                {p.w > 26 && <text x={p.x + p.w / 2} y={Y + H / 2 + 4} textAnchor="middle" fontSize="10" fill="#697683">rua</text>}
                {/* largura da rua */}
                <text x={p.x + p.w / 2} y={Y - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#697683">{n(p.m)} m</text>
              </g>
            );
          if (p.tipo === "obrig")
            return (
              <g key={k}>
                <rect x={p.x} y={Y} width={p.w} height={H} fill="url(#e1-obrig)" stroke="#2E6DB4" strokeDasharray="4 3" />
                <text x={p.x + p.w / 2} y={Y - 5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#2E6DB4">{n(p.m)} m</text>
                {/* em pé, logo abaixo do trecho azul */}
                <line x1={p.x + p.w / 2} x2={p.x + p.w / 2} y1={Y + H + 2} y2={Y + H + 8} stroke="#2E6DB4" />
                <text x={p.x + p.w / 2} y={Y + H + 12} transform={`rotate(90 ${p.x + p.w / 2} ${Y + H + 12})`} dominantBaseline="central" fontSize="11" fontWeight="700" fill="#2E6DB4">{`ruas contínuas ${q.ruasObrig} × ${n(q.rua)} m`}</text>
              </g>
            );
          if (p.tipo === "desconto" || p.tipo === "sobra")
            return (
              <g key={k}>
                <rect x={p.x} y={Y} width={p.w} height={H} fill={p.tipo === "desconto" ? "url(#e1-hachura)" : "#F7F2E7"} stroke={p.tipo === "desconto" ? "#C0392B" : "#ECE1C4"} strokeDasharray="4 3" />
                {p.w > 40 && <text x={p.x + p.w / 2} y={Y + H + 16} textAnchor="middle" fontSize="11" fill={p.tipo === "desconto" ? "#C0392B" : "#697683"}>{p.tipo === "desconto" ? `desconto ${n(p.m)} m` : `sobra ${n(p.m, 1)} m`}</text>}
              </g>
            );
          const passo = q.frente * esc;
          return (
            <g key={k}>
              <rect x={p.x} y={Y} width={p.w} height={H} rx={Math.min(7, p.w / 4)} fill="#F7F2E7" stroke="#C1943D" strokeWidth="1.5" />
              {passo >= 3 &&
                Array.from({ length: Math.max(0, (p.lotes ?? 0) - 1) }, (_, j) => (
                  <line key={j} x1={p.x + (j + 1) * passo} x2={p.x + (j + 1) * passo} y1={Y} y2={Y + H} stroke="#C1943D" strokeWidth="0.7" opacity="0.7" />
                ))}
              {p.w > 70 && (
                <>
                  <text x={p.x + p.w / 2} y={Y + H + 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#122A45">{n(p.m)} m</text>
                  <text x={p.x + p.w / 2} y={Y + H + 30} textAnchor="middle" fontSize="11" fill="#697683">{n(p.lotes ?? 0, 2)} lotes</text>
                </>
              )}
            </g>
          );
        })}
        <text x={X0} y={160} fontSize="11.5" fill="#122A45">
          {`${q.quarteiroes} quadras · ${q.ruasEntre} ruas de ${n(q.rua)} m · frente ${n(q.frente)} m × fundo ${n(q.fundo, 1)} m = lote ${n(lote)} m²`}
        </text>
      </svg>
    </div>
  );
}
