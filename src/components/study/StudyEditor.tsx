"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { calcular, divisaoNaTela, FIN_E1, INDICES, type StudyInputs } from "@/lib/calc";
import { fmtBRL, fmtBRL0, fmtNum, fmtPct } from "@/lib/format";
import { IMPLANTA_PADRAO, PAVIMENTOS, REGIOES, type Implanta, type Regiao } from "@/lib/orcamento2026";

/**
 * Formulário no mesmo layout da aba "Dados do Parcelamento de Solo" da planilha:
 * as células azuis são as que se digita; as brancas o sistema calcula na hora.
 */

type Kind = "m2" | "pct" | "brl" | "num" | "anos" | "m" | "lotes" | "ruas" | "meses";
type NumKey = { [K in keyof StudyInputs]-?: StudyInputs[K] extends number | null ? K : never }[keyof StudyInputs];

const SUFFIX: Record<Kind, string> = { m2: "m²", pct: "%", brl: "R$", num: "×", anos: "anos", m: "m", lotes: "lotes", ruas: "ruas", meses: "meses" };
const OPTIONAL: NumKey[] = ["viasPct", "quadraMax", "intermediacaoPct", "extensaoRede", "lotesEtapa1", "areaEtapa1", "loteEtapa1", "valorM2Etapa1", "areaPerimetralE1", "ruaE1", "descontoE1", "ruasObrigE1", "compQuadraE1", "frenteE1", "compLoteE1", "compLote", "reajusteManual", "ipcaE1", "jurosAnoE1", "jurosMesE1", "entradaPctE1", "multiplicadorE1", "anosE1", "mesesObra", "investidorPct", "incorporadorPctE1", "intermediacaoPctE1"];

function toText(v: number | null | undefined, kind: Kind) {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  const n = kind === "pct" ? v * 100 : v;
  // sempre com 2 casas (10 → 10,00); até 4 quando a conta usa mais (0,6625 não aparece como 0,66)
  return n.toLocaleString("pt-BR", kind === "brl" ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

function parse(text: string, kind: Kind): number | null {
  const t = text.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n)) return null;
  return kind === "pct" ? n / 100 : n;
}

/**
 * Valor que a conta usa para o que está escrito no campo: a conta segue sempre o que aparece na tela.
 * Campo apagado = sem valor (opcionais) ou zero (os outros). undefined = ainda não é número ("-", ","): espera.
 */
export function valorDoCampo(text: string, kind: Kind, opcional: boolean): number | null | undefined {
  const v = parse(text, kind);
  if (v !== null) return v;
  if (opcional) return null;
  return text.trim() ? undefined : 0;
}

const KINDS: Partial<Record<NumKey, Kind>> = {
  areaTotal: "m2", aproveitamento: "pct", metragemLote: "m2", incorporadorPct: "pct", valorM2: "brl", corretorPct: "pct",
  ipca: "pct", jurosAno: "pct", jurosMes: "pct", valorArea: "brl", entradaPct: "pct", multiplicador: "num", anos: "anos",
  entradaIncTerPct: "pct", parcelaEntregaPct: "pct", balaoPct: "pct", frenteLote: "m", viasPct: "pct", larguraVia: "m", larguraCalcada: "m", quadraMax: "m", intermediacaoPct: "pct", custoInfraM2: "brl", extensaoRede: "m",
  lotesEtapa1: "lotes", areaEtapa1: "m2", loteEtapa1: "m2", valorM2Etapa1: "brl", areaPerimetralE1: "m", ruaE1: "m", descontoE1: "m", ruasObrigE1: "ruas", compQuadraE1: "m", frenteE1: "m", compLoteE1: "m", compLote: "m", desagio: "pct", taxaAplicacao: "pct", reajusteManual: "pct",
  ipcaE1: "pct", jurosAnoE1: "pct", jurosMesE1: "pct", entradaPctE1: "pct", multiplicadorE1: "num", anosE1: "anos",
  mesesObra: "meses", investidorPct: "pct", incorporadorPctE1: "pct", intermediacaoPctE1: "pct",
};

/**
 * O lote é sempre frente × comprimento (a metragem é calculada). Propostas antigas, sem o
 * comprimento, começam com comprimento = metragem ÷ frente: a metragem não muda.
 */
function comComprimentos(i: StudyInputs): StudyInputs {
  const n = { ...i };
  if (!(n.compLote && n.compLote > 0) && n.frenteLote > 0 && n.metragemLote > 0) n.compLote = n.metragemLote / n.frenteLote;
  const frenteE1 = n.frenteE1 && n.frenteE1 > 0 ? n.frenteE1 : n.frenteLote;
  const loteE1 = n.loteEtapa1 && n.loteEtapa1 > 0 ? n.loteEtapa1 : n.metragemLote;
  if (!(n.compLoteE1 && n.compLoteE1 > 0) && frenteE1 > 0 && loteE1 > 0) n.compLoteE1 = loteE1 / frenteE1;
  // 1ª etapa ligada antes do financiamento próprio ser obrigatório: os campos vêm com os números do
  // estudo (os que a proposta já usava) e passam a ser obrigatórios. A proposta não muda.
  if ((n.primeiraEtapa || n.lotesEtapa1) && !n.etapaADefinir && !n.finE1Exigido) {
    const fixo = n.reajusteManual; // reajuste fixo antigo: vira o índice, sem juros (o total é o mesmo)
    n.ipcaE1 ??= fixo ?? n.ipca;
    n.jurosAnoE1 ??= fixo !== null ? 0 : n.jurosAno;
    n.jurosMesE1 ??= fixo !== null ? 0 : n.jurosMes;
    n.entradaPctE1 ??= n.entradaPct;
    n.multiplicadorE1 ??= n.multiplicador;
    n.anosE1 ??= n.anos;
    n.finE1Exigido = true;
  }
  return n;
}

/**
 * Juros ao ano e ao mês são o mesmo juro em duas escalas (ano = mês × 12): digitar num atualiza o outro.
 * Só o digitado fica gravado (o outro vai a zero), porque a conta soma os dois (IPCA + ano + mês × 12).
 */
const JUROS_PAR: Partial<Record<NumKey, [NumKey, number]>> = {
  jurosAno: ["jurosMes", 1 / 12],
  jurosMes: ["jurosAno", 12],
  jurosAnoE1: ["jurosMesE1", 1 / 12],
  jurosMesE1: ["jurosAnoE1", 12],
};

