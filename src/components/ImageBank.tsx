"use client";

import { useCallback, useEffect, useState } from "react";
import { uploadImage } from "@/components/template/Editable";
import Modal from "@/components/ui/Modal";
import { fmtDate } from "@/lib/format";

type A = { id: string; url: string; name: string; width: number | null; height: number | null; size: number; createdAt: string };

const BUILTIN = [
  { url: "/brand/lockup.webp", name: "Logo horizontal (padrão)" },
  { url: "/brand/logo-vertical.webp", name: "Logo vertical (padrão)" },
  { url: "/demo/sao-judas-tadeu-ii.jpg", name: "Gleba São Judas Tadeu II" },
];

export default function ImageBank() {
  const [list, setList] = useState<A[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const [removing, setRemoving] = useState<A | null>(null);

  const load = useCallback(() => {
    fetch("/api/assets").then((r) => r.json()).then((d) => Array.isArray(d) && setList(d));
  }, []);
  useEffect(load, [load]);

  async function send(files: FileList | File[]) {
    setErr("");
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        await uploadImage(f);
      }
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <label
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files); }}
        className={`grid cursor-pointer place-items-center rounded-md border-2 border-dashed px-6 py-10 text-center transition ${drag ? "border-gold bg-gold-soft" : "border-gold-line bg-white hover:border-gold"}`}
      >
        <span>
          <span className="block font-display text-2xl text-navy">{busy ? "Enviando…" : "Arraste imagens aqui"}</span>
          <span className="mt-1 block text-sm text-muted">ou clique para escolher · JPG, PNG, WEBP ou GIF · as fotos grandes são reduzidas automaticamente</span>
        </span>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy} onChange={(e) => e.target.files && send(e.target.files)} />
      </label>
      {err && <p className="text-sm font-semibold text-rose-700">{err}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {list.map((a) => (
          <div key={a.id} className="card group overflow-hidden">
            <div className="h-40" style={{ background: "repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0/16px 16px" }}>
              <img src={a.url} alt={a.name} className="h-full w-full object-contain" />
            </div>
            <div className="flex items-start justify-between gap-2 p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-navy">{a.name}</div>
                <div className="text-[11.5px] text-muted">{a.width && `${a.width}×${a.height} · `}{Math.round(a.size / 1024)} KB · {fmtDate(a.createdAt)}</div>
              </div>
              <button onClick={() => setRemoving(a)} className="text-[12px] font-semibold text-rose-700 opacity-0 transition hover:underline group-hover:opacity-100">Arquivar</button>
            </div>
          </div>
        ))}
        {BUILTIN.map((b) => (
          <div key={b.url} className="card overflow-hidden opacity-90">
            <div className="h-40" style={{ background: "repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0/16px 16px" }}>
              <img src={b.url} alt={b.name} className="h-full w-full object-contain" />
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-semibold text-navy">{b.name}</div>
              <div className="text-[11.5px] text-muted">Imagem do sistema</div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Arquivar imagem?"
        footer={
          <>
            <button className="btn-ghost" onClick={() => setRemoving(null)}>Cancelar</button>
            <button className="btn-danger" onClick={async () => { await fetch(`/api/assets/${removing!.id}`, { method: "DELETE" }); setRemoving(null); load(); }}>Arquivar</button>
          </>
        }
      >
        <p className="text-sm">A imagem sai do banco, mas continua aparecendo nas propostas que já a usam.</p>
      </Modal>
    </div>
  );
}
