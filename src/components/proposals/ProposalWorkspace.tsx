"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { StudyInputs } from "@/lib/calc";
import type { Overrides, ProposalOptions } from "@/lib/proposals";
import { STATUS } from "@/lib/proposals";
import { fmtDate, fmtDateTime, relTime } from "@/lib/format";
import JblPadrao from "@/components/template/JblPadrao";
import Modal from "@/components/ui/Modal";
import StatusBadge from "./StatusBadge";
import EditNumbersModal from "./EditNumbersModal";

type Props = {
  proposal: {
    id: string; name: string; ownerName: string; ownerPhone: string | null; status: string; rawStatus: string; publicToken: string;
    publishedAt: string | null; expiresAt: string | null; createdAt: string; viewCount: number; firstViewedAt: string | null; lastViewedAt: string | null;
    template: string; inputs: StudyInputs; options: ProposalOptions; overrides: Overrides; overridesCount: number;
  };
  project: { id: string; name: string; tipo: string; municipio: string; uf: string; matricula: string | null; aerialImage: string | null };
  letters: { id: string; protocolo: string; createdAt: string; nome: string; cpf: string; telefone: string; email: string; arquivo: string | null }[];
  visits: { at: string; seconds: number; maxScroll: number; sections: string[] }[];
};

const SECTION_NAMES: Record<string, string> = {
  grupo: "O grupo", empresas: "Empresas", missao: "Missão", como: "Como trabalha", terreno: "Terreno", obras: "Obras",
  execucao: "Custo das obras", cronograma: "Cronograma", vgv: "VGV", etapa1: "1ª etapa", participacao: "Divisão",
  recebimentos: "Recebimentos", antecipacao: "Antecipação", vendas: "Vendas", regras: "Regras", aviso: "Aviso legal", "carta-intencao": "Carta de intenção",
};

function minutes(s: number) {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60}s` : ""}`;
}

