"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { haTexto, type ModoTroca } from "@/lib/area-kmz";
import type { Poligono } from "@/lib/poligono";
import { chamar } from "./chamar";

/**
 * Trocar o KMZ da área (pedido 23/11/2026): lê o arquivo novo, mostra o tamanho de antes e de agora e pede para
 * escolher (sem opção marcada) entre manter o estudo e só trocar o KMZ, ou apagar o estudo para refazer.
 */
export default function TrocarKmz({ id, temKmz, haAtual }: { id: string; temKmz: boolean; haAtual: number | null }) {
  const router = useRouter();
  const [novo, setNovo] = useState<{ poligono: Poligono; hectares: number; nome: string } | null>(null);
  const [modo, setModo] = useState<ModoTroca | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function ler(f: File | undefined) {
    if (!f) return;
    setMsg("Lendo o arquivo…");
    setNovo(null);
    setModo(null);
    const fd = new FormData();
    fd.append("arquivo", f);
    try {
      const r = await chamar<{ poligono: Poligono; hectares: number }>("/api/areas/kml", "POST", fd);
      setNovo({ ...r, nome: f.name });
      setMsg("");
    } catch (e) {
      setMsg((e as Error).message);
    }
  }
  async function trocar() {
    if (!novo) return;
    // sem KMZ antes não há estudo de outro polígono: só salva
    const modo2 = temKmz ? modo : "manter";
    if (!modo2) return setMsg("Escolha se mantém ou apaga o estudo.");
    if (modo2 === "apagar" && !confirm("Apagar a Viabilidade Legal, a Mercadológica, os relatórios e o que os estudos puseram no checklist? Não dá para desfazer.")) return;
    setBusy(true);
    try {
      await chamar(`/api/areas/${id}/kmz`, "POST", { poligono: novo.poligono, modo: modo2 });
      setNovo(null);
      setModo(null);
      setMsg(modo2 === "apagar" ? "✅ KMZ trocado e estudo apagado. Peça a Viabilidade Legal de novo na Pré-viabilidade." : temKmz ? "✅ KMZ trocado; o estudo ficou como estava." : "✅ KMZ salvo.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  const Opcao = ({ v, titulo, sub }: { v: ModoTroca; titulo: string; sub: string }) => (
    <label className={`flex cursor-pointer gap-3 rounded-md border-2 px-4 py-3 ${modo === v ? "border-gold bg-gold-soft" : "border-line bg-white"}`}>
      <input type="radio" name="modo-kmz" className="mt-1" checked={modo === v} onChange={() => setModo(v)} />
      <span><b className="text-navy">{titulo}</b><span className="block text-[12.5px] text-muted">{sub}</span></span>
    </label>
  );

  return (
    <section className="card grid gap-3 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-lg text-navy">🗺️ {temKmz ? "Trocar o KMZ" : "Subir o KMZ"}</h3>
        <span className="text-[13px] text-muted">{temKmz ? `KMZ atual: ${haTexto(haAtual)}` : "A área ainda não tem KMZ."}</span>
      </div>
      <label className="btn-ghost w-fit cursor-pointer text-[14px]">
        📎 Escolher o KMZ ou KML
        <input type="file" accept=".kml,.kmz" className="hidden" onChange={(e) => { ler(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {novo && (
        <>
          <p className="text-[14px] text-navy">
            <b>{novo.nome}</b>: {haTexto(novo.hectares)}
            {temKmz && <span className="text-muted"> (antes: {haTexto(haAtual)})</span>}
          </p>
          {temKmz && (
            <div className="grid gap-2 md:grid-cols-2">
              <Opcao v="manter" titulo="Manter o estudo e só trocar o KMZ" sub="Viabilidades, relatórios e checklist ficam como estão." />
              <Opcao v="apagar" titulo="Apagar todo o estudo da área" sub="Some a Viabilidade Legal e a Mercadológica, os relatórios e o que os estudos puseram no checklist. Conversas e anotações ficam." />
            </div>
          )}
          <div className="flex items-center gap-3">
            <button className="btn-gold" disabled={busy} onClick={trocar}>
              {temKmz ? "Trocar o KMZ" : "Salvar o KMZ"}
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => { setNovo(null); setModo(null); setMsg(""); }}>Cancelar</button>
          </div>
        </>
      )}
      {msg && <p className="text-sm font-semibold text-navy">{msg}</p>}
    </section>
  );
}