export function useStudyState(initial: StudyInputs) {
  const [inputs, setInputs] = useState<StudyInputs>(() => comComprimentos(initial));
  const [texts, setTexts] = useState<Record<string, string>>(() => {
    const t: Record<string, string> = {};
    const ini = comComprimentos(initial);
    for (const [k, kind] of Object.entries(KINDS)) t[k] = toText(ini[k as NumKey] as number | null, kind as Kind);
    // o juro que está zerado mostra o equivalente do outro (8% ao ano aparece como 0,6667% ao mês)
    for (const [k, [outro, f]] of Object.entries(JUROS_PAR) as [NumKey, [NumKey, number]][]) {
      const v = ini[k] as number | null, o = ini[outro] as number | null;
      if (v && !o) t[outro] = toText(v * f, "pct");
    }
    return t;
  });
  function set(key: NumKey, text: string) {
    const kind = KINDS[key]!;
    // juro equivalente só mostrado: sair do campo sem mudar nada não troca qual dos dois fica gravado
    if (JUROS_PAR[key] && texts[key] === text) return;
    setTexts((s) => ({ ...s, [key]: text }));
    const v = valorDoCampo(text, kind, OPTIONAL.includes(key));
    if (v === undefined) return;
    setInputs((s) => {
      const n = { ...s, [key]: v };
      const par = JUROS_PAR[key];
      if (par) {
        const [outro, f] = par;
        // (só os da 1ª etapa podem ficar vazios; os da gleba geral nunca chegam aqui como null)
        (n as Record<string, unknown>)[outro] = v === null ? null : 0;
        setTexts((t) => ({ ...t, [outro]: v === null ? "" : toText(v * f, "pct") }));
      }
      // a metragem é frente × comprimento (guardada junto: a proposta usa ela); sem um dos dois, fica zero
      // (o campo fica em vermelho), para a proposta não seguir com o lote antigo
      if (key === "compLote" || key === "frenteLote") {
        n.metragemLote = n.compLote && n.compLote > 0 && n.frenteLote > 0 ? Math.round(n.frenteLote * n.compLote * 100) / 100 : 0;
        setTexts((t) => ({ ...t, metragemLote: toText(n.metragemLote, "m2") }));
      }
      return n;
    });
  }
  function setIndice(v: string) {
    setInputs((s) => ({ ...s, indice: v }));
  }
  /** Índice da 1ª etapa: só o nome muda; as taxas são as digitadas na própria seção */
  function setIndiceE1(v: string) {
    setInputs((s) => ({ ...s, indiceE1: v || null }));
  }
  /** Liga/desliga a primeira etapa (desmembramento) */
  function setEtapa(on: boolean) {
    // desligada, a quantidade de lotes some (senão a proposta voltaria com a etapa ligada)
    if (!on) setTexts((s) => ({ ...s, lotesEtapa1: "" }));
    setInputs((s) => {
      // ligada pela 1ª vez: reajuste e recebimentos da etapa vêm vazios e são obrigatórios (mesmo que zero)
      const novo = on && !s.finE1Exigido;
      if (novo) setTexts((t) => ({ ...t, ...Object.fromEntries(FIN_E1.map((k) => [k, ""])) }));
      return {
        ...s,
        primeiraEtapa: on,
        ...(on ? { etapaADefinir: false } : { lotesEtapa1: null }),
        ...(novo ? { finE1Exigido: true, ...Object.fromEntries(FIN_E1.map((k) => [k, null])) } : {}),
      };
    });
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
  /** Opções do corretor da parceria: quem paga e se aparece na proposta */
  function setCorretor(c: { intermediacaoOrigem?: "inc" | "ter" | "ambos"; intermediacaoOrigemE1?: "inc" | "ter" | "ambos"; mostrarCorretor?: boolean; mostrarValorCorretor?: boolean }) {
    setInputs((s) => ({ ...s, ...c }));
  }
  /** Planilha nova: região, pavimento, energia e o que será implantado */
  function setOrcamento(c: { regiao?: Regiao; pavimento?: string; energiaTipo?: "aerea" | "subterranea"; implanta?: Partial<Implanta>; obrasPorM2?: boolean }) {
    setInputs((s) => ({ ...s, ...c, implanta: c.implanta ? { ...s.implanta, ...c.implanta } : s.implanta }));
  }
  /** Observações internas da planilha (texto livre, salva junto com os números) */
  function setObs(k: "obsGleba" | "obsEtapa1", texto: string) {
    setInputs((s) => ({ ...s, [k]: texto }));
  }
  return { inputs, texts, set, setIndice, setIndiceE1, setEtapa, setEtapaADefinir, clearManual, setCorretor, setOrcamento, setObs };
}

type State = ReturnType<typeof useStudyState>;

/* ---------- peças no visual da planilha ---------- */

function Box({ n, title, right, children }: { n?: number; title: string; right?: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-sm border border-gold/70 bg-white">
      <div className="flex items-center justify-between bg-navy px-3 py-1 text-[11px] font-bold tracking-wider text-white">
        <span className="flex items-center gap-2 uppercase">{n && <Num n={n} />}{title}</span>
        {right && <span>{right}</span>}
      </div>
      <div className="divide-y divide-gold/30">{children}</div>
    </div>
  );
}

function Num({ n }: { n: number }) {
  return <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold text-[11px] font-bold text-navy">{n}</span>;
}

/** Título grande de cada parte da planilha (gleba geral, primeira etapa) */
function Parte({ children }: { children: React.ReactNode }) {
  return <h3 className="border-b-2 border-gold pb-1 text-[15px] font-bold uppercase tracking-wider text-navy">{children}</h3>;
}

function Sub({ children, n }: { children: React.ReactNode; n?: number }) {
  return <div className="flex items-center gap-2 bg-navy/90 px-3 py-1 text-left text-[12px] font-bold text-white">{n && <Num n={n} />}{children}</div>;
}

/**
 * Bloco de observações da equipe: só aparece aqui na planilha (nunca na proposta pública nem no PDF).
 * Ocupa o espaço que sobra na coluna e salva junto com os números.
 */
function Observacoes({ s, k, titulo, n }: { s: State; k: "obsGleba" | "obsEtapa1"; titulo: string; n?: number }) {
  return (
    <div className="flex min-h-[150px] flex-1 flex-col">
      <div className="flex items-center justify-between gap-2 bg-navy/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
        <span className="flex items-center gap-2">{n && <Num n={n} />}{titulo}</span>
        <span className="font-semibold normal-case tracking-normal text-white/70">🔒 uso interno</span>
      </div>
      <textarea
        value={s.inputs[k] ?? ""}
        onChange={(e) => s.setObs(k, e.target.value)}
        placeholder="Anotações da equipe sobre esta planilha. Não aparecem na proposta nem no PDF."
        aria-label={titulo}
        className="min-h-[110px] w-full flex-1 resize-y border-0 bg-[#FFFCF3] px-3 py-2 text-[13px] leading-relaxed text-ink outline-none placeholder:text-navy/35 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-gold-soft"
      />
    </div>
  );
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

/** Números que a planilha precisa (vazio ou zero quebra as contas): ficam em vermelho com aviso */
const OBRIGATORIOS: NumKey[] = ["areaTotal", "aproveitamento", "frenteLote", "compLote", "valorM2", "incorporadorPct", "multiplicador", "anos", "larguraVia"];

/** igual: valor usado com o campo vazio (o da gleba geral), escrito na célula; digitar substitui, apagar volta */
function In({ s, k, label, disabled, nota, erro: erroProp, ph, igual }: { s: State; k: NumKey; label: string; hint?: string; disabled?: boolean; nota?: string; erro?: string | null; ph?: string; igual?: number | null }) {
  const kind = KINDS[k]!;
  const texto = s.texts[k] ?? "";
  const usaIgual = igual !== undefined && !texto.trim();
  const celula = useCelula();
  const valor = s.inputs[k] as number | null;
  const erro = disabled ? null : erroProp !== undefined ? erroProp : OBRIGATORIOS.includes(k) && !(typeof valor === "number" && valor > 0) ? "Preencha com um número maior que zero" : null;
  return (
    <label className="grid grid-cols-[1fr_minmax(118px,46%)] items-center gap-2 px-3 py-1">
      <span className="text-[13px] font-semibold text-navy">{label}</span>
      <span className="relative">
        <input
          inputMode="decimal"
          {...celula}
          // ao sair do campo fica com 2 casas (350 → 350,00)
          onBlur={() => {
            const v = parse(s.texts[k] ?? "", kind);
            if (v !== null) s.set(k, toText(v, kind));
          }}
          disabled={disabled}
          value={disabled ? "" : usaIgual ? toText(igual, kind) : texto}
          onChange={(e) => s.set(k, e.target.value)}
          placeholder={disabled ? "a definir" : ph ? ph : k === "valorM2Etapa1" ? "obrigatório" : ""}
          aria-invalid={!!erro}
          className={`tabular w-full rounded-sm border ${erro ? "border-rose-500 bg-rose-50 ring-1 ring-rose-300" : "border-[#9DC3E6] bg-[#DDEBF7]"} py-1 text-right text-[13.5px] font-semibold text-navy outline-none transition placeholder:font-normal placeholder:text-navy/35 focus:border-gold focus:bg-white focus:ring-2 focus:ring-gold-soft disabled:cursor-not-allowed disabled:opacity-60 pl-2 ${SUFFIX[kind] ? "pr-10" : "pr-2"}`}
        />
        {SUFFIX[kind] && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-navy/60">{SUFFIX[kind]}</span>}
      </span>
      {erro && <span className="col-start-2 -mt-0.5 text-right text-[11.5px] font-semibold text-rose-700">{erro}</span>}
      {nota && <span className="col-start-2 -mt-0.5 text-right text-[12px] font-semibold text-gold-deep">{nota}</span>}
      {usaIgual && !disabled && <span className="col-start-2 -mt-0.5 text-right text-[11.5px] text-navy/60">igual à gleba geral</span>}
    </label>
  );
}

function Out({ label, value, strong, navy, nota, sufixo }: { label: string; value: string; strong?: boolean; navy?: boolean; nota?: string; sufixo?: string }) {
  return (
    <div className="grid grid-cols-[1fr_minmax(118px,46%)] items-center gap-2 px-3 py-1">
      <span className="text-[13px] font-semibold text-navy">{label}</span>
      {sufixo ? (
        // mesmo alinhamento dos campos azuis (número no mesmo lugar e a unidade ao lado)
        <span className={`tabular relative border border-transparent py-1 pl-2 pr-10 text-right text-[13.5px] ${strong ? "font-bold text-navy" : navy ? "text-navy" : "text-ink"}`}>
          {value}
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-normal text-navy/60">{sufixo}</span>
        </span>
      ) : (
        <span className={`tabular px-2 py-1 text-right text-[13.5px] ${strong ? "font-bold text-navy" : navy ? "text-navy" : "text-ink"}`}>{value}</span>
      )}
      {nota && <span className="col-start-2 -mt-1.5 px-2 text-right text-[12px] font-semibold text-gold-deep">{nota}</span>}
    </div>
  );
}

/**
 * Largura da própria planilha (não da tela): no painel lateral ela fica estreita e as colunas
 * se empilham; na janela larga ficam lado a lado.
 */
const LarguraCtx = createContext(1200);
function useLarguraDe(ref: React.RefObject<HTMLElement>) {
  const [w, setW] = useState(1200);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

export default function StudyEditor({ state }: { state: State; compact?: boolean }) {
  const s = state;
  const raiz = useRef<HTMLDivElement>(null);
  const w = useLarguraDe(raiz);
  const r = useMemo(() => calcular(s.inputs), [s.inputs]);
  const i = r.inputs;
  const invalid = r.jblPct < 0;
  const dv = divisaoNaTela(r);

  return (
    <LarguraCtx.Provider value={w}>
    <div ref={raiz} className="grid gap-5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-[#9DC3E6] bg-[#DDEBF7]" /> campos para preencher (as células azuis da planilha)</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border border-line bg-white" /> calculado automaticamente</span>
        <span className="ml-auto flex items-center gap-1.5"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> calculando ao vivo</span>
      </div>

      <Parte>Gleba Geral</Parte>

      <div className={`grid gap-4 ${w >= 1000 ? "grid-cols-3" : w >= 720 ? "grid-cols-2" : ""}`}>
        {/* coluna 1 (as observações ocupam o espaço que sobra embaixo) */}
        <div className="flex flex-col gap-4">
          <Box n={1} title="Dados do Parcelamento de Solo" right="Dados">
            <In s={s} k="areaTotal" label="Tamanho da Área (m²)" />
            <In s={s} k="aproveitamento" label="Aproveitamento %" />
            <Out label="Área Útil (m²)" value={fmtNum(r.areaUtil)} />
            <Out label="Doação de Área + Vias (m²)" value={fmtNum(r.areaDoacao)} />
            <In s={s} k="frenteLote" label="Frente do lote (m)" hint="Planilha 2026, C7. Escreve “lotes de 8 × 25 metros” e entra nos poços de visita" />
            <In s={s} k="compLote" label="Comprimento do lote (m)" hint="Metragem do lote = frente × comprimento" />
            <Out label="Metragem do Lote (frente × comprimento)" value={i.frenteLote > 0 && i.compLote && i.compLote > 0 ? `${fmtNum(i.metragemLote)} m²` : "— preencha frente e comprimento"} strong />
            <In s={s} k="larguraVia" label="Largura da via (m)" hint="Planilha 2026, C8: rua + calçadas" />
            <In s={s} k="larguraCalcada" label="Largura da calçada (m)" hint="Planilha 2026, C9: cada lado" />
            {/* Planilha 2026, C10: só mostra (não dá para alterar em nenhuma proposta). Vazio = metade da área que não é aproveitável */}
            <Out label="Vias (%)" value={toText(i.viasPct ?? Math.max(0, 1 - i.aproveitamento) / 2, "pct")} sufixo="%" />
            <In s={s} k="quadraMax" label="Tamanho máximo da quadra (m)" hint="Planilha 2026, C14: entra nos poços de visita, bocas de lobo e bigode. Vazio = esses itens ficam “A projetar”" />
            <Out label="Total de Lotes" value={fmtNum(r.lotes, 2)} strong />
          </Box>
          <Box n={2} title="Comercialização do Parcelamento de Solo" right="Valor M²">
            <In s={s} k="valorM2" label="Valor do m² a ser Comercializado" />
          </Box>
          <Box n={3} title="Comissionamento" right="Valor">
            <In s={s} k="corretorPct" label="Corretor (%)" />
            <Out label="Valor" value={fmtBRL(r.comissao)} />
          </Box>
          <div className="flex flex-1 flex-col overflow-hidden rounded-sm border border-gold/70 bg-white">
            <Observacoes s={s} k="obsGleba" titulo="Observações da planilha" />
          </div>
        </div>

        {/* coluna 2 */}
        <div className="grid content-start gap-4">
          <Box n={4} title="Reajuste" right="Dados">
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
            <In s={s} k="jurosMes" label="Juros (Mês)" />
            <In s={s} k="jurosAno" label="Juros (Ano)" />
            <Out label="Total do Reajuste" value={fmtPct(r.reajusteCalculado)} strong />
            {i.reajusteManual !== null && (
              <div className="bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
                Esta proposta usa um reajuste fixo de <b>{fmtPct(i.reajusteManual)}</b> (como no PDF de jan/2026), no lugar da fórmula.{" "}
                <button type="button" onClick={s.clearManual} className="font-semibold text-gold-deep underline">Usar a fórmula da planilha</button>
              </div>
            )}
          </Box>
          <Box title="Condição de Venda" right="Dados">
            <Sub>À Vista</Sub>
            <Out label="Valor do Lote a ser Comercializado" value={fmtBRL(r.valorLote)} strong />
            <Sub n={5}>PARCELADO</Sub>
            <In s={s} k="entradaPct" label="Entrada (%)" />
            <Out label="Valor da Entrada" value={fmtBRL(r.entrada)} />
            <Out label="Entrada parte Corretor" value={fmtBRL(r.entradaCorretor)} />
            <Out label="Entrada parte Incorporador" value={fmtBRL(r.entradaInc)} />
            <Out label="Entrada parte Terrenista" value={fmtBRL(r.entradaTer)} />
            <In s={s} k="multiplicador" label="Multiplicador para encontrar a Parcela" />
            <In s={s} k="anos" label="Em quantos Anos ocorrerá o Parcelamento" />
            <Out label="Número de Parcelas" value={String(r.nParcelas)} />
            <Out label="Valor da Parcela com Desconto (pagamento em dia)" value={fmtBRL(r.parcela)} strong />
            <Out label="Valor da Parcela que vai para o Contrato" value={fmtBRL(r.parcelaContrato)} />
            <Out label="Valor do Lote em Contrato" value={fmtBRL(r.valorLoteContrato)} />
          </Box>
        </div>

        {/* coluna 3 */}
        <div className="grid content-start gap-4">
          {/* Dados que a planilha não tem, usados no site da proposta */}
          <Box n={6} title="Infraestrutura e securitização">
            {/* planilha nova: escolhe entre o orçamento item a item e o valor por m² digitado (o que aparece na proposta) */}
            {i.planilhaNova && (
              <div className="grid grid-cols-2 gap-1 px-3 py-2">
                {([[true, "Valor do m² (Manual)"], [false, "Orçamento Planilhado"]] as const).map(([m2, rotulo]) => (
                  <button
                    key={rotulo}
                    type="button"
                    onClick={() => s.setOrcamento({ obrasPorM2: m2 })}
                    className={`rounded-sm border px-2 py-1.5 text-[12.5px] font-semibold ${!!i.obrasPorM2 === m2 ? "border-navy bg-navy text-white" : "border-[#9DC3E6] bg-[#DDEBF7] text-navy hover:border-gold"}`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            )}
            {i.planilhaNova && !i.obrasPorM2 ? (
              <OrcamentoNovo s={s} r={r} />
            ) : (
              <>
                {i.obrasSemEtapa1 && (
                  <Out
                    label={r.areaE1Obras > 0 ? "Área das obras (aproveitável − 1ª etapa)" : "Área das obras (aproveitável)"}
                    value={`${fmtNum(r.areaObras)} m²`}
                    nota={r.areaE1Obras > 0 ? `${fmtNum(Math.floor(r.areaUtil))} − ${fmtNum(r.areaE1Obras)} m² dos lotes da 1ª etapa` : undefined}
                  />
                )}
                <In s={s} k="custoInfraM2" label="Custo da infraestrutura por m²" hint="Multiplica a área aproveitável" />
                <Out label="Custo das obras" value={fmtBRL(r.custoInfra)} strong />
              </>
            )}
            <In s={s} k="desagio" label="Deságio da antecipação" />
            <In s={s} k="taxaAplicacao" label="Aplicação simulada ao mês" />
            {/* o mesmo valor da conta da antecipação na proposta: carteira do terrenista − deságio */}
            <Out label="Valor da antecipação" value={fmtBRL(r.antecipacao.valor)} strong />
          </Box>
          <Box n={7} title="Parceria do Parcelamento de Solo">
            {/* cada parte com o seu VGV à vista logo abaixo, como no Comissionamento */}
            <In s={s} k="incorporadorPct" label="Incorporador (%)" />
            <Out label="VGV Incorporador à vista" value={fmtBRL(r.vgvAvistaInc)} navy />
            <Out label={`VGV Incorporador a prazo (${fmtNum(r.nParcelas / 12, r.nParcelas % 12 ? 1 : 0)} anos)`} value={fmtBRL(r.principal.carteiraInc)} navy />
            <Out label="Terrenista (%)" value={fmtNum(r.terrenistaPct * 100)} sufixo="%" strong />
            <Out label="VGV Terrenista à vista" value={fmtBRL(r.vgvAvistaTer)} navy />
            <Out label={`VGV Terrenista a prazo (${fmtNum(r.nParcelas / 12, r.nParcelas % 12 ? 1 : 0)} anos)`} value={fmtBRL(r.principal.carteiraTer)} navy />
            {/* planilha nova: investidor, sai da parte do incorporador; ainda não aparece na proposta */}
            {i.planilhaNova && (
              <>
                <In s={s} k="investidorPct" label="Investidor (%)" hint="Sai da parte do incorporador. Vazio = sem investidor" />
                {r.investidor && (
                  <>
                    <Out label="Incorporador líquido (−investidor)" value={fmtNum(r.investidor.incLiquidoPct * 100)} sufixo="%" />
                    <Out label="VGV Investidor à vista" value={fmtBRL(r.investidor.vgvAvista)} navy />
                    <Out label={`VGV Investidor a prazo (${fmtNum(r.nParcelas / 12, r.nParcelas % 12 ? 1 : 0)} anos)`} value={fmtBRL(r.investidor.carteira)} navy />
                  </>
                )}
              </>
            )}
            <In s={s} k="intermediacaoPct" label="Corretor da intermediação (%)" hint="Opcional. O percentual incide sobre os % de quem paga (os do incorporador, os do terrenista ou os dois). O do incorporador sai da parte da JBL; as obras não mudam. Vazio = sem corretor" />
            {r.intermediacaoPct > 0 && (
              <>
                <label className="grid grid-cols-[1fr_minmax(118px,46%)] items-center gap-2 px-3 py-1">
                  <span className="text-[13px] font-semibold text-navy">Corretor pago por</span>
                  <select className="rounded-sm border border-[#9DC3E6] bg-[#DDEBF7] px-2 py-1 text-[13px] font-semibold text-navy outline-none focus:border-gold" value={i.intermediacaoOrigem ?? "inc"} onChange={(e) => s.setCorretor({ intermediacaoOrigem: e.target.value as "inc" | "ter" | "ambos" })}>
                    <option value="inc">Incorporador (JBL)</option>
                    <option value="ter">Terrenista</option>
                    <option value="ambos">Incorporador e terrenista</option>
                  </select>
                </label>
                <Out label="VGV Corretor" value={fmtBRL(r.vgvAvista * r.intermediacaoPct)} navy />
                {/* de onde sai: o % do corretor sobre o VGV de quem paga */}
                <p className="px-3 pb-1 text-[12px] leading-snug text-muted">
                  {(() => {
                    const pct = `${fmtNum((i.intermediacaoPct ?? 0) * 100, Number.isInteger(Math.round((i.intermediacaoPct ?? 0) * 1e4) / 100) ? 0 : 2)}%`;
                    const o = i.intermediacaoOrigem ?? "inc";
                    const deInc = `${pct} de ${fmtBRL(r.vgvAvistaInc)} (VGV Incorporador) = ${fmtBRL(r.vgvAvista * r.intermediacaoDeInc)}`;
                    const deTer = `${pct} de ${fmtBRL(r.vgvAvistaTer)} (VGV Terrenista) = ${fmtBRL(r.vgvAvista * r.intermediacaoDeTer)}`;
                    return o === "inc" ? deInc : o === "ter" ? deTer : `${deInc} + ${deTer}`;
                  })()}
                </p>
                <Out label="Corretor na divisão" value={fmtPct(divisaoNaTela(r).corretor)} />
                <label className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-semibold text-navy">
                  <input type="checkbox" className="accent-[#C1943D]" checked={i.mostrarCorretor !== false} onChange={(e) => s.setCorretor({ mostrarCorretor: e.target.checked })} />
                  Mostrar o corretor na proposta
                </label>
                {i.mostrarCorretor !== false && (
                  <label className="flex items-center gap-2 px-3 py-1.5 pl-8 text-[13px] font-semibold text-navy">
                    <input type="checkbox" className="accent-[#C1943D]" checked={i.mostrarValorCorretor !== false} onChange={(e) => s.setCorretor({ mostrarValorCorretor: e.target.checked })} />
                    Mostrar o valor (VGV) do corretor
                  </label>
                )}
              </>
            )}
          </Box>
          <Box n={8} title="Valor da Área" right="Valor">
            <In s={s} k="valorArea" label="Valor" />
          </Box>
        </div>
      </div>

      <Parte>Primeira Etapa</Parte>

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
      <div className="overflow-x-auto rounded-sm border border-gold/70 bg-white">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="bg-navy text-[12px] text-white">
              <th colSpan={2} className="px-3 py-1.5 text-left font-bold">Outros Períodos de Parcelamento</th>
              <th colSpan={3} className="border-l border-white/20 px-2 py-1.5 font-bold">Arrecadação Mensal (Primeiros 12 meses)</th>
              <th className="border-l border-white/20 px-2 py-1.5 font-bold">Última Parcela</th>
              <th colSpan={3} className="border-l border-white/20 px-2 py-1.5 font-bold">Arrecadação Carteira</th>
            </tr>
            <tr className="bg-navy/90 text-[11.5px] text-white">
              <th className="px-3 py-1 text-left font-bold">Número de Parcelas</th>
              <th className="px-2 py-1 text-right font-bold">Valor da Parcela</th>
              <th className="border-l border-white/20 px-2 py-1 text-right font-bold">Empreendimento</th>
              <th className="px-2 py-1 text-right font-bold">Incorporador</th>
              <th className="px-2 py-1 text-right font-bold">Terrenista</th>
              <th className="border-l border-white/20 px-2 py-1 text-right font-bold">Terrenista</th>
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
                <td className="border-l border-gold/30 px-2 py-1 text-right">{fmtBRL(c.mensalTerFinal)}</td>
                <td className="border-l border-gold/30 px-2 py-1 text-right">{fmtBRL0(c.carteiraEmp)}</td>
                <td className="px-2 py-1 text-right">{fmtBRL0(c.carteiraInc)}</td>
                <td className="px-2 py-1 text-right font-semibold text-navy">{fmtBRL0(c.carteiraTer)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Resumo da proposta */}
      <div className={`grid gap-4 rounded-md border border-line bg-alt p-4 ${w >= 760 ? "grid-cols-[minmax(0,340px)_1fr]" : ""}`}>
        <div>
          <div className="mb-2 text-[12.5px] font-semibold text-navy">Divisão na proposta (sobre o VGV à vista)</div>
          {/* a mesma divisão da proposta: o corretor com o percentual digitado (2%), tirado de quem paga */}
          <div className="flex h-9 overflow-hidden rounded text-[11.5px] font-bold">
            <div className="grid place-items-center bg-gold text-navy" style={{ width: `${dv.ter * 100}%` }}>{fmtPct(dv.ter)}</div>
            <div className="grid place-items-center bg-navy text-white" style={{ width: `${dv.jbl * 100}%` }}>{fmtPct(dv.jbl)}</div>
            <div className="grid place-items-center bg-[#C9D3DE] text-navy" style={{ width: `${Math.max(dv.obras, 0) * 100}%` }}>{fmtPct(dv.obras)}</div>
            {dv.corretor > 0 && (
              <div className="grid place-items-center bg-[#6F86A3] text-white" style={{ width: `${dv.corretor * 100}%`, minWidth: 46 }} title={`Corretor ${fmtPct(dv.corretor)}`}>{fmtPct(dv.corretor)}</div>
            )}
          </div>
          <div className="mt-1.5 flex justify-between text-[11.5px] text-muted"><span>Proprietários</span><span>JBL</span><span>Obras</span>{dv.corretor > 0 && <span>Corretor</span>}</div>
          {invalid && <p className="mt-2 rounded border-l-[3px] border-rose-500 bg-rose-50 px-3 py-2 text-[12.5px] text-rose-700">O custo das obras passa da parte do incorporador.</p>}
        </div>
        <div className={`grid gap-px overflow-hidden rounded border border-line bg-line ${w >= 1000 ? "grid-cols-4" : "grid-cols-2"}`}>
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
    </LarguraCtx.Provider>
  );
}

/** Planilha nova: orçamento das obras item a item, com os preços da região */
function OrcamentoNovo({ s, r }: { s: State; r: ReturnType<typeof calcular> }) {
  const i = r.inputs;
  const orc = r.orcamento!;
  const imp = { ...IMPLANTA_PADRAO, ...i.implanta };
  const sel = "rounded-sm border border-[#9DC3E6] bg-[#DDEBF7] px-2 py-1 text-[13px] font-semibold text-navy outline-none focus:border-gold";
  const linha = "grid grid-cols-[1fr_minmax(118px,46%)] items-center gap-2 px-3 py-1";
  const grupoChave: Record<string, keyof Implanta | null> = {
    "Canteiro de obra": "canteiro", Energia: "energia", Pavimentação: null, "Rede de água": "agua", "Rede de esgoto": "esgoto", Drenagem: "drenagem", Paisagismo: "paisagismo",
  };
  return (
    <>
      <label className={linha}>
        <span className="text-[13px] font-semibold text-navy">Região do empreendimento</span>
        <select className={sel} value={orc.regiao} onChange={(e) => s.setOrcamento({ regiao: e.target.value as Regiao })}>
          {REGIOES.map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className={linha}>
        <span className="text-[13px] font-semibold text-navy">Pavimento</span>
        <select className={sel} value={i.pavimento || "CBUQ 3 cm"} onChange={(e) => s.setOrcamento({ pavimento: e.target.value })}>
          {Object.keys(PAVIMENTOS).map((x) => <option key={x}>{x}</option>)}
        </select>
      </label>
      <label className={linha}>
        <span className="text-[13px] font-semibold text-navy">Rede de energia</span>
        <select className={sel} value={i.energiaTipo ?? "aerea"} onChange={(e) => s.setOrcamento({ energiaTipo: e.target.value as "aerea" | "subterranea" })}>
          <option value="aerea">Aérea</option>
          <option value="subterranea">Subterrânea</option>
        </select>
      </label>
      {imp.canteiro && <In s={s} k="mesesObra" label="Meses de obra (custos mensais do canteiro)" />}
      {orc.grupos.map((g) => {
        const chave = grupoChave[g.nome];
        return (
          <details key={g.nome} className="px-3 py-1">
            <summary className="flex cursor-pointer items-center justify-between gap-2 text-[13px] font-semibold text-navy">
              <span className="flex items-center gap-2">
                {chave && (
                  <input
                    type="checkbox"
                    checked={imp[chave]}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => s.setOrcamento({ implanta: { [chave]: e.target.checked } })}
                    title="Implantará?"
                  />
                )}
                {g.nome}
              </span>
              <span className={`tabular ${g.implanta ? "" : "text-navy/40 line-through"}`}>{fmtBRL(g.implanta ? g.total : 0)}</span>
            </summary>
            <div className="mt-1 space-y-0.5 text-[12px] text-ink">
              {g.itens.map((x) => (
                <div key={x.nome} className="flex justify-between gap-2">
                  <span>{x.nome}: {x.unid === "×" ? `20% de ${fmtBRL(x.preco)}` : `${fmtNum(x.qtd)} ${x.unid} × ${fmtBRL(x.preco)}`}</span>
                  <span className="tabular">{fmtBRL(x.total)}</span>
                </div>
              ))}
              {g.aProjetar && <p className="font-semibold text-amber-800">{g.aProjetar}</p>}
            </div>
          </details>
        );
      })}
      <Out label="Custo das obras" value={fmtBRL(r.custoInfra)} strong />
      <Out label="Equivale por m² da área aproveitável" value={`${fmtBRL(r.custoInfraM2)}/m²`} />
    </>
  );
}

function Titulo({ children, n }: { children: React.ReactNode; n?: number }) {
  return <div className="flex items-center gap-2 bg-navy/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">{n && <Num n={n} />}{children}</div>;
}

/** Bloco da primeira etapa: medidas (azuis), quadras, áreas e resultado */
function EtapaBloco({ s, r }: { s: State; r: ReturnType<typeof calcular> }) {
  const i = r.inputs;
  const largo = useContext(LarguraCtx) >= 760;
  const off = !!i.etapaADefinir;
  const q = r.etapa1?.quadras ?? null;
  // lote da etapa = frente (vazia = a do estudo) × comprimento; com zero ou vazio não calcula
  const frenteE1 = i.frenteE1 && i.frenteE1 > 0 ? i.frenteE1 : i.frenteLote;
  const loteE1Ok = i.frenteE1 !== 0 && frenteE1 > 0 && !!(i.compLoteE1 && i.compLoteE1 > 0);
  const v = (x: string) => (off ? "a definir" : q ? x : "—");
  const m2 = (n: number) => `${fmtNum(n)} m²`;
  return (
    <div>
    <div className={`grid divide-gold/30 ${largo ? "grid-cols-2 divide-x" : ""}`}>
      <div className="divide-y divide-gold/30">
        <Titulo n={1}>Medidas da 1ª etapa</Titulo>
        {/* bloqueadas antes de 02/11/2026 seguem sobre a área aproveitável */}
        {i.e1PctAproveitavel ? (
          <Out label="Tamanho da área aproveitável (m²)" value={fmtNum(r.areaUtil)} />
        ) : (
          <Out label="Tamanho da área total do terreno (m²)" value={fmtNum(i.areaTotal)} />
        )}
        <In s={s} k="areaPerimetralE1" label="Perímetro da área da 1ª etapa (m)" hint="Comprimento da linha de quadras" disabled={off} />
        <In s={s} k="ruaE1" label="Largura das ruas entre as quadras (m)" disabled={off} />
        <In s={s} k="compQuadraE1" label="Comprimento da quadra (m)" hint="Vazio = uma quadra só, do tamanho da linha" disabled={off} />
        <In s={s} k="frenteE1" label="Frente do lote (m)" disabled={off} erro={i.frenteE1 === 0 ? "A frente não pode ser zero (vazio = a do estudo)" : null} />
        <In s={s} k="compLoteE1" label="Comprimento do lote (m)" disabled={off} erro={!(i.compLoteE1 && i.compLoteE1 > 0) ? "Preencha o comprimento (maior que zero)" : null} />
        <Out label="Metragem do lote (frente × comprimento)" value={off ? "a definir" : loteE1Ok ? `${fmtNum(frenteE1 * (i.compLoteE1 ?? 0))} m²` : "— preencha frente e comprimento"} />
        <In s={s} k="ruasObrigE1" label="Desconto de ruas contínuas vindas de fora" hint="Quantidade de ruas. × largura da rua, sai do perímetro (tira lotes, não muda a área)" disabled={off} />
        <In s={s} k="descontoE1" label="Outras medidas a descontar do perímetro (m)" hint="Tira lotes, não muda a área: 2.000 m − 200 m = os lotes são contados em 1.800 m" disabled={off} />
        <In s={s} k="valorM2Etapa1" label="Valor do m² do lote (1ª etapa)" hint="Obrigatório: sem ele a 1ª etapa não é calculada (não usa o m² do estudo)" disabled={off} />
        {r.etapa1FaltaValor && (
          <p className="bg-amber-50 px-3 py-2 text-[12.5px] font-semibold text-amber-800">
            Preencha o valor do m² do lote da 1ª etapa. Sem ele a etapa não é calculada, e na proposta aparece “a definir”.
          </p>
        )}
        <Titulo>Quadras</Titulo>
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
        <Out
          label={i.e1PctAproveitavel ? "Da área aproveitável" : "Da área total do terreno"}
          value={off ? "a definir" : r.etapa1 ? fmtPct(i.e1PctAproveitavel ? r.etapa1.pct : r.etapa1.pctTotal) : "—"}
        />
        <Out label="VGV parcial à vista" value={off ? "a definir" : r.etapa1 ? fmtBRL(r.etapa1.avista) : "—"} />
        <Out
          label={r.etapa1?.fin ? `VGV parcial em ${r.etapa1.fin.nParcelas} meses` : "VGV parcial a prazo"}
          value={off ? "a definir" : r.etapa1?.prazo != null ? fmtBRL(r.etapa1.prazo) : r.etapa1 ? "a definir (preencha o reajuste e os recebimentos)" : "—"}
          strong
        />
      </div>
    </div>
    {!off && <FinanciamentoEtapa s={s} r={r} />}
    {!off && r.etapa1 && <ParceriaEtapa s={s} r={r} />}
    {q && !off && <Desenho q={q} lote={r.etapa1!.lote} />}
    </div>
  );
}

/**
 * Reajuste e recebimentos da 1ª etapa: é outra etapa, com outras taxas. Mesmas contas do quadro do
 * estudo. Os 6 números são obrigatórios (mesmo que zero): faltando um, a etapa a prazo fica "a definir".
 */
function FinanciamentoEtapa({ s, r }: { s: State; r: ReturnType<typeof calcular> }) {
  const i = r.inputs;
  const largo = useContext(LarguraCtx) >= 760;
  const f = r.etapa1?.fin ?? null;
  const exigido = !!i.finE1Exigido;
  const falta = (k: (typeof FIN_E1)[number]) => (exigido && (i[k] === null || i[k] === undefined) ? "Obrigatório (mesmo que seja zero)" : null);
  const est = (k: NumKey) => (exigido ? "obrigatório" : `${toText(i[k] as number, KINDS[k]!)} (estudo)`);
  const v = (x: (f: NonNullable<NonNullable<typeof r.etapa1>["fin"]>) => string) => (f ? x(f) : "a definir");
  const indice = i.indiceE1 || i.indice;
  return (
    <div className={`grid border-t border-gold/30 ${largo ? "grid-cols-2 divide-x divide-gold/30" : ""}`}>
      <div className="flex flex-col divide-y divide-gold/30">
        <Titulo n={2}>Reajuste da 1ª etapa</Titulo>
        <label className="grid grid-cols-[1fr_minmax(118px,46%)] items-center gap-2 px-3 py-1">
          <span className="text-[13px] font-semibold text-navy">Índice Financeiro</span>
          <select
            value={indice}
            onChange={(e) => s.setIndiceE1(e.target.value)}
            className="rounded-sm border border-[#9DC3E6] bg-[#DDEBF7] py-1 pl-2 text-[13.5px] font-semibold text-navy outline-none focus:border-gold"
          >
            {INDICES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <In s={s} k="ipcaE1" label={`${indice} ao ano`} ph={est("ipca")} erro={falta("ipcaE1")} />
        <In s={s} k="jurosMesE1" label="Juros (Mês)" ph={est("jurosMes")} erro={falta("jurosMesE1")} />
        <In s={s} k="jurosAnoE1" label="Juros (Ano)" ph={est("jurosAno")} erro={falta("jurosAnoE1")} />
        <Out label="Total do Reajuste" value={v((f) => fmtPct(f.reajuste))} strong />
        <Observacoes s={s} k="obsEtapa1" titulo="Observações da 1ª etapa" />
      </div>
      <div className="divide-y divide-gold/30">
        <Titulo n={3}>Recebimentos da 1ª etapa</Titulo>
        <Out label="Valor do Lote da 1ª etapa" value={v((f) => fmtBRL(f.valorLote))} strong />
        <In s={s} k="entradaPctE1" label="Entrada (%)" ph={est("entradaPct")} erro={falta("entradaPctE1")} />
        <Out label="Valor da Entrada" value={v((f) => fmtBRL(f.entrada))} />
        <In s={s} k="multiplicadorE1" label="Multiplicador para encontrar a Parcela" ph={est("multiplicador")} erro={falta("multiplicadorE1")} />
        <In s={s} k="anosE1" label="Em quantos Anos ocorrerá o Parcelamento" ph={est("anos")} erro={falta("anosE1")} />
        <Out label="Número de Parcelas" value={v((f) => String(f.nParcelas))} />
        <Out label="Valor da Parcela com Desconto (pagamento em dia)" value={v((f) => fmtBRL(f.parcela))} strong />
        <Out label="Valor da Parcela que vai para o Contrato" value={v((f) => fmtBRL(f.parcelaContrato))} />
        <Out label="Valor do Lote em Contrato" value={v((f) => fmtBRL(f.valorLoteContrato))} />
        <Out label={`VGV a prazo da 1ª etapa (${f?.nParcelas ?? r.nParcelas} meses)`} value={v((f) => fmtBRL(f.cenario.carteiraEmp))} strong />
        <Out label="Parte do Incorporador" value={v((f) => fmtBRL(f.cenario.carteiraInc))} navy />
        <Out label="Parte do Terrenista" value={v((f) => fmtBRL(f.cenario.carteiraTer))} navy />
      </div>
    </div>
  );
}

/**
 * Parceria da 1ª etapa: o incorporador e o terrenista podem negociar outros % para a etapa (e o corretor).
 * Só na planilha (uso interno): a proposta continua com os % da gleba geral. Vazio = igual à gleba geral.
 */
function ParceriaEtapa({ s, r }: { s: State; r: ReturnType<typeof calcular> }) {
  const i = r.inputs;
  const e = r.etapa1!;
  const prazo = e.prazo;
  const anos = e.fin ? e.fin.nParcelas / 12 : r.nParcelas / 12;
  const inc = i.incorporadorPctE1 ?? i.incorporadorPct;
  const ter = 1 - inc;
  const pct = i.intermediacaoPctE1 ?? i.intermediacaoPct ?? 0;
  const origem = i.intermediacaoOrigemE1 ?? i.intermediacaoOrigem ?? "inc";
  // como na gleba geral: o % do corretor incide sobre a parte de quem paga
  const deInc = origem !== "ter" ? pct * inc : 0;
  const deTer = origem !== "inc" ? pct * ter : 0;
  const pctTxt = `${fmtNum(pct * 100, Number.isInteger(Math.round(pct * 1e4) / 100) ? 0 : 2)}%`;
  const aPrazo = (x: number) => (prazo != null ? fmtBRL(prazo * x) : "a definir (preencha o reajuste e os recebimentos)");
  const rotPrazo = `a prazo (${fmtNum(anos, anos % 1 ? 1 : 0)} anos)`;
  const largo = useContext(LarguraCtx) >= 760;
  return (
    // metade da largura (como as colunas dos quadros de cima) na janela larga
    <div className={`border-t border-gold/30 ${largo ? "grid grid-cols-2" : ""}`}>
      <div className={`divide-y divide-gold/30 ${largo ? "border-r border-gold/30" : ""}`}>
        <Titulo n={4}>Parceria da 1ª etapa (uso interno)</Titulo>
        <p className="px-3 py-1.5 text-[12px] leading-snug text-muted">
          Os % que o incorporador e o terrenista negociarem para a 1ª etapa. Só aparecem aqui na planilha; a proposta continua com os % da gleba geral.
        </p>
        <In s={s} k="incorporadorPctE1" label="Incorporador (%)" igual={i.incorporadorPct} />
        <Out label="VGV Incorporador à vista" value={fmtBRL(e.avista * inc)} navy />
        <Out label={`VGV Incorporador ${rotPrazo}`} value={aPrazo(inc)} navy />
        <Out label="Terrenista (%)" value={fmtNum(ter * 100)} sufixo="%" strong />
        <Out label="VGV Terrenista à vista" value={fmtBRL(e.avista * ter)} navy />
        <Out label={`VGV Terrenista ${rotPrazo}`} value={aPrazo(ter)} navy />
        <In s={s} k="intermediacaoPctE1" label="Corretor (%)" igual={i.intermediacaoPct} />
        {pct > 0 && (
          <>
            <label className="grid grid-cols-[1fr_minmax(118px,46%)] items-center gap-2 px-3 py-1">
              <span className="text-[13px] font-semibold text-navy">Corretor pago por</span>
              <select className="rounded-sm border border-[#9DC3E6] bg-[#DDEBF7] px-2 py-1 text-[13px] font-semibold text-navy outline-none focus:border-gold" value={origem} onChange={(ev) => s.setCorretor({ intermediacaoOrigemE1: ev.target.value as "inc" | "ter" | "ambos" })}>
                <option value="inc">Incorporador (JBL)</option>
                <option value="ter">Terrenista</option>
                <option value="ambos">Incorporador e terrenista</option>
              </select>
            </label>
            <Out label="VGV Corretor à vista" value={fmtBRL(e.avista * (deInc + deTer))} navy />
            <Out label={`VGV Corretor ${rotPrazo}`} value={aPrazo(deInc + deTer)} navy />
            <p className="px-3 pb-1 text-[12px] leading-snug text-muted">
              {[
                deInc ? `${pctTxt} de ${fmtBRL(e.avista * inc)} (VGV Incorporador) = ${fmtBRL(e.avista * deInc)}` : "",
                deTer ? `${pctTxt} de ${fmtBRL(e.avista * ter)} (VGV Terrenista) = ${fmtBRL(e.avista * deTer)}` : "",
              ].filter(Boolean).join(" + ")}
            </p>
          </>
        )}
      </div>
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
      <svg viewBox={`0 0 ${W} 166`} className="h-auto w-full" role="img" aria-label="Linha de quadras da primeira etapa">
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
                {/* numa linha abaixo das outras, centralizado no trecho azul (sem passar da borda) */}
                <line x1={p.x + p.w / 2} x2={p.x + p.w / 2} y1={Y + H + 2} y2={Y + H + 36} stroke="#2E6DB4" strokeDasharray="2 2" />
                {(() => {
                  const t = `ruas contínuas ${q.ruasObrig} × ${n(q.rua)} m`;
                  const meia = t.length * 3.2;
                  const cx = Math.min(W - 4 - meia, Math.max(meia + 4, p.x + p.w / 2));
                  return <text x={cx} y={Y + H + 48} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2E6DB4">{t}</text>;
                })()}
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
        <text x={W / 2} y={160} textAnchor="middle" fontSize="11.5" fill="#122A45">
          {`${q.quarteiroes} quadras · ${q.ruasEntre} ruas de ${n(q.rua)} m · frente ${n(q.frente)} m × fundo ${n(q.fundo, 1)} m = lote ${n(lote)} m²`}
        </text>
      </svg>
      {/* legenda: só o que aparece neste desenho */}
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-navy">
        {[
          { tem: true, nome: "Quadra (cada risco é a divisa de um lote)", st: { background: "repeating-linear-gradient(90deg, #F7F2E7 0 5px, #C1943D 5px 6px)", border: "1.5px solid #C1943D", borderRadius: 3 } },
          { tem: t.some((x) => x.tipo === "rua"), nome: "Rua entre as quadras", st: { background: "#DDE3E9" } },
          { tem: t.some((x) => x.tipo === "obrig"), nome: "Ruas contínuas vindas de fora (descontadas do perímetro)", st: { background: "repeating-linear-gradient(-45deg, #EAF1FB 0 3px, rgba(46,109,180,.45) 3px 5px)", border: "1px dashed #2E6DB4" } },
          { tem: t.some((x) => x.tipo === "desconto"), nome: "Outras medidas descontadas (sem lotes)", st: { background: "repeating-linear-gradient(45deg, #fff 0 3px, rgba(192,57,43,.45) 3px 5px)", border: "1px dashed #C0392B" } },
          { tem: t.some((x) => x.tipo === "sobra"), nome: "Sobra (não cabe outra quadra)", st: { background: "#F7F2E7", border: "1px dashed #ECE1C4" } },
        ]
          .filter((l) => l.tem)
          .map((l) => (
            <span key={l.nome} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-3.5 w-6 shrink-0" style={l.st} />
              {l.nome}
            </span>
          ))}
      </div>
    </div>
  );
}
