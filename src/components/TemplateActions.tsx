"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";

export default function TemplateActions({ id, canPreview, isAdmin, inUse }: { id: string; canPreview: boolean; isAdmin: boolean; inUse: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  return (
    <span className="flex items-center gap-3">
      {canPreview && <Link href={`/app/templates/${id}`} className="font-semibold text-gold-deep hover:underline">Pré-visualizar</Link>}
      {isAdmin && !inUse && (
        <>
          <button onClick={() => setConfirm(true)} className="font-semibold text-rose-700 hover:underline">Arquivar</button>
          <Modal
            open={confirm}
            onClose={() => setConfirm(false)}
            title="Arquivar template?"
            footer={
              <>
                <button className="btn-ghost" onClick={() => setConfirm(false)}>Cancelar</button>
                <button className="btn-danger" onClick={async () => { await fetch(`/api/templates/${id}`, { method: "DELETE" }); setConfirm(false); router.refresh(); }}>Arquivar</button>
              </>
            }
          >
            <p className="text-sm">O template sai da lista e não pode mais ser escolhido. Nada é apagado.</p>
          </Modal>
        </>
      )}
    </span>
  );
}

export function UploadTemplateButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const r = await fetch("/api/templates", { method: "POST", body: new FormData(e.currentTarget) });
    setBusy(false);
    if (!r.ok) return setErr((await r.json()).error ?? "Erro ao enviar.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button className="btn-gold" onClick={() => setOpen(true)}>↑ Subir template</button>
      <Modal open={open} onClose={() => setOpen(false)} eyebrow="Novo template" title="Subir modelo de proposta">
        <form onSubmit={submit} className="grid gap-4">
          <label><span className="label">Nome do template *</span><input name="name" required className="input" placeholder="Ex.: Proposta alto padrão" /></label>
          <label><span className="label">Descrição</span><input name="description" className="input" placeholder="Quando usar este modelo" /></label>
          <label>
            <span className="label">Arquivo do modelo (PDF, Word ou PowerPoint) *</span>
            <input name="file" type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.html" className="input py-1.5" />
          </label>
          <p className="rounded bg-alt px-3 py-2 text-[12.5px] text-muted">O template fica “Em preparação” até a equipe marcar onde entram os números do estudo.</p>
          {err && <p className="text-sm font-semibold text-rose-700">{err}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
            <button className="btn-gold" disabled={busy}>{busy ? "Enviando…" : "Enviar"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