export default function ProposalWorkspace({ proposal: p, project, letters, visits }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [sendOpen, setSendOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [overridesCount, setOverridesCount] = useState(p.overridesCount);

  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const publicUrl = `${origin}/p/${p.publicToken}`;
  const published = p.rawStatus !== "rascunho";
  const totalSeconds = visits.reduce((s, v) => s + v.seconds, 0);
  const maxScroll = visits.reduce((m, v) => Math.max(m, v.maxScroll), 0);
  const allSections = Array.from(new Set(visits.flatMap((v) => v.sections)));
  const firstName = p.ownerName.replace(/^família\s+/i, "");
  const message = `Olá, ${p.ownerName}! Aqui é o Marcelo Aguilar, da JBL Incorporadora. Preparamos a proposta de parceria para a gleba ${project.name}. Vocês podem ver todos os números neste link:\n\n${publicUrl}\n\nFico à disposição para conversarmos.`;
  const waLink = `https://wa.me/${(p.ownerPhone ?? "").replace(/\D/g, "").replace(/^(?!55)/, "55")}?text=${encodeURIComponent(message)}`;

  async function publish(extendDays?: number) {
    setBusy(true);
    await fetch(`/api/proposals/${p.id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ extendDays }) });
    setBusy(false);
    if (!extendDays) setSendOpen(true);
    router.refresh();
  }

  async function setStatus(status: string) {
    await fetch(`/api/proposals/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    router.refresh();
  }

  async function saveOverride(k: string, v: unknown) {
    const r = await fetch(`/api/proposals/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ overrides: { [k]: v } }) });
    const d = await r.json();
    setOverridesCount(Object.keys(d.overrides ?? {}).length);
    router.refresh();
  }

  function copy() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div>
      {/* Cabeçalho da proposta */}
      <div className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-8 py-3.5">
          <Link href={`/app/projetos/${project.id}/propostas`} className="rounded p-1.5 text-muted hover:bg-alt hover:text-navy" aria-label="Voltar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="h-display truncate text-xl">{p.name}</h1>
              <StatusBadge status={p.status} />
            </div>
            <div className="text-[12.5px] text-muted">
              {p.ownerName} · {p.template} · {p.options.cartaIntencao ? "com carta de intenção" : "sem carta de intenção"}
              {p.expiresAt && ` · válida até ${fmtDate(p.expiresAt)}`}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button className="btn-ghost" onClick={() => setEditing(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" /></svg>
              Editar números
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
              <button className="btn-gold" onClick={() => publish()} disabled={busy}>{busy ? "Publicando…" : "Publicar e enviar"}</button>
            )}
          </div>
        </div>
      </div>

      {/* Painel de acompanhamento */}
      <div className="grid gap-4 px-8 pt-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="eyebrow">Acompanhamento</div>
            {published && (
              <select
                value={["negociacao", "aceita", "recusada"].includes(p.rawStatus) ? p.rawStatus : ""}
                onChange={(e) => e.target.value && setStatus(e.target.value)}
                className="input w-auto py-1 text-[13px]"
              >
                <option value="">Marcar desfecho…</option>
                {["negociacao", "aceita", "recusada"].map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
              </select>
            )}
          </div>
          {!published ? (
            <p className="text-sm text-muted">Rascunho: a família ainda não tem acesso. Revise a proposta abaixo e clique em <b className="text-navy">Publicar e enviar</b>.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line md:grid-cols-4">
                {[
                  ["Aberturas", String(p.viewCount)],
                  ["Tempo de leitura", totalSeconds ? minutes(totalSeconds) : "—"],
                  ["Leu até", maxScroll ? `${maxScroll}% da página` : "—"],
                  ["Última abertura", p.lastViewedAt ? relTime(p.lastViewedAt) : "ainda não"],
                ].map(([k, v]) => (
                  <div key={k} className="bg-white px-4 py-3">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-muted">{k}</div>
                    <div className="mt-0.5 font-display text-xl text-navy">{v}</div>
                  </div>
                ))}
              </div>
              {allSections.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px]">
                  <span className="text-muted">Seções vistas:</span>
                  {allSections.map((s) => <span key={s} className="rounded-sm bg-gold-soft px-1.5 py-0.5 font-semibold text-gold-ink ring-1 ring-gold-line">{SECTION_NAMES[s] ?? s}</span>)}
                </div>
              )}
              {visits.length > 0 && (
                <ul className="mt-3 max-h-28 overflow-auto text-[12.5px] text-muted">
                  {visits.map((v) => <li key={v.at} className="flex justify-between border-t border-line py-1"><span>{fmtDateTime(v.at)}</span><span>{minutes(v.seconds)} · {v.maxScroll}%</span></li>)}
                </ul>
              )}
              {p.status === "expirada" && (
                <div className="mt-3 flex items-center justify-between rounded bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
                  A validade terminou e o link mostra “proposta expirada”.
                  <button className="btn-ghost py-1" onClick={() => publish(7)} disabled={busy}>Prorrogar +7 dias</button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="card p-5">
          <div className="eyebrow mb-4">Cartas de intenção</div>
          {!p.options.cartaIntencao ? (
            <p className="text-sm text-muted">Esta proposta foi enviada <b className="text-navy">sem</b> carta de intenção. Dá para ligar em “Editar números”.</p>
          ) : letters.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma carta recebida ainda. Quando {firstName} preencher, ela aparece aqui.</p>
          ) : (
            <ul className="grid gap-2">
              {letters.map((l) => (
                <li key={l.id} className="rounded border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 text-[13px]">
                  <div className="flex items-center justify-between">
                    <b className="text-navy">{l.nome}</b>
                    <span className="font-mono text-[11.5px] text-emerald-800">{l.protocolo}</span>
                  </div>
                  <div className="text-muted">CPF {l.cpf}{l.telefone && ` · ${l.telefone}`}{l.email && ` · ${l.email}`}</div>
                  <div className="mt-1 flex items-center justify-between text-[12px]">
                    <span className="text-muted">{fmtDateTime(l.createdAt)}{l.arquivo && ` · 📎 ${l.arquivo}`}</span>
                    <a className="font-semibold text-gold-deep hover:underline" href={`/api/letters/${l.id}`} target="_blank" rel="noreferrer">Ver carta</a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Proposta */}
      <div className="px-8 pb-12 pt-6">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded border border-line bg-white p-0.5 text-[13px] font-semibold">
            <button onClick={() => setMode("edit")} className={`rounded-sm px-3 py-1.5 ${mode === "edit" ? "bg-navy text-white" : "text-muted"}`}>Editar textos</button>
            <button onClick={() => setMode("preview")} className={`rounded-sm px-3 py-1.5 ${mode === "preview" ? "bg-navy text-white" : "text-muted"}`}>Ver como a família</button>
          </div>
          {mode === "edit" && (
            <span className="text-[12.5px] text-muted">
              Clique em qualquer texto para editar e formatar, em uma imagem para trocar, ou passe o mouse numa seção para mudar o fundo.
              {overridesCount > 0 && <> <span className="ml-1 rounded-sm bg-[#fff6d6] px-1.5 py-0.5 font-semibold text-amber-800 ring-1 ring-[#e0a800]">✎ {overridesCount} alterado(s) à mão</span></>}
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-md border border-line shadow-[0_24px_60px_-40px_rgba(18,42,69,.5)] [transform:translateZ(0)]">
          <JblPadrao
            key={mode}
            mode={mode}
            token={p.publicToken}
            project={project}
            ownerName={p.ownerName}
            inputs={p.inputs}
            options={p.options}
            overrides={p.overrides}
            date={p.publishedAt ?? p.createdAt}
            onSave={saveOverride}
          />
        </div>
      </div>

      {editing && <EditNumbersModal proposal={{ ...p, overridesCount }} onClose={() => setEditing(false)} />}

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        eyebrow="Proposta publicada"
        title="Enviar para a família"
        footer={
          <>
            <button className="btn-ghost" onClick={copy}>{copied ? "✓ Copiado" : "Copiar link"}</button>
            {p.ownerPhone ? (
              <a className="btn-gold" href={waLink} target="_blank" rel="noreferrer">Abrir WhatsApp</a>
            ) : (
              <button className="btn-gold" onClick={() => { navigator.clipboard.writeText(message); setCopied(true); }}>Copiar mensagem</button>
            )}
          </>
        }
      >
        <p className="text-sm text-muted">O link já está ativo{p.options.validadeDias ? ` por ${p.options.validadeDias} dias` : ""}. Mensagem sugerida:</p>
        <div className="mt-3 whitespace-pre-line rounded border-l-[3px] border-gold bg-alt px-4 py-3 text-[14px]">{message}</div>
        {!p.ownerPhone && <p className="mt-3 text-[12.5px] text-amber-800">Sem WhatsApp cadastrado. Adicione em “Editar números” para abrir a conversa direto.</p>}
      </Modal>
    </div>
  );
}
