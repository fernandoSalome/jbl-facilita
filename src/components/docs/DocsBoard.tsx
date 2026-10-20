"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TIPOS } from "@/lib/ia";
import { ETAPA, FASES, faseEmUso } from "@/lib/fases";

export type DocRow = {
  id: string; tipo: string; fase: string | null; titulo: string; resumo: string | null; fileName: string; mime: string; size: number;
  origem: string; enviadoPor: string | null; grupo: string | null; createdAt: string; projectId: string | null; projectName?: string | null;
};

const tamanho = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const quando = (s: string) => new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function Icone({ mime }: { mime: string }) {
  const pdf = mime === "application/pdf";
  const img = mime.startsWith("image/");
  return (
    <span className={`grid h-10 w-9 shrink-0 place-items-center rounded-sm text-[10px] font-bold ${pdf ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : img ? "bg-sky-50 text-sky-800 ring-1 ring-sky-200" : "bg-alt text-muted ring-1 ring-line"}`}>
      {pdf ? "PDF" : img ? "IMG" : "DOC"}
    </span>
  );
}

/** Documentos por etapa do processo; cada arquivo pode mudar de etapa, de pasta ou de loteamento */
export default function DocsBoard({ docs, projetos, mostrarProjeto }: { docs: DocRow[]; projetos: { id: string; name: string }[]; mostrarProjeto?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const pastas = FASES.map(([k]) => ({ k, nome: ETAPA[k], itens: docs.filter((d) => faseEmUso(d) === k) })).filter((p) => p.itens.length);

  async function patch(id: string, body: object) {
    setBusy(id);
    await fetch(`/api/documentos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(null);
    router.refresh();
  }
  async function excluir(id: string, titulo: string) {
    if (!confirm(`Excluir "${titulo}"?`)) return;
    setBusy(id);
    await fetch(`/api/documentos/${id}`, { method: "DELETE" });
    setBusy(null);
    router.refresh();
  }

  if (!docs.length) {
    return (
      <div className="card grid place-items-center gap-2 px-6 py-14 text-center">
        <div className="text-4xl">📁</div>
        <div className="h-display text-xl">Nenhum documento ainda</div>
        <p className="max-w-md text-sm text-muted">Mande um PDF ou foto no grupo do WhatsApp do assistente dizendo de qual loteamento é. Ele guarda aqui, separado por etapa do processo e por pasta.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {pastas.map((p) => (
        <section key={p.k} className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line bg-alt/60 px-5 py-3">
            <span className="text-lg">📁</span>
            <h2 className="font-semibold text-navy">{p.nome}</h2>
            <span className="rounded-full bg-white px-2 py-0.5 text-[12px] font-semibold text-muted ring-1 ring-line">{p.itens.length}</span>
          </div>
          <ul className="divide-y divide-line">
            {p.itens.map((d) => (
              <li key={d.id} className={`flex flex-wrap items-center gap-4 px-5 py-3.5 ${busy === d.id ? "opacity-50" : ""}`}>
                <Icone mime={d.mime} />
                <div className="min-w-[240px] flex-1">
                  <a href={`/api/documentos/${d.id}`} target="_blank" rel="noreferrer" className="font-semibold text-navy hover:text-gold-deep hover:underline">{d.titulo}</a>
                  {d.resumo && <p className="text-[13px] text-ink/80">{d.resumo}</p>}
                  <p className="text-[12px] text-muted">
                    {d.fileName} · {tamanho(d.size)} · {quando(d.createdAt)}
                    {d.origem === "whatsapp" && <> · 💬 {d.enviadoPor ? `${d.enviadoPor}, ` : ""}{d.grupo ?? "WhatsApp"}</>}
                  </p>
                </div>
                {mostrarProjeto && (
                  <select className={`input w-48 py-1.5 text-[13px] ${d.projectId ? "" : "border-amber-400 bg-amber-50"}`} value={d.projectId ?? ""} onChange={(e) => patch(d.id, { projectId: e.target.value })}>
                    <option value="">⚠ Sem loteamento</option>
                    {projetos.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                  </select>
                )}
                <select className="input w-36 py-1.5 text-[13px]" value={faseEmUso(d)} onChange={(e) => patch(d.id, { fase: e.target.value })} title="Mudar de etapa">
                  {FASES.map(([k]) => <option key={k} value={k}>{ETAPA[k]}</option>)}
                </select>
                <select className="input w-44 py-1.5 text-[13px]" value={d.tipo} onChange={(e) => patch(d.id, { tipo: e.target.value })} title="Mudar de pasta">
                  {Object.entries(TIPOS).map(([k, v]) => <option key={k} value={k}>{v.pasta}</option>)}
                </select>
                <a className="btn-ghost py-1.5 text-[13px]" href={`/api/documentos/${d.id}?baixar=1`}>Baixar</a>
                <button className="rounded p-1.5 text-muted hover:bg-rose-50 hover:text-rose-700" title="Excluir" onClick={() => excluir(d.id, d.titulo)}>✕</button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
