"use client";

import ValidadeField from "./ValidadeField";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StudyInputs } from "@/lib/calc";
import type { FormatoContent } from "@/lib/formatos";
import { dataDaProposta, type Overrides, type ProposalOptions } from "@/lib/proposals";
import DataField from "./DataField";
import { fmtDate } from "@/lib/format";
import { tratamento } from "@/lib/destinatario";
import { MSG_KEY, montarMensagem, saudacao } from "@/lib/mensagem";
import { linkProposta } from "@/lib/site";
import DestinatarioPicker from "./DestinatarioPicker";
import JblPadrao from "@/components/template/JblPadrao";
import ModoToggle from "@/components/template/ModoToggle";
import StudyEditor, { useStudyState } from "@/components/study/StudyEditor";
import Modal from "@/components/ui/Modal";
import StatusBadge from "./StatusBadge";
import LetterModal from "./LetterModal";

/**
 * Tela de edição da proposta: tudo salva sozinho e qualquer alteração pode ser
 * desfeita (↶ / Ctrl+Z) ou refeita (↷ / Ctrl+Y).
 */

type Meta = { name: string; ownerName: string; ownerPhone: string; options: ProposalOptions };
type Data = { meta: Meta; inputs: StudyInputs };
type Hist = { kind: "ov"; k: string; prev: unknown; next: unknown } | { kind: "data"; prev: Data; next: Data };

type Props = {
  formato: FormatoContent;
  /** a proposta usa uma versão anterior do template */
  templateDesatualizado?: boolean;
  /** carta de intenção recebida por esta proposta */
  carta?: { id: string; minutaStatus: string } | null;
  proposal: {
    id: string; name: string; ownerName: string; ownerPhone: string | null; status: string; rawStatus: string; publicToken: string;
    publishedAt: string | null; expiresAt: string | null; createdAt: string; template: string;
    inputs: StudyInputs; options: ProposalOptions; overrides: Overrides;
    /** Bloqueada para edição (só visualização) e quem bloqueou */
    lockedAt?: string | null; lockedBy?: string | null;
    /** Páginas do último PDF, se ainda vale para a proposta como está */
    pdfPages?: number | null;
  };
  project: { id: string; name: string; tipo: string; municipio: string; uf: string; matricula: string | null; aerialImage: string | null };
};

/* ---------------- painel de números (salva sozinho) ---------------- */

function NumbersPanel({ value, onChange, dataAtual }: { value: Data; onChange: (d: Data) => void; dataAtual?: string }) {
  const study = useStudyState(value.inputs);
  const first = useRef(true);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    if (first.current) return void (first.current = false);
    onChange({ ...latest.current, inputs: study.inputs });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study.inputs]);
  const m = value.meta;
  const setMeta = (patch: Partial<Meta>) => onChange({ ...value, meta: { ...m, ...patch } });
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]">
        <label><span className="label">Nome da proposta</span><input className="input" value={m.name} onChange={(e) => setMeta({ name: e.target.value })} /></label>
        <label><span className="label">Proprietário</span><input className="input" value={m.ownerName} onChange={(e) => setMeta({ ownerName: e.target.value })} /></label>
        <label><span className="label">WhatsApp</span><input className="input" value={m.ownerPhone} onChange={(e) => setMeta({ ownerPhone: e.target.value })} /></label>
      </div>
      <DataField value={m.options.data} atual={dataAtual} onChange={(v) => setMeta({ options: { ...m.options, data: v } })} />
      <StudyEditor state={study} />
    </div>
  );
}

/* ---------------- altura da faixa da planilha ---------------- */

const ALTURA_KEY = "jbl-planilha-altura";

