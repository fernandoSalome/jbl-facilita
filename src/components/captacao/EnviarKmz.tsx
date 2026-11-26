"use client";

import { useRef, useState } from "react";

/** Caixa de arrastar e soltar o KMZ/KML, que também abre o seletor ao clicar (pedido 26/11/2026) */
export default function EnviarKmz({ nome, onArquivo }: { nome?: string; onArquivo: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);

  function soltar(e: React.DragEvent) {
    e.preventDefault();
    setSobre(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onArquivo(f);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setSobre(true); }}
      onDragLeave={() => setSobre(false)}
      onDrop={soltar}
      className={`grid cursor-pointer place-items-center gap-1 rounded-md border-2 border-dashed px-4 py-6 text-center transition ${sobre ? "border-gold bg-gold-soft" : "border-gold-line bg-white hover:bg-gold-soft"}`}
    >
      <span className="text-2xl" aria-hidden>📍</span>
      <span className="text-sm font-semibold text-navy">Clique para subir um KMZ ou arraste e solte aqui</span>
      <span className="text-[12.5px] text-muted">{nome ? `Arquivo: ${nome}` : ".kmz ou .kml, até 5 MB"}</span>
      <input
        ref={input}
        type="file"
        accept=".kml,.kmz"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onArquivo(f); e.target.value = ""; }}
      />
    </div>
  );
}
