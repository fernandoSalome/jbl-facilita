"use client";

import * as Icones from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FONTES, SECOES, type Resposta } from "@/lib/captacao";
import { FORMATO, opcoesDo, type Item } from "@/lib/checklist-formato";
import { valorAtual } from "@/lib/checklist-salvar";
import { chamar } from "./chamar";

type Derivada = Resposta & { aba?: string };
export type Cabecalho = { titulo: string; etapa: string; dono: string; area: string; municipio: string };

const Icone = ({ nome, className }: { nome: string; className?: string }) => {
  const C = (Icones as unknown as Record<string, Icones.LucideIcon>)[nome] ?? Icones.Circle;
  return <C className={className} strokeWidth={1.7} aria-hidden />;
};

/** Ícone pequeno de cada linha, pelo assunto da pergunta */
const PISTAS: [RegExp, string][] = [
  [/^nome$/i, "Tag"],
  [/endere[çc]o/i, "MapPin"],
  [/extens|per[ií]metro|faixa de dom/i, "Ruler"],
  [/infra|redes|pavimenta/i, "Wrench"],
  [/parceria|aporte|cart[óo]rio faz/i, "Handshake"],
  [/pre[çc]o|valor|taxa|renda|ticket|iptu|itbi|pagamento|registro d|publica/i, "Banknote"],
  [/popula|moradores|jovens|\bidade|classe|perfil|herdeir|corretor|profission|engenheir/i, "Users"],
  [/velocidade/i, "Gauge"],
  [/pib|cresce|desenvolv|potencial|estoque/i, "TrendingUp"],
  [/viol[eê]ncia|furto|roubo|invas/i, "Siren"],
  [/empreg|empresa|investidor/i, "Briefcase"],
  [/tur[ií]st|praian|est[aâ]ncia/i, "Camera"],
  [/clima|chuva/i, "Sun"],
  [/[aá]gua|esgoto|drenag|po[çc]o|c[oó]rrego|nascente|len[çc]ol|alag|rio/i, "Droplets"],
  [/energia|transmiss|e[oó]lica/i, "Zap"],
  [/lei|zona|diretriz|certid|decreto|legisla|matr[ií]cula|car\b|ccir|sigef/i, "Scale"],
  [/mata|app|apa|reserva|bioma|vegeta|ambient|supress|parque/i, "Leaf"],
  [/lote|quadra|desdobro|desmembr|chacre|condom|m[oó]dulo/i, "Grid3x3"],
  [/via|rodovia|acesso|[ôo]nibus|dist[âa]ncia|cul-de-sac|cal[çc]ada/i, "Car"],
  [/relevo|declividade|solo|aterro|terraplen/i, "Mountain"],
  [/levantamento|topogr|georref|planialt|kmz|croqui/i, "Compass"],
];
/** Sem assunto conhecido, o ícone vem do tipo do campo */
const PELO_TIPO: Record<string, string> = { doc: "FileText", rs: "Banknote", pct: "Percent", num: "Hash", sn: "CircleHelp", sna: "CircleHelp", snp: "CircleHelp", ap: "BadgeCheck", long: "NotebookPen", sel: "ListChecks", txt: "PenLine" };
const iconeDaLinha = (it: Item) => PISTAS.find(([re]) => re.test(it.p))?.[1] ?? PELO_TIPO[it.tipo] ?? "PenLine";