/** Altura da faixa da planilha, puxada pela alça de baixo (guardada neste aparelho). Vazio = 56% da tela. */
function useAlturaPlanilha() {
  const ref = useRef<HTMLDivElement>(null);
  const [altura, setAltura] = useState<number | null>(null);
  useEffect(() => {
    try {
      const salva = Number(localStorage.getItem(ALTURA_KEY));
      if (salva > 0) setAltura(Math.min(salva, window.innerHeight - 90));
    } catch {}
  }, []);
  function puxar(e: React.PointerEvent) {
    e.preventDefault();
    const topo = ref.current?.getBoundingClientRect().top ?? 0;
    let ultima = altura;
    const mover = (ev: PointerEvent) => {
      ultima = Math.round(Math.min(Math.max(ev.clientY - topo, 160), window.innerHeight - topo - 8));
      setAltura(ultima);
    };
    const soltar = () => {
      document.removeEventListener("pointermove", mover);
      document.removeEventListener("pointerup", soltar);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      try {
        if (ultima) localStorage.setItem(ALTURA_KEY, String(ultima));
      } catch {}
    };
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
    document.addEventListener("pointermove", mover);
    document.addEventListener("pointerup", soltar);
  }
  function padrao() {
    setAltura(null);
    try {
      localStorage.removeItem(ALTURA_KEY);
    } catch {}
  }
  return { ref, altura, puxar, padrao };
}

/* ------------------------------------------------------------ tela */

