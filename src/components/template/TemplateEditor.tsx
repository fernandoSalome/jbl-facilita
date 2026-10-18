"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_INPUTS } from "@/lib/calc";
import { DEFAULT_OPTIONS } from "@/lib/proposals";
import { aplicarDiff, type FormatoContent, type FormatoKey, type ObraItem, type Qtd } from "@/lib/formatos";
import Modal from "@/components/ui/Modal";
import JblPadrao from "./JblPadrao";
import DestinatarioPicker from "@/components/proposals/DestinatarioPicker";
import type { Destinatario } from "@/lib/proposals";

/**
 * Editor do template base. Diferente da proposta, aqui nada salva sozinho: as
 * alterações ficam num rascunho até clicar em "Salvar", que pergunta se vale para
 * as propostas já feitas desse formato ou só para as próximas.
 */

type F = { key: FormatoKey; content: FormatoContent };
const PROJETO_EXEMPLO = { name: "Gleba Exemplo", tipo: "", municipio: "Martinópolis", uf: "SP", matricula: "00.000", aerialImage: "/demo/sao-judas-tadeu-ii.jpg" };
const HOJE = new Date().toISOString();

const clone = (c: FormatoContent): FormatoContent => JSON.parse(JSON.stringify(c));

export default function TemplateEditor({
  templateId,
  templateName,
  formatos,
  counts,
  inicial,
}: {
  templateId: string;
  templateName: string;
  formatos: F[];
  counts: Record<string, { total: number; enviadas: number }>;
  inicial: FormatoKey;
}) {
  const router = useRouter();
  const [key, setKey] = useState<FormatoKey>(inicial);
  const original = useMemo(() => formatos.find((f) => f.key === key)!.content, [formatos, key]);
  const [draft, setDraft] = useState<FormatoContent>(() => clone(original));
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState<null | (() => void)>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [aplicar, setAplicar] = useState<"todas" | "proximas">("todas");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    setDraft(clone(original));
    setDirty(false);
  }, [original]);

  // aviso do navegador ao fechar a aba ou recarregar com alterações pendentes
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  const guard = (go: () => void) => (dirty ? setLeaving(() => go) : go());

  function update(fn: (d: FormatoContent) => void) {
    setDraft((d) => {
      const n = clone(d);
      fn(n);
      return n;
    });
    setDirty(true);
  }

  // As edições feitas no template vão direto para o rascunho:
  // listas e quantidades entram nos itens; textos, imagens e cores ficam em "overrides".
  const [dest, setDest] = useState<Destinatario>({ tipo: "familia" });
  const onSave = useCallback(async (k: string, v: unknown) => {
    update((d) => {
      if (k.startsWith("lista.")) {
        const secao = k.slice(6) as "infra" | "complementar" | "benfeitorias" | "contatos";
        (d as unknown as Record<string, unknown>)[secao] = aplicarDiff(d[secao] as { id: string }[], v);
      } else if (k.startsWith("liq.")) {
        const id = k.slice(4);
        const item = [...d.infra, ...d.complementar].find((i) => i.id === id) as ObraItem | undefined;
        if (item && v) item.qtd = v as Qtd;
      } else if (v === null) delete d.overrides[k];
      else d.overrides[k] = v;
    });
  }, []);

  const inputs = useMemo(() => ({ ...DEFAULT_INPUTS, areaTotal: 137338.46, ...draft.padroes }), [draft.padroes]);
  const c = counts[key] ?? { total: 0, enviadas: 0 };

  async function salvar() {
    setBusy(true);
    setMsg("");
    const r = await fetch(`/api/templates/${templateId}/formatos/${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft, aplicar }),
    });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg(d.error ?? "Não foi possível salvar.");
    setSaveOpen(false);
    setDirty(false);
    setMsg(aplicar === "todas" ? `✓ Salvo e aplicado em ${d.atualizadas} proposta(s)` : "✓ Salvo. Vale para as próximas propostas");
    router.refresh();
  }

  const P = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="grid gap-1 text-[12px] font-semibold text-navy">{label}{children}</label>
  );

  return (
    <div className="min-h-screen bg-alt">
      <div className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-6 py-3">
          <button onClick={() => guard(() => router.push("/app/templates"))} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm font-semibold text-navy hover:bg-alt">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            Voltar para templates
          </button>
          <span className="h-6 w-px bg-line" />
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">Template base</div>
            <h1 className="h-display text-lg leading-tight">{templateName}</h1>
          </div>
          <label className="ml-4 flex items-center gap-2 text-[13px] font-semibold text-navy">
            Formato
            <select
              value={key}
              onChange={(e) => {
                const next = e.target.value as FormatoKey;
                guard(() => {
                  setKey(next);
                  router.replace(`/app/modelo/${templateId}?formato=${next}`, { scroll: false }); // fica no mesmo ponto da página
                });
              }}
              className="input w-auto py-1.5"
            >
              {formatos.map((f) => <option key={f.key} value={f.key}>{f.content.label}</option>)}
            </select>
          </label>
          <span className="text-[12px] text-muted">{c.total} proposta(s) usam este formato</span>

          <div className="ml-auto flex items-center gap-2">
            {msg && <span className="text-[12.5px] font-semibold text-emerald-700">{msg}</span>}
            {dirty && <span className="rounded-sm bg-[#fff6d6] px-2 py-1 text-[12px] font-semibold text-amber-800 ring-1 ring-[#e0a800]">● Alterações não salvas</span>}
            {dirty && <button className="btn-ghost" onClick={() => { setDraft(clone(original)); setDirty(false); }}>Descartar</button>}
            <button className="btn-gold px-6" disabled={!dirty} onClick={() => setSaveOpen(true)}>Salvar</button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-12 pt-5">
        <div className="mb-4 rounded-md border border-line bg-white p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="eyebrow">Padrões do formato</div>
            <span className="text-[12px] text-muted">Usados ao criar uma proposta deste formato.</span>
          </div>
          <div className="grid gap-3 md:grid-cols-[repeat(3,120px)_1fr_1fr_1fr]">
            <P label="Lote (m²)">
              <input className="input py-1.5 text-right" type="number" value={draft.padroes.metragemLote} onChange={(e) => update((d) => void (d.padroes.metragemLote = Number(e.target.value) || 0))} />
            </P>
            <P label="Frente (m)">
              <input className="input py-1.5 text-right" type="number" value={draft.padroes.frenteLote} onChange={(e) => update((d) => void (d.padroes.frenteLote = Number(e.target.value) || 0))} />
            </P>
            <P label="Aproveitamento (%)">
              <input className="input py-1.5 text-right" type="number" value={Math.round(draft.padroes.aproveitamento * 10000) / 100} onChange={(e) => update((d) => void (d.padroes.aproveitamento = (Number(e.target.value) || 0) / 100))} />
            </P>
            <P label="Nome do formato"><input className="input py-1.5" value={draft.label} onChange={(e) => update((d) => void (d.label = e.target.value))} /></P>
            <P label="Modelo citado na carta"><input className="input py-1.5" value={draft.modelo} onChange={(e) => update((d) => void (d.modelo = e.target.value))} /></P>
            <P label="Lei"><input className="input py-1.5" value={draft.lei} onChange={(e) => update((d) => void (d.lei = e.target.value))} /></P>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded border border-line bg-white p-0.5 text-[13px] font-semibold">
            <button onClick={() => setMode("edit")} className={`rounded-sm px-3 py-1.5 ${mode === "edit" ? "bg-navy text-white" : "text-muted"}`}>Editar</button>
            <button onClick={() => setMode("preview")} className={`rounded-sm px-3 py-1.5 ${mode === "preview" ? "bg-navy text-white" : "text-muted"}`}>Ver como o cliente</button>
          </div>
          <DestinatarioPicker compact value={dest} onChange={setDest} />
          <span className="text-[12.5px] text-muted">
            Números de exemplo. Mude textos, imagens, linhas das tabelas e benfeitorias: vale para as propostas deste formato quando você salvar.
          </span>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-white shadow-[0_24px_60px_-40px_rgba(18,42,69,.5)]">
          <JblPadrao
            key={`${key}-${mode}`}
            mode={mode}
            token="modelo"
            formato={{ ...draft, overrides: {} }}
            project={PROJETO_EXEMPLO}
            ownerName="Família"
            inputs={inputs}
            options={{ ...DEFAULT_OPTIONS, destinatario: dest }}
            overrides={draft.overrides}
            date={HOJE}
            onSave={onSave}
          />
        </div>
      </div>

      <Modal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        eyebrow={draft.label}
        title="Como aplicar estas alterações?"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setSaveOpen(false)}>Cancelar</button>
            <button className="btn-gold" onClick={salvar} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</button>
          </>
        }
      >
        <div className="grid gap-3">
          <label className={`flex cursor-pointer gap-3 rounded border-[1.5px] p-3 ${aplicar === "todas" ? "border-gold bg-gold-soft" : "border-line"}`}>
            <input type="radio" checked={aplicar === "todas"} onChange={() => setAplicar("todas")} className="mt-1 accent-[#A2782F]" />
            <span>
              <b className="block text-navy">Em todas as propostas deste formato</b>
              <span className="text-[13px] text-muted">
                As {c.total} proposta(s) já feitas{c.enviadas ? `, ${c.enviadas} delas já enviadas às famílias,` : ""} passam a ficar assim. O que foi ajustado dentro de cada proposta continua como está.
              </span>
            </span>
          </label>
          <label className={`flex cursor-pointer gap-3 rounded border-[1.5px] p-3 ${aplicar === "proximas" ? "border-gold bg-gold-soft" : "border-line"}`}>
            <input type="radio" checked={aplicar === "proximas"} onChange={() => setAplicar("proximas")} className="mt-1 accent-[#A2782F]" />
            <span>
              <b className="block text-navy">Só nas próximas propostas</b>
              <span className="text-[13px] text-muted">As propostas já feitas continuam como estão. As novas nascem com estas alterações.</span>
            </span>
          </label>
          {msg && <p className="text-sm font-semibold text-rose-700">{msg}</p>}
        </div>
      </Modal>

      <Modal
        open={!!leaving}
        onClose={() => setLeaving(null)}
        title="Sair sem salvar?"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setLeaving(null)}>Continuar editando</button>
            <button className="btn-danger" onClick={() => { const go = leaving; setLeaving(null); setDirty(false); go?.(); }}>Sair sem salvar</button>
          </>
        }
      >
        <p className="text-[15px]">Você tem alterações não salvas no template. Se sair agora, elas serão perdidas.</p>
      </Modal>
    </div>
  );
}

export function TemplateEditorLink({ id }: { id: string }) {
  return <Link href={`/app/modelo/${id}`} className="font-semibold text-gold-deep hover:underline">Editar template</Link>;
}
