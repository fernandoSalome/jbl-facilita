"use client";

import { useRef } from "react";

type Modo = "edit" | "preview";

/** Elementos de texto usados como âncora para manter a tela no mesmo ponto ao trocar o modo */
const ANCORAS = "h1, h2, h3, h4, p, li, tr, .share, figure, img";

/**
 * Botões "Editar" / "Ver como o cliente" da barra fixa do topo. Ao trocar, a página continua
 * no mesmo trecho (a proposta é montada de novo e a altura muda um pouco entre os modos).
 */
export default function ModoToggle({ mode, onChange }: { mode: Modo; onChange: (m: Modo) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  function trocar(m: Modo) {
    if (m === mode) return;
    const raiz = document.querySelector(".jblt");
    const topo = ref.current?.closest(".sticky")?.getBoundingClientRect().bottom ?? 0;
    // primeiro trecho com texto (ou imagem) que aparece logo abaixo da barra
    let ancora: { texto: string; tag: string; src: string; y: number } | null = null;
    if (raiz) {
      for (const el of raiz.querySelectorAll<HTMLElement>(ANCORAS)) {
        const r = el.getBoundingClientRect();
        if (r.bottom <= topo || r.height === 0) continue;
        const texto = (el.textContent ?? "").trim().slice(0, 120);
        const src = el instanceof HTMLImageElement ? el.getAttribute("src") ?? "" : "";
        if (!texto && !src) continue;
        ancora = { texto, tag: el.tagName, src, y: r.top };
        break;
      }
    }
    const y0 = window.scrollY;
    onChange(m);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const nova = document.querySelector(".jblt");
        const achado =
          ancora && nova
            ? [...nova.querySelectorAll<HTMLElement>(ancora.tag)].find((el) =>
                ancora!.src ? el.getAttribute("src") === ancora!.src : (el.textContent ?? "").trim().slice(0, 120) === ancora!.texto,
              )
            : undefined;
        if (achado && ancora) window.scrollBy(0, achado.getBoundingClientRect().top - ancora.y);
        else window.scrollTo(0, y0);
      }),
    );
  }

  return (
    <div ref={ref} className="inline-flex rounded border border-line bg-white p-0.5 text-[13px] font-semibold">
      <button onClick={() => trocar("edit")} className={`rounded-sm px-3 py-1.5 ${mode === "edit" ? "bg-navy text-white" : "text-muted"}`}>Editar</button>
      <button onClick={() => trocar("preview")} className={`rounded-sm px-3 py-1.5 ${mode === "preview" ? "bg-navy text-white" : "text-muted"}`}>Ver como o cliente</button>
    </div>
  );
}