export default function ProposalEditor({ formato, proposal: p, project, templateDesatualizado, carta }: Props) {
  const [cartaAberta, setCartaAberta] = useState(false);
  // bloqueada para edição: abre só para ver, sem nenhum controle de edição
  const bloqueada = !!p.lockedAt;
  const [mode, setMode] = useState<"edit" | "preview">(bloqueada ? "preview" : "edit");
  const [numbersOpen, setNumbersOpen] = useState(false);
  const [numbersKey, setNumbersKey] = useState(0);
  const [overrides, setOverrides] = useState<Overrides>(p.overrides);
  const [data, setData] = useState<Data>({
    meta: { name: p.name, ownerName: p.ownerName, ownerPhone: p.ownerPhone ?? "", options: p.options },
    inputs: p.inputs,
  });
  const [hist, setHist] = useState<Hist[]>([]);
  const [pos, setPos] = useState(0); // quantas entradas do histórico estão aplicadas
  const [pending, setPending] = useState(0);
  const [saved, setSaved] = useState<"ok" | "erro" | null>(null);
  const [gravacoes, setGravacoes] = useState(0); // refaz o número de páginas do PDF depois de gravar
  const [sendOpen, setSendOpen] = useState(false);
  const [published, setPublished] = useState(p.rawStatus !== "rascunho");
  // prazo do link: vence no envio + dias. A data gravada vale enquanto o prazo não muda aqui
  // (ex.: depois de "Reabrir +7 dias" ela é diferente da conta)
  const [enviadaEm, setEnviadaEm] = useState(p.publishedAt);
  const prazoInicial = useRef({ dias: p.options.validadeDias, sem: !!p.options.semValidade });
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const faixa = useAlturaPlanilha();
  // a faixa da planilha gruda logo abaixo da barra do topo (a altura da barra muda com a largura da tela)
  const barra = useRef<HTMLDivElement>(null);
  const [alturaBarra, setAlturaBarra] = useState(110);
  useEffect(() => {
    const el = barra.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAlturaBarra(Math.round(el.getBoundingClientRect().height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ovRef = useRef(overrides);
  ovRef.current = overrides;
  const dataRef = useRef(data);
  dataRef.current = data;

  /* ---------- gravação ---------- */
  const patch = useCallback(
    async (body: object) => {
      setPending((n) => n + 1);
      try {
        const r = await fetch(`/api/proposals/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        setSaved(r.ok ? "ok" : "erro");
        if (r.ok) setGravacoes((n) => n + 1);
      } catch {
        setSaved("erro");
      } finally {
        setPending((n) => n - 1);
      }
    },
    [p.id],
  );

  const push = useCallback(
    (h: Hist) => {
      setHist((old) => [...old.slice(0, pos), h].slice(-200));
      setPos((n) => Math.min(n + 1, 200));
    },
    [pos],
  );

  function applyOv(k: string, v: unknown) {
    setOverrides((o) => {
      const n = { ...o };
      if (v === null || v === undefined) delete n[k];
      else n[k] = v;
      return n;
    });
    return patch({ overrides: { [k]: v ?? null } });
  }

  const saveOverride = useCallback(
    async (k: string, v: unknown) => {
      const prev = k in ovRef.current ? ovRef.current[k] : null;
      push({ kind: "ov", k, prev, next: v });
      await applyOv(k, v);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [push],
  );

  // Números e dados básicos: grava 700 ms depois de parar de digitar; um bloco de digitação = um passo do desfazer
  const burst = useRef<{ start: Data; timer: ReturnType<typeof setTimeout> } | null>(null);
  function bodyFor(d: Data) {
    return { name: d.meta.name, ownerName: d.meta.ownerName, ownerPhone: d.meta.ownerPhone, options: d.meta.options, inputs: d.inputs };
  }
  function changeData(next: Data) {
    if (!burst.current) burst.current = { start: dataRef.current, timer: setTimeout(() => {}, 0) };
    clearTimeout(burst.current.timer);
    setData(next);
    burst.current.timer = setTimeout(() => {
      const start = burst.current!.start;
      burst.current = null;
      push({ kind: "data", prev: start, next: dataRef.current });
      patch(bodyFor(dataRef.current));
    }, 700);
  }

  const setOptions = (o: Partial<ProposalOptions>) => changeData({ ...data, meta: { ...data.meta, options: { ...data.meta.options, ...o } } });

  function setDataAndSave(d: Data) {
    setData(d);
    setNumbersKey((n) => n + 1); // o painel volta a mostrar os valores certos
    patch(bodyFor(d));
  }

  const undo = useCallback(() => {
    if (pos === 0) return;
    const h = hist[pos - 1];
    if (h.kind === "ov") applyOv(h.k, h.prev);
    else setDataAndSave(h.prev);
    setPos(pos - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hist, pos]);

  const redo = useCallback(() => {
    if (pos >= hist.length) return;
    const h = hist[pos];
    if (h.kind === "ov") applyOv(h.k, h.next);
    else setDataAndSave(h.next);
    setPos(pos + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hist, pos]);

  // Ctrl+Z / Ctrl+Y fora de campos de texto (dentro deles vale o desfazer do próprio campo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(t.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Avisa antes de fechar se ainda há algo sendo gravado
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (pending > 0 || burst.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [pending]);

  /* ---------- envio ---------- */
  // link enviado ao cliente: sempre o da Vercel
  const publicUrl = linkProposta(p.publicToken);
  // mensagem do template (vale para todas as propostas), com o nome escolhido em "Proposta para",
  // o tipo de loteamento, a gleba, o link e a saudação pela hora de São Paulo
  const trat = tratamento(data.meta.options.destinatario);
  const message = montarMensagem(formato.overrides?.[MSG_KEY], {
    saudacao: saudacao(),
    nome: trat.nome ? trat.rotulo : data.meta.ownerName,
    tipo: formato.label,
    gleba: project.name,
    link: publicUrl,
  });
  // mensagem escrita à mão nesta proposta (a partir de 26/10/2026) ou a do template;
  // as salvas antes (mensagemEnvio, com o link antigo) deixam de valer e todas seguem o template
  const salva = data.meta.options.msgEnvio?.trim() ? data.meta.options.msgEnvio : null;
  const [msgEdit, setMsgEdit] = useState<string | null>(null);
  const texto = msgEdit ?? salva ?? message;
  const salvarMensagem = (v: string) => {
    changeData({ ...data, meta: { ...data.meta, options: { ...data.meta.options, msgEnvio: v } } });
    setMsgEdit(null);
  };
  const waLink = `https://wa.me/${data.meta.ownerPhone.replace(/\D/g, "").replace(/^(?!55)/, "55")}?text=${encodeURIComponent(texto)}`;

  async function publish() {
    await fetch(`/api/proposals/${p.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setPublished(true);
    setEnviadaEm((e) => e ?? new Date().toISOString());
    setSendOpen(true);
  }

  // "Enviado": termina a proposta (publica, se ainda for rascunho) e bloqueia a edição
  async function marcarEnviado() {
    if (!confirm("Marcar como enviado? A edição desta proposta fica bloqueada (só visualização).")) return;
    if (burst.current) await new Promise((r) => setTimeout(r, 900));
    if (!published) await fetch(`/api/proposals/${p.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const r = await fetch(`/api/proposals/${p.id}/bloquear`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bloqueada: true }) });
    if (r.ok) window.location.reload();
    else alert("Não foi possível bloquear a proposta.");
  }

  function copy() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const op = data.meta.options;
  const mesmoPrazo = op.validadeDias === prazoInicial.current.dias && !!op.semValidade === prazoInicial.current.sem;
  const venceGravado = mesmoPrazo && published ? p.expiresAt : null;
  const venceEm = op.semValidade ? null : venceGravado ?? (enviadaEm && op.validadeDias > 0 ? new Date(new Date(enviadaEm).getTime() + op.validadeDias * 864e5).toISOString() : null);
  const ownCount = Object.keys(overrides).length;
  const status = pending > 0 ? "Salvando…" : saved === "erro" ? "⚠ Não foi possível salvar" : saved === "ok" ? "✓ Salvo" : "Tudo salvo";
  const back = `/app/projetos/${project.id}/propostas`;

  return (
    <div className="min-h-screen bg-alt">
      {/* barra do topo */}
      {/* duas linhas: 1) proposta, modo, validade e carta; 2) ações. Cada grupo fica inteiro: quando
          falta espaço, o grupo da direita desce junto (nunca parte no meio) */}
      <div ref={barra} className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 pb-2 pt-3">
          <div className="flex min-w-[260px] flex-1 items-center gap-3">
            <Link href={back} className="flex shrink-0 items-center gap-1.5 rounded px-2 py-1.5 text-sm font-semibold text-navy hover:bg-alt">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
              Voltar
            </Link>
            <span className="h-6 w-px shrink-0 bg-line" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="h-display truncate text-lg">{data.meta.name}</h1>
                <StatusBadge status={p.status === "rascunho" && published ? "enviada" : p.status} />
              </div>
              <div className="truncate text-[12px] text-muted">
                {project.name} · {formato.label} · {data.meta.options.cartaIntencao ? "com carta de intenção" : "sem carta"}
                {data.meta.options.semValidade ? " · não expira" : venceEm ? ` · válida até ${fmtDate(venceEm)}` : ""}
              </div>
            </div>
          </div>

          {bloqueada ? (
            <span
              className="ml-auto shrink-0 rounded border border-rose-200 bg-rose-50 px-3 py-1.5 text-[13px] font-semibold text-rose-800"
              title="Para liberar: na lista de propostas, menu ⋯ → Liberar edição"
            >
              🔒 Bloqueada para edição{p.lockedBy ? ` por ${p.lockedBy}` : ""} · só visualização
            </span>
          ) : (
          <div className="ml-auto flex shrink-0 items-center gap-5">
          {/* fica na barra fixa: troca o modo em qualquer ponto da página, sem voltar ao topo */}
          <ModoToggle mode={mode} onChange={setMode} />

          {/* validade e carta de intenção: à mão na barra, sem abrir os dados da planilha */}
          <div className="flex shrink-0 items-center gap-4">
            <ValidadeField
              compact
              dias={data.meta.options.validadeDias}
              semValidade={data.meta.options.semValidade}
              onDias={(v) => setOptions({ validadeDias: Number(v) || 0 })}
              onSemValidade={(v) => setOptions({ semValidade: v })}
            />
            <label className="flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold text-navy">
              <input type="checkbox" checked={data.meta.options.cartaIntencao} onChange={(e) => setOptions({ cartaIntencao: e.target.checked })} className="h-4 w-4 accent-[#A2782F]" />
              Carta de intenção
            </label>
          </div>
          </div>
          )}
        </div>

        {/* botões um pouco mais compactos que o normal: cabem numa linha até em telas de ~1100 px */}
        <div className="flex flex-wrap items-center justify-end gap-2 px-6 pb-3 [&_.btn-ghost]:px-3 [&_.btn-ghost]:py-2 [&_.btn-gold]:px-3.5 [&_.btn-gold]:py-2 [&_.btn-navy]:px-3 [&_.btn-navy]:py-2">
            {!bloqueada && <>
            <span className={`text-[12.5px] ${saved === "erro" ? "font-semibold text-rose-700" : "text-muted"}`}>{status}</span>
            <div className="flex overflow-hidden rounded border border-line bg-white">
              <button onClick={undo} disabled={pos === 0} title="Desfazer (Ctrl+Z)" className="px-3 py-2 text-[13px] font-semibold text-navy hover:bg-alt disabled:opacity-35">↶ Desfazer</button>
              <button onClick={redo} disabled={pos >= hist.length} title="Refazer (Ctrl+Y)" className="border-l border-line px-3 py-2 text-[13px] font-semibold text-navy hover:bg-alt disabled:opacity-35">↷ Refazer</button>
            </div>
            {carta && (
              <button className="btn-ghost" onClick={() => setCartaAberta(true)} title="Dados enviados pela carta de intenção">
                📥 Dados recebidos{carta.minutaStatus === "assinada" ? " · ✓ assinada" : carta.minutaStatus === "enviada" ? " · minuta enviada" : ""}
              </button>
            )}
            </>}
            {!bloqueada && (
              <button className={numbersOpen ? "btn-navy" : "btn-ghost"} onClick={() => setNumbersOpen((v) => !v)}>
                {numbersOpen ? "Fechar dados da planilha" : "Editar dados da planilha"}
              </button>
            )}
            {published && (
              <>
                <a className="btn-ghost" href={`/p/${p.publicToken}`} target="_blank" rel="noreferrer">Abrir como cliente ↗</a>
                <button className="btn-ghost" onClick={copy}>{copied ? "✓ Link copiado" : "Copiar link"}</button>
              </>
            )}
            {!bloqueada && <button className="btn-ghost" onClick={marcarEnviado} title="Termina a proposta e bloqueia a edição">Enviado</button>}
            {published ? (
              <button className="btn-gold" onClick={() => setSendOpen(true)}>Enviar no WhatsApp</button>
            ) : (
              <button className="btn-gold" onClick={publish}>Publicar e enviar</button>
            )}
        </div>
      </div>

      {numbersOpen && (
        <div
          ref={faixa.ref}
          className="sticky z-30 mx-6 mt-4 flex flex-col overflow-hidden rounded-md border border-gold-line border-t-[3px] border-t-gold bg-white shadow-[0_24px_50px_-24px_rgba(18,42,69,.55)]"
          style={{ top: alturaBarra, height: faixa.altura ?? "56vh" }}
        >
          <div className="min-h-0 flex-1 overflow-auto p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="eyebrow">Dados da planilha</div>
              <span className="text-[12.5px] text-muted">Salva sozinho. A proposta logo abaixo muda enquanto você digita.</span>
            </div>
            <NumbersPanel key={numbersKey} value={data} onChange={changeData} dataAtual={dataDaProposta({ createdAt: p.createdAt, publishedAt: p.publishedAt, options: data.meta.options }).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })} />
          </div>
          {/* alça: puxa para baixo ou para cima para a planilha ficar maior ou menor */}
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Puxe para mudar a altura da planilha"
            title="Puxe para baixo ou para cima para mudar a altura (dois cliques: tamanho padrão)"
            onPointerDown={faixa.puxar}
            onDoubleClick={faixa.padrao}
            className="group grid h-3.5 shrink-0 cursor-row-resize touch-none place-items-center border-t border-gold-line bg-gold-soft hover:bg-gold/30"
          >
            <span className="h-1 w-12 rounded-full bg-gold group-hover:bg-gold-deep" />
          </div>
        </div>
      )}

      <div className="px-6 pb-12 pt-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          {!bloqueada && <DestinatarioPicker compact value={data.meta.options.destinatario} onChange={(dest) => changeData({ ...data, meta: { ...data.meta, options: { ...data.meta.options, destinatario: dest } } })} />}
          {mode === "edit" && !bloqueada && (
            <span className="basis-full text-[12.5px] text-muted">
              Clique em qualquer texto para editar, numa imagem para trocar, ou passe o mouse numa seção ou tabela.
              {templateDesatualizado && (
                <span className="mt-1.5 flex flex-wrap items-center gap-2 rounded bg-sky-50 px-2.5 py-1.5 text-sky-900 ring-1 ring-sky-200">
                  Esta proposta está numa versão anterior do template (os textos podem estar diferentes).
                  <button
                    className="font-semibold text-navy underline"
                    onClick={async () => {
                      // proposta já enviada: o cliente vai ver a mudança no link
                      if (p.status !== "rascunho" && !confirm("Esta proposta já foi enviada. Ao atualizar para o template atual, o cliente vai ver as mudanças no link. Continuar?")) return;
                      await patch({ atualizarTemplate: true });
                      window.location.reload();
                    }}
                  >
                    Atualizar para o template atual
                  </button>
                  <span className="text-[12px] text-sky-800/80">Os ajustes feitos só nesta proposta continuam.</span>
                </span>
              )}
              {ownCount > 0 && (
                <>
                  {" "}<span className="ml-1 rounded-sm bg-[#fff6d6] px-1.5 py-0.5 font-semibold text-amber-800 ring-1 ring-[#e0a800]">✎ {ownCount} ajuste(s) só nesta proposta</span>
                  <button
                    className="ml-2 font-semibold text-gold-deep underline"
                    onClick={async () => {
                      if (!confirm("Desfazer todos os ajustes feitos só nesta proposta? Ela volta a ficar igual ao template.")) return;
                      await patch({ resetOverrides: true });
                      // também passa para a versão atual do template: recarrega com os textos dele
                      window.location.reload();
                    }}
                  >
                    Voltar tudo ao template
                  </button>
                </>
              )}
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_60px_-40px_rgba(18,42,69,.5)]">
          <JblPadrao
            key={mode}
            mode={mode}
            token={p.publicToken}
            pdfUrl={`/api/public/${p.publicToken}/pdf`}
            pdfPages={p.pdfPages}
            pdfVersao={gravacoes}
            formato={formato}
            project={project}
            ownerName={data.meta.ownerName}
            inputs={data.inputs}
            options={data.meta.options}
            overrides={overrides}
            date={dataDaProposta({ createdAt: p.createdAt, publishedAt: p.publishedAt, options: data.meta.options }).toISOString()}
            onSave={saveOverride}
          />
        </div>
      </div>

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        eyebrow="Proposta publicada"
        title="Enviar para a família"
        footer={
          <>
            <button className="btn-ghost" onClick={copy}>{copied ? "✓ Copiado" : "Copiar link"}</button>
            {data.meta.ownerPhone ? (
              <a className="btn-gold" href={waLink} target="_blank" rel="noreferrer">Abrir WhatsApp</a>
            ) : (
              <button className="btn-gold" onClick={() => { navigator.clipboard.writeText(texto); setCopied(true); }}>Copiar mensagem</button>
            )}
          </>
        }
      >
        <p className="text-sm text-muted">{data.meta.options.semValidade ? "O link já está ativo e não expira." : `O link já está ativo por ${data.meta.options.validadeDias} dias.`} {salva ? "Mensagem (editada):" : "Mensagem sugerida (dá para alterar):"}</p>
        <textarea
          className="mt-3 block w-full resize-y rounded border-0 border-l-[3px] border-gold bg-alt px-4 py-3 text-[14px] leading-relaxed outline-none focus:ring-2 focus:ring-gold-soft"
          rows={12}
          // em telas baixas a caixa encolhe para os botões da janela continuarem à vista
          style={{ height: "min(300px, 38dvh)" }}
          value={texto}
          onChange={(e) => setMsgEdit(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!bloqueada && msgEdit !== null && msgEdit !== (salva ?? message) && (
            <button className="btn-gold px-3 py-1.5 text-[13px]" onClick={() => salvarMensagem(msgEdit)}>Salvar texto</button>
          )}
          {msgEdit !== null && <button className="btn-ghost px-3 py-1.5 text-[13px]" onClick={() => setMsgEdit(null)}>Descartar alteração</button>}
          {!bloqueada && salva && msgEdit === null && <button className="btn-ghost px-3 py-1.5 text-[13px]" onClick={() => salvarMensagem("")}>Voltar à mensagem sugerida</button>}
        </div>
        {!data.meta.ownerPhone && <p className="mt-3 text-[12.5px] text-amber-800">Sem WhatsApp cadastrado. Adicione em “Editar dados da planilha” para abrir a conversa direto.</p>}
      </Modal>
      {carta && <LetterModal id={cartaAberta ? carta.id : null} onClose={() => setCartaAberta(false)} />}
    </div>
  );
}
