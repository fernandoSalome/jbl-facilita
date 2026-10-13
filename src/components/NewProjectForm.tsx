"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function NewProjectForm() {
  const router = useRouter();
  const [photo, setPhoto] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...Object.fromEntries(fd.entries()), foto: undefined, aerialImage: photo }),
    });
    const d = await r.json();
    if (!r.ok) {
      setSaving(false);
      return setErr(d.error ?? "Erro ao criar.");
    }
    router.push(`/app/projetos/${d.id}/propostas`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card grid gap-5 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="md:col-span-2"><span className="label">Nome da gleba / loteamento *</span><input name="name" required className="input" placeholder="Ex.: São Judas Tadeu II" /></label>
        <label><span className="label">Município *</span><input name="municipio" required className="input" /></label>
        <label><span className="label">UF</span><input name="uf" defaultValue="SP" maxLength={2} className="input uppercase" /></label>
        <label><span className="label">Área total (m²) *</span><input name="areaTotal" required inputMode="decimal" className="input text-right" placeholder="137.338,46" /></label>
        <label><span className="label">Matrícula</span><input name="matricula" className="input" /></label>
        <label className="md:col-span-2">
          <span className="label">Tipo</span>
          <select name="tipo" className="input">
            <option>Loteamento aberto</option>
            <option>Loteamento fechado</option>
            <option>Condomínio de lotes</option>
            <option>Chacreamento</option>
            <option>Loteamento industrial</option>
          </select>
        </label>
      </div>
      <div>
        <span className="label">Foto aérea da gleba</span>
        <label className="relative grid min-h-[180px] cursor-pointer place-items-center overflow-hidden rounded border-2 border-dashed border-gold-line bg-alt text-center text-sm text-muted hover:border-gold">
          {photo ? <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span>Clique para escolher a imagem<br /><span className="text-[12px]">Ela aparece na capa das propostas</span></span>}
          <input type="file" accept="image/*" className="sr-only" onChange={async (e) => e.target.files?.[0] && setPhoto(await resize(e.target.files[0]))} />
        </label>
      </div>
      {err && <p className="text-sm font-semibold text-rose-700">{err}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => router.back()}>Cancelar</button>
        <button className="btn-gold" disabled={saving}>{saving ? "Criando…" : "Criar loteamento"}</button>
      </div>
    </form>
  );
}
