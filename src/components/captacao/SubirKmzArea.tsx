"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { haTexto } from "@/lib/area-kmz";
import type { Poligono } from "@/lib/poligono";
import { chamar } from "./chamar";
import EnviarKmz from "./EnviarKmz";
import MapaArea from "./MapaArea";

type Escolha = "os-dois" | "estudo" | "mercado" | "nenhum";

const OPCOES: [Escolha, string, string][] = [
  ["os-dois", "Viabilidade Legal e Mercadológica", "A Legal primeiro; a Mercadológica entra sozinha quando ela terminar."],
  ["estudo", "Só a Viabilidade Legal", "Zona, lote mínimo, APP, lotes e alertas."],
  ["mercado", "Só a Viabilidade Mercadológica", "Concorrentes, preço do m² e encaixe do produto."],
  ["nenhum", "Só guardar o KMZ", "Sem estudo agora."],
];

/**
 * Área sem KMZ (pedido 28/11/2026: propostas feitas antes do KMZ, como a do Sr. Rogério em Valinhos): sobe o
 * arquivo ali mesmo, confere no mapa e escolhe os estudos. A etapa e a proposta que já existe não mudam.
 */
export default function SubirKmzArea({ id, haCadastro }: { id: string; haCadastro: number | null }) {
  const router = useRouter();
  const [novo, setNovo] = useState<{ poligono: Poligono; hectares: number; nome: string } | null>(null);
  const [escolha, setEscolha] = useState<Escolha>("os-dois");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function ler(f: File) {
    setMsg("Lendo o arquivo…");
    setNovo(null);
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

  async function salvar() {
    if (!novo) return;
    setBusy(true);
    setMsg("");
    try {
      await chamar(`/api/areas/${id}/kmz`, "POST", { poligono: novo.poligono, modo: "manter" });
      if (escolha !== "nenhum") await chamar(`/api/areas/${id}/estudo-vps`, "POST", { tipo: escolha });
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="card grid gap-4 p-5">
      <div>
        <h3 className="font-display text-lg text-navy">🗺️ Esta área ainda não tem KMZ</h3>
        <p className="text-[13px] text-muted">Suba o arquivo para conferir no mapa e pedir os estudos. A etapa e a proposta que já existe não mudam.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <EnviarKmz nome={novo?.nome} onArquivo={ler} />
          {novo && (
            <>
              <p className="text-[14px] text-navy">
                <b>{novo.nome}</b>: {haTexto(novo.hectares)}
                {haCadastro ? <span className="text-muted"> (no cadastro: {haTexto(haCadastro)})</span> : null}
              </p>
              <div className="grid gap-2">
                <span className="label">Quais estudos fazer?</span>
                {OPCOES.map(([v, titulo, sub]) => (
                  <label key={v} className={`flex cursor-pointer gap-3 rounded-md border-2 px-4 py-2.5 ${escolha === v ? "border-gold bg-gold-soft" : "border-line bg-white"}`}>
                    <input type="radio" name={`estudos-${id}`} className="mt-1" checked={escolha === v} onChange={() => setEscolha(v)} />
                    <span><b className="text-navy">{titulo}</b><span className="block text-[12.5px] text-muted">{sub}</span></span>
                  </label>
                ))}
              </div>
              <button className="btn-gold w-fit" disabled={busy} onClick={salvar}>
                {busy ? "Salvando…" : escolha === "nenhum" ? "Guardar o KMZ" : "Guardar o KMZ e fazer o estudo"}
              </button>
            </>
          )}
          {msg && <p className="text-sm font-semibold text-navy">{msg}</p>}
        </div>
        <div>
          <span className="label">Confira no mapa</span>
          {novo
            ? <MapaArea poligono={novo.poligono} altura={300} />
            : <div className="grid h-[300px] place-items-center rounded-md border-2 border-dashed border-line px-6 text-center text-sm text-muted">Suba o KMZ para ver o terreno aqui.</div>}
        </div>
      </div>
    </section>
  );
}
