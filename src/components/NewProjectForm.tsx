"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FASES } from "@/lib/fases";

/** Reduz a foto aérea no navegador (máx. 1800 px, JPEG) antes de enviar. */
function resize(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1800 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

const TIPOS = ["Loteamento aberto", "Loteamento fechado", "Condomínio de lotes", "Chacreamento", "Loteamento industrial"];

export type ProjetoDados = {
  id: string; name: string; municipio: string; uf: string; areaTotal: number; matricula: string | null; tipo: string; fase: string; aerialImage: string | null;
};

const areaTxt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

/** Cria um loteamento novo ou, com `projeto`, edita os dados de um que já existe. */
export default function NewProjectForm({ projeto }: { projeto?: ProjetoDados }) {
  const router = useRouter();
  const editando = !!projeto;
  const [photo, setPhoto] = useState<string | null>(projeto?.aerialImage ?? null);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setOk(false);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const r = await fetch(editando ? `/api/projects/${projeto.id}` : "/api/projects", {
      method: editando ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(fd.entries()), aerialImage: photo }),
    });
    const d = await r.json();
    setSaving(false);
    if (!r.ok) return setErr(d.error ?? "Erro ao salvar.");
    if (editando) {
      setOk(true);
      router.refresh();
      return;
    }
    router.push(`/app/projetos/${d.id}/propostas`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} onChange={() => setOk(false)} className="card grid gap-5 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2"><span className="label">Nome da gleba / loteamento *</span><input name="name" required className="input" placeholder="Ex.: São Judas Tadeu II" defaultValue={projeto?.name} /></label>
        <label><span className="label">Município *</span><input name="municipio" required className="input" defaultValue={projeto?.municipio} /></label>
        <label><span className="label">UF</span><input name="uf" defaultValue={projeto?.uf ?? "SP"} maxLength={2} className="input uppercase" /></label>
        <label><span className="label">Área total (m²) *</span><input name="areaTotal" required inputMode="decimal" className="input text-right" placeholder="137.338,46" defaultValue={projeto ? areaTxt(projeto.areaTotal) : undefined} /></label>
        <label><span className="label">Matrícula</span><input name="matricula" className="input" defaultValue={projeto?.matricula ?? ""} /></label>
        <label className={editando ? "" : "md:col-span-2"}>
          <span className="label">Tipo</span>
          <select name="tipo" className="input" defaultValue={projeto?.tipo ?? TIPOS[0]}>
            {[...new Set([...TIPOS, ...(projeto?.tipo ? [projeto.tipo] : [])])].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        {editando && (
          <label>
            <span className="label">Fase</span>
            <select name="fase" className="input" defaultValue={projeto.fase}>
              {FASES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
        )}
      </div>
      <div>
        <span className="label">Foto aérea da gleba</span>
        <label className="relative grid min-h-[200px] cursor-pointer place-items-center overflow-hidden rounded border-2 border-dashed border-gold-line bg-alt text-center text-sm text-muted hover:border-gold">
          {photo ? (
            <>
              <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-navy/85 px-3 py-1.5 text-[12.5px] font-semibold text-white">Clique para trocar a imagem</span>
            </>
          ) : (
            <span>Clique para escolher a imagem<br /><span className="text-[12px]">Ela aparece na capa das propostas</span></span>
          )}
          <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { if (e.target.files?.[0]) { setPhoto(await resize(e.target.files[0])); setOk(false); } }} />
        </label>
        {photo && (
          <button type="button" className="mt-2 text-[13px] font-semibold text-rose-700 hover:underline" onClick={() => { setPhoto(null); setOk(false); }}>
            Remover imagem
          </button>
        )}
      </div>
      {err && <p className="text-sm font-semibold text-rose-700">{err}</p>}
      <div className="flex items-center justify-end gap-3">
        {ok && <span className="text-sm font-semibold text-emerald-700">✓ Alterações salvas</span>}
        {!editando && <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancelar</button>}
        <button className="btn-gold" disabled={saving}>{saving ? "Salvando…" : editando ? "Salvar alterações" : "Criar loteamento"}</button>
      </div>
    </form>
  );
}