function Campo({ it, valor, mudar }: { it: Item; valor: string; mudar: (v: string) => void }) {
  const ops = opcoesDo(it);
  if (it.tipo !== "sel" && ops.length) {
    const fora = valor && !ops.includes(valor);
    return (
      <div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {ops.map((o) => (
            <label key={o} className="inline-flex cursor-pointer items-center gap-1.5 text-[14px] text-navy">
              <input type="radio" className="h-4 w-4 accent-[#b8923f]" checked={valor === o} onChange={() => mudar(o)} onClick={() => valor === o && mudar("")} />
              {o}
            </label>
          ))}
        </div>
        {fora && <p className="mt-1 text-[12px] text-muted" title={valor}>Anotado: {valor.slice(0, 120)}</p>}
      </div>
    );
  }
  const base = "w-full rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-navy placeholder:text-muted/70 focus:border-gold focus:outline-none";
  if (it.tipo === "sel")
    return (
      <select className={base} value={ops.includes(valor) || !valor ? valor : "__outro"} onChange={(e) => mudar(e.target.value === "__outro" ? valor : e.target.value)}>
        <option value="">{it.ph ?? "Selecione…"}</option>
        {ops.map((o) => <option key={o} value={o}>{o}</option>)}
        {valor && !ops.includes(valor) && <option value="__outro">{valor.slice(0, 60)}</option>}
      </select>
    );
  if (it.tipo === "long") return <textarea className={`${base} min-h-[72px] resize-y`} rows={3} value={valor} placeholder={it.ph ?? "Escreva…"} onChange={(e) => mudar(e.target.value)} />;
  const prefixo = it.tipo === "rs" ? "R$" : null;
  const sufixo = it.tipo === "pct" ? "%" : null;
  return (
    <div className="relative">
      {prefixo && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12.5px] font-bold text-navy">{prefixo}</span>}
      <input className={`${base} ${prefixo ? "pl-10" : ""} ${sufixo ? "pr-8" : ""}`} inputMode={it.tipo === "txt" ? undefined : "decimal"} value={valor}
        placeholder={it.ph ?? (it.tipo === "rs" ? "Digite o valor…" : it.tipo === "pct" ? "Informe o percentual…" : it.tipo === "num" ? "Digite o número…" : "Escreva…")}
        onChange={(e) => mudar(e.target.value)} />
      {sufixo && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-bold text-muted">{sufixo}</span>}
    </div>
  );
}

/**
 * Checklist do estudo no modelo pedido em 23/11/2026 (foto do Fernando, como o checklist do Word): as 30 seções
 * numa página só, cada uma com a faixa do progresso e quadros com ícone, e o campo certo para cada item.
 * "Salvar e Continuar" grava o que mudou e desce para a próxima seção. Os 265 itens estão em checklist-formato.ts.
 */
export default function ChecklistEstudo({ id, cab, todas }: { id: string; cab: Cabecalho; todas: Derivada[] }) {
  const router = useRouter();
  const [secao, setSecao] = useState(0);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [resumo, setResumo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const ch = (k: number, p: string) => `${k}|${p}`;

  // todas as seções numa página só, para rolar (pedido 23/11/2026); a seção na tela é a "atual" do rodapé
  const original = useMemo(() => Object.fromEntries(SECOES.flatMap((s, k) => s.perguntas.map((p) => [ch(k, p), valorAtual(todas, k, p)?.resposta ?? ""]))), [todas]);
  useEffect(() => setValores(original), [original]);
  useEffect(() => {
    const obs = new IntersectionObserver((es) => {
      const vis = es.filter((e) => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
      if (vis) setSecao(Number((vis.target as HTMLElement).dataset.secao));
    }, { rootMargin: "-20% 0px -60% 0px" });
    document.querySelectorAll("[data-secao]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const feitosDa = (k: number) => SECOES[k].perguntas.filter((p) => (valores[ch(k, p)] ?? "").trim()).length;
  const mudadas = (k: number) => SECOES[k].perguntas.filter((p) => (valores[ch(k, p)] ?? "") !== (original[ch(k, p)] ?? ""));
  const irPara = (k: number) => document.getElementById(`secao-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  async function salvar(proxima: boolean) {
    setBusy(true);
    setMsg("");
    try {
      const secoes = SECOES.map((_, k) => k).filter((k) => mudadas(k).length);
      for (const k of secoes) {
        await chamar(`/api/areas/${id}/checklist`, "PUT", { secao: k, valores: Object.fromEntries(mudadas(k).map((p) => [p, valores[ch(k, p)] ?? ""])) });
      }
      if (secoes.length) router.refresh();
      if (proxima && secao < SECOES.length - 1) irPara(secao + 1);
      else setMsg(secoes.length ? "✅ Salvo." : "Nada mudou.");
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  const info: [string, string, string][] = [["Landmark", "Proprietário", cab.dono], ["Scan", "Área", cab.area], ["Building2", "Município", cab.municipio], ["CalendarDays", "Data", hoje]];
  const extras = todas.filter((r) => r.secao === secao && !SECOES[secao].perguntas.includes(r.pergunta));

  return (
    <div className="grid gap-5">
      <div className="relative overflow-hidden rounded-xl bg-[#0f2240] px-8 py-7 text-white">
        {/* mar e costa desenhados (sem foto): o tom da faixa do modelo */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_120%,#2f7fa8_0%,transparent_55%),radial-gradient(ellipse_at_55%_-20%,#3a6b4a_0%,transparent_45%),linear-gradient(90deg,#0f2240_0%,#16305a_40%,#1d5a86_75%,#163a66_100%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-display text-[40px] leading-none">JBL Facilita</div>
            <div className="mt-3 text-[12px] tracking-[0.32em] text-white/75">PLANEJAMENTO <span className="text-gold">•</span> <b className="text-white">ANÁLISE</b> <span className="text-gold">•</span> <b className="text-white">REALIZAÇÃO</b></div>
          </div>
          <div className="border-l-2 border-gold/80 pl-6 font-display text-[18px] italic leading-snug text-white/95">Grandes projetos<br />começam com uma análise sólida.</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-5">
        <div className="flex flex-1 items-center gap-4">
          <Icone nome="MapPinned" className="h-14 w-14 shrink-0 text-gold" />
          <div>
            <h2 className="font-display text-[34px] leading-tight text-navy">Checklist do Estudo</h2>
            <div className="text-[18px] font-medium text-navy">{cab.titulo} <span className="mx-1.5 text-navy/50">|</span> {cab.etapa}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-white px-4 py-3 shadow-sm md:flex md:items-center md:gap-0">
          {info.map(([ic, t, v], k) => (
            <div key={t} className={`flex items-center gap-2.5 md:px-5 ${k ? "md:border-l-2 md:border-gold-line" : ""}`}>
              <Icone nome={ic} className="h-8 w-8 text-gold" />
              <div className="text-[13.5px] leading-tight"><div className="text-navy">{t}</div><div className="text-navy">{v || "—"}</div></div>
            </div>
          ))}
        </div>
      </div>

      {SECOES.map((s, k) => {
        const feitos = feitosDa(k), total = s.perguntas.length, pct = Math.round((feitos / total) * 100);
        return (
          <div key={k} id={`secao-${k}`} data-secao={k} className="grid scroll-mt-4 gap-5">
            <div className="flex flex-wrap items-center gap-6 rounded-xl bg-[#0f2240] px-7 py-4 text-white">
              <div className="min-w-0 flex-1">
                <div className="font-display text-[26px] font-semibold leading-tight"><span className="text-gold">{String(k + 1).padStart(2, "0")}.</span> {s.titulo}</div>
                <div className="text-[15px] text-white/90">{feitos} de {total} itens concluídos</div>
              </div>
              <div className="h-4 w-full max-w-xl flex-1 overflow-hidden rounded-full bg-[#d9dce2] md:w-auto">
                <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
              </div>
              <div className="text-[30px] font-semibold">{pct}%</div>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {FORMATO[k].map((g) => (
                <section key={g.titulo} className="rounded-xl border border-line bg-white p-5 shadow-sm">
                  <h3 className="flex items-center gap-3 border-b border-line pb-3 font-display text-[21px] font-semibold text-navy">
                    <Icone nome={g.icone} className="h-8 w-8 text-gold" /> {g.titulo}
                  </h3>
                  <div className="mt-3 grid gap-3">
                    {g.itens.map((it) => {
                      const r = valorAtual(todas, k, it.p);
                      const v = valores[ch(k, it.p)] ?? "";
                      const deOutro = r && r.fonte !== "manual" && v === r.resposta;
                      return (
                        <div key={it.p} className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:gap-4">
                          <div className="flex items-start gap-2.5 pt-1.5 text-[15px] text-navy">
                            <Icone nome={iconeDaLinha(it)} className="mt-0.5 h-[18px] w-[18px] shrink-0 text-navy" />
                            <span>{it.p}</span>
                          </div>
                          <div>
                            <Campo it={it} valor={v} mudar={(x) => setValores((o) => ({ ...o, [ch(k, it.p)]: x }))} />
                            {deOutro && <p className="mt-1 text-[11.5px] text-gold-ink">⚡ {FONTES[r.fonte].rotulo} · {r.ref}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        );
      })}

      <div className="sticky bottom-0 z-10 -mx-8 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-[#eef0f4]/95 px-8 py-3 backdrop-blur">
        <button className="inline-flex items-center gap-2.5 rounded-full border-2 border-navy bg-white px-8 py-2.5 text-[16px] font-semibold text-navy disabled:opacity-40" disabled={!secao || busy} onClick={() => irPara(secao - 1)}>
          <Icones.ArrowLeft className="h-5 w-5" /> Voltar
        </button>
        <button className="inline-flex items-center gap-2.5 rounded-full border-2 border-navy bg-white px-10 py-2.5 text-[16px] font-semibold text-navy" onClick={() => setResumo(true)}>
          <Icones.List className="h-5 w-5" /> Ver Resumo da Etapa
        </button>
        <div className="flex items-center gap-3">
          {msg && <span className="text-[13px] font-semibold text-navy">{msg}</span>}
          <button className="inline-flex items-center gap-2.5 rounded-full bg-gold px-9 py-3 text-[16px] font-bold text-navy shadow disabled:opacity-60" disabled={busy} onClick={() => salvar(true)}>
            {busy ? "Salvando…" : "Salvar e Continuar"} <Icones.ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {resumo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" onClick={() => setResumo(false)}>
          <div className="card max-h-[85vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl text-navy">{String(secao + 1).padStart(2, "0")}. {SECOES[secao].titulo}</h3>
            <p className="text-[13px] text-muted">{feitosDa(secao)} de {SECOES[secao].perguntas.length} itens preenchidos</p>
            <dl className="mt-4 grid gap-2 text-[14px]">
              {SECOES[secao].perguntas.map((p) => {
                const v = valores[ch(secao, p)];
                return (
                  <div key={p} className="grid gap-1 border-b border-line pb-2 md:grid-cols-[220px_1fr]">
                    <dt className="text-muted">{p}</dt>
                    <dd className={v ? "text-navy" : "italic text-muted/70"}>{v || "pendente"}</dd>
                  </div>
                );
              })}
              {extras.map((r, n) => (
                <div key={`e${n}`} className="grid gap-1 border-b border-line pb-2 md:grid-cols-[220px_1fr]">
                  <dt className="text-muted">{r.pergunta}</dt>
                  <dd className="text-navy">{r.resposta} <span className="text-[11.5px] text-muted">({FONTES[r.fonte].rotulo} · {r.ref})</span></dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 text-right"><button className="btn-ghost" onClick={() => setResumo(false)}>Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
