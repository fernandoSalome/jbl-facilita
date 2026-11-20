"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Poligono } from "@/lib/kml";
import { ETAPAS } from "@/lib/captacao";
import { chamar } from "./chamar";

type Dados = { id?: string; nome: string; cidade: string; uf: string; dono: string; corretor: string; hectares: string; etapa: string; relatorio: string };

/** Cadastro e edição da área: proprietário ou corretor (um dos dois basta), KMZ/KML opcional */
export default function AreaForm({ inicial }: { inicial?: Dados }) {
  const router = useRouter();
  const [d, setD] = useState<Dados>(inicial ?? { nome: "", cidade: "", uf: "SP", dono: "", corretor: "", hectares: "", etapa: "captacao", relatorio: "" });
  const [poligono, setPoligono] = useState<Poligono | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Dados) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

  async function lerArquivo(f: File | undefined) {
    if (!f) return;
    setMsg("Lendo o arquivo…");
    const fd = new FormData();
    fd.append("arquivo", f);
    try {
      const r = await chamar<{ poligono: Poligono; hectares: number }>("/api/areas/kml", "POST", fd);
      setPoligono(r.poligono);
      setD((x) => ({ ...x, hectares: String(r.hectares).replace(".", ",") }));
      setMsg(`✅ Polígono lido: ${r.hectares.toLocaleString("pt-BR")} ha`);
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  async function salvar() {
    setBusy(true);
    setMsg("");
    try {
      const corpo = { ...d, relatorio: d.relatorio || null, ...(poligono ? { poligono } : {}) };
      if (d.id) {
        await chamar(`/api/areas/${d.id}`, "PATCH", corpo);
        router.refresh();
        setMsg("✅ Salvo.");
      } else {
        const r = await chamar<{ id: string }>("/api/areas", "POST", corpo);
        router.push(`/app/captacao/${r.id}`);
      }
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="card grid gap-4 p-5">
      <div className="grid gap-4 md:grid-cols-3">
        <label><span className="label">Cidade *</span><input className="input" value={d.cidade} onChange={set("cidade")} /></label>
        <label><span className="label">UF *</span><input className="input" maxLength={2} value={d.uf} onChange={set("uf")} /></label>
        <label><span className="label">Nome da área</span><input className="input" placeholder="Ex.: Sítio do Pedro" value={d.nome} onChange={set("nome")} /></label>
        <label><span className="label">Proprietário</span><input className="input" value={d.dono} onChange={set("dono")} /></label>
        <label><span className="label">Corretor</span><input className="input" value={d.corretor} onChange={set("corretor")} /></label>
        <label><span className="label">Tamanho (ha)</span><input className="input" inputMode="decimal" value={d.hectares} onChange={set("hectares")} /></label>
        <label><span className="label">Etapa</span><select className="input" value={d.etapa} onChange={set("etapa")}>{ETAPAS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
        <label className="md:col-span-2"><span className="label">Link do raio-x (Estudo 1)</span><input className="input" placeholder="https://claude.ai/artifact/…" value={d.relatorio} onChange={set("relatorio")} /></label>
      </div>
      <label><span className="label">KMZ ou KML da área</span><input type="file" accept=".kml,.kmz" className="text-sm" onChange={(e) => lerArquivo(e.target.files?.[0])} /></label>
      <p className="text-[12.5px] text-muted">Proprietário ou corretor: basta um dos dois.</p>
      <div className="flex items-center gap-3">
        <button className="btn-gold" disabled={busy} onClick={salvar}>{d.id ? "Salvar" : "Criar área"}</button>
        {msg && <span className="text-sm font-semibold text-navy">{msg}</span>}
      </div>
    </div>
  );
}
