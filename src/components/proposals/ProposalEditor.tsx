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
  proposal: {
    id: string; name: string; ownerName: string; ownerPhone: string | null; status: string; rawStatus: string; publicToken: string;
    publishedAt: string | null; expiresAt: string | null; createdAt: string; template: string;
    inputs: StudyInputs; options: ProposalOptions; overrides: Overrides;
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
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
        <label><span className="label">Nome da proposta</span><input className="input" value={m.name} onChange={(e) => setMeta({ name: e.target.value })} /></label>
        <label><span className="label">Proprietário</span><input className="input" value={m.ownerName} onChange={(e) => setMeta({ ownerName: e.target.value })} /></label>
        <label><span className="label">WhatsApp</span><input className="input" value={m.ownerPhone} onChange={(e) => setMeta({ ownerPhone: e.target.value })} /></label>
        <ValidadeField
          dias={m.options.validadeDias}
          semValidade={m.options.semValidade}
          onDias={(v) => setMeta({ options: { ...m.options, validadeDias: Number(v) || 0 } })}
          onSemValidade={(v) => setMeta({ options: { ...m.options, semValidade: v } })}
        />
        <label className="flex items-end gap-2 pb-2.5 text-sm font-semibold text-navy">
          <input type="checkbox" checked={m.options.cartaIntencao} onChange={(e) => setMeta({ options: { ...m.options, cartaIntencao: e.target.checked } })} className="h-4 w-4 accent-[#A2782F]" />
          Carta de intenção
        </label>
      </div>
      <DataField value={m.options.data} atual={dataAtual} onChange={(v) => setMeta({ options: { ...m.options, data: v } })} />
      <StudyEditor state={study} />
    </div>
  );
}

/* ------------------------------------------------------------ tela */

export default function ProposalEditor({ formato, proposal: p, project, templateDesatualizado }: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
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
  const [sendOpen, setSendOpen] = useState(false);
  const [published, setPublished] = useState(p.rawStatus !== "rascunho");
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

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
    setSendOpen(true);
  }

  function copy() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const ownCount = Object.keys(overrides).length;
  const status = pending > 0 ? "Salvando…" : saved === "erro" ? "⚠ Não foi possível salvar" : saved === "ok" ? "✓ Salvo" : "Tudo salvo";
  const back = `/app/projetos/${project.id}/propostas`;

  return (
    <div className="min-h-screen bg-alt">
      {/* barra do topo */}
      <div className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-6 py-3">
          <Link href={back} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-semibold text-navy hover:bg-alt">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            Voltar
          </Link>
          <span className="h-6 w-px bg-line" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="h-display truncate text-lg">{data.meta.name}</h1>
              <StatusBadge status={p.status === "rascunho" && published ? "enviada" : p.status} />
            </div>
            <div className="text-[12px] text-muted">
              {project.name} · {formato.label} · {data.meta.options.cartaIntencao ? "com carta de intenção" : "sem carta"}
              {data.meta.options.semValidade ? " · não expira" : p.expiresAt && ` · válida até ${fmtDate(p.expiresAt)}`}
            </div>
          </div>

          {/* fica na barra fixa: troca o modo em qualquer ponto da página, sem voltar ao topo */}
          <ModoToggle mode={mode} onChange={setMode} />

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <span className={`text-[12.5px] ${saved === "erro" ? "font-semibold text-rose-700" : "text-muted"}`}>{status}</span>
            <div className="flex overflow-hidden rounded border border-line bg-white">
              <button onClick={undo} disabled={pos === 0} title="Desfazer (Ctrl+Z)" className="px-3 py-2 text-[13px] font-semibold text-navy hover:bg-alt disabled:opacity-35">↶ Desfazer</button>
              <button onClick={redo} disabled={pos >= hist.length} title="Refazer (Ctrl+Y)" className="border-l border-line px-3 py-2 text-[13px] font-semibold text-navy hover:bg-alt disabled:opacity-35">↷ Refazer</button>
            </div>
            <button className={numbersOpen ? "btn-navy" : "btn-ghost"} onClick={() => setNumbersOpen((v) => !v)}>
              {numbersOpen ? "Fechar dados da planilha" : "Editar dados da planilha"}
            </button>
            {published && (
              <>
                <button className="btn-ghost" onClick={copy}>{copied ? "✓ Link copiado" : "Copiar link"}</button>
                <a className="btn-ghost" href={`/p/${p.publicToken}`} target="_blank" rel="noreferrer">Abrir como cliente ↗</a>
              </>
            )}
            {published ? (
              <button className="btn-gold" onClick={() => setSendOpen(true)}>Enviar no WhatsApp</button>
            ) : (
              <button className="btn-gold" onClick={publish}>Publicar e enviar</button>
            )}
          </div>
        </div>
      </div>

      {numbersOpen && (
        <div className="sticky top-[66px] z-30 mx-6 mt-4 max-h-[56vh] overflow-auto rounded-md border border-gold-line border-t-[3px] border-t-gold bg-white p-5 shadow-[0_24px_50px_-24px_rgba(18,42,69,.55)]">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="eyebrow">Dados da planilha</div>
            <span className="text-[12.5px] text-muted">Salva sozinho. A proposta logo abaixo muda enquanto você digita.</span>
          </div>
          <NumbersPanel key={numbersKey} value={data} onChange={changeData} dataAtual={dataDaProposta({ createdAt: p.createdAt, publishedAt: p.publishedAt, options: data.meta.options }).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })} />
        </div>
      )}

      <div className="px-6 pb-12 pt-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <DestinatarioPicker compact value={data.meta.options.destinatario} onChange={(dest) => changeData({ ...data, meta: { ...data.meta, options: { ...data.meta.options, destinatario: dest } } })} />
          {mode === "edit" && (
            <span className="basis-full text-[12.5px] text-muted">
              Clique em qualquer texto para editar, numa imagem para trocar, ou passe o mouse numa seção ou tabela.
              {templateDesatualizado && (
                <span className="mt-1.5 flex flex-wrap items-center gap-2 rounded bg-sky-50 px-2.5 py-1.5 text-sky-900 ring-1 ring-sky-200">
                  Esta proposta está numa versão anterior do template (os textos podem estar diferentes).
                  <button
                    className="font-semibold text-navy underline"
                    onClick={async () => {
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
          value={texto}
          onChange={(e) => setMsgEdit(e.target.value)}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {msgEdit !== null && msgEdit !== (salva ?? message) && (
            <button className="btn-gold px-3 py-1.5 text-[13px]" onClick={() => salvarMensagem(msgEdit)}>Salvar texto</button>
          )}
          {msgEdit !== null && <button className="btn-ghost px-3 py-1.5 text-[13px]" onClick={() => setMsgEdit(null)}>Descartar alteração</button>}
          {salva && msgEdit === null && <button className="btn-ghost px-3 py-1.5 text-[13px]" onClick={() => salvarMensagem("")}>Voltar à mensagem sugerida</button>}
        </div>
        {!data.meta.ownerPhone && <p className="mt-3 text-[12.5px] text-amber-800">Sem WhatsApp cadastrado. Adicione em “Editar dados da planilha” para abrir a conversa direto.</p>}
      </Modal>
    </div>
  );
}
