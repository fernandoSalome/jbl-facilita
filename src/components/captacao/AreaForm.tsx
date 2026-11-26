"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Poligono } from "@/lib/poligono";
import { ETAPAS } from "@/lib/captacao";
import { chamar } from "./chamar";
import EnviarKmz from "./EnviarKmz";
import MapaArea from "./MapaArea";

type Dados = { id?: string; nome: string; cidade: string; uf: string; dono: string; corretor: string; hectares: string; etapa: string; relatorio: string };

/** Cadastro e edição da área: proprietário ou corretor (um dos dois basta), KMZ/KML opcional */
export default function AreaForm({ inicial }: { inicial?: Dados }) {
  const router = useRouter();
  const [d, setD] = useState<Dados>(inicial ?? { nome: "", cidade: "", uf: "SP", dono: "", corretor: "", hectares: "", etapa: "captacao", relatorio: "" });
  const [poligono, setPoligono] = useState<Poligono | null>(null);
  const [arquivo, setArquivo] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Dados) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

  async function lerArquivo(f: File | undefined) {
    if (!f) return;
    setArquivo(f.name);
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

  const campos = (
    <>
      <div className={`grid gap-4 ${d.id ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <label><span className="label">Cidade *</span><input className="input" value={d.cidade} onChange={set("cidade")} /></label>
        <label><span className="label">UF *</span><input className="input" maxLength={2} value={d.uf} onChange={set("uf")} /></label>
        <label><span className="label">Nome da área</span><input className="input" placeholder="Ex.: Sítio do Pedro" value={d.nome} onChange={set("nome")} /></label>
        <label><span className="label">Proprietário</span><input className="input" value={d.dono} onChange={set("dono")} /></label>
        <label><span className="label">Corretor</span><input className="input" value={d.corretor} onChange={set("corretor")} /></label>
        <label><span className="label">Tamanho (ha)</span><input className="input" inputMode="decimal" value={d.hectares} onChange={set("hectares")} /></label>
        <label><span className="label">Etapa</span><select className="input" value={d.etapa} onChange={set("etapa")}>{ETAPAS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
      </div>
      {/* área já criada: o KMZ se troca em "Trocar o KMZ", que pergunta o que fazer com o estudo (pedido 23/11/2026) */}
      {!d.id && <div><span className="label">KMZ ou KML da área</span><EnviarKmz nome={arquivo} onArquivo={lerArquivo} /></div>}
      <p className="text-[12.5px] text-muted">Proprietário ou corretor: basta um dos dois.</p>
      <div className="flex items-center gap-3">
        <button className="btn-gold" disabled={busy} onClick={salvar}>{d.id ? "Salvar" : "Criar área"}</button>
        {msg && <span className="text-sm font-semibold text-navy">{msg}</span>}
      </div>
    </>
  );

  if (d.id) return <div className="card grid gap-4 p-5">{campos}</div>;
  // área nova: à direita, o KMZ no mapa para conferir se é o terreno certo (pedido 26/11/2026)
  return (
    <div className="card grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">{campos}</div>
      <div>
        <span className="label">Confira no mapa</span>
        {poligono
          ? <MapaArea poligono={poligono} altura={300} />
          : <div className="grid h-[300px] place-items-center rounded-md border-2 border-dashed border-line px-6 text-center text-sm text-muted">Suba o KMZ para ver o terreno aqui.</div>}
      </div>
    </div>
  );
}
