"use client";

import { useRouter } from "next/navigation";

/** Rodapé do menu: alterna entre o modo simples e o completo */
export default function BotaoModo({ simples }: { simples: boolean }) {
  const router = useRouter();
  return (
    <button
      className="mb-3 w-full rounded border border-white/15 px-3 py-1.5 text-left text-[12.5px] text-white/70 hover:border-gold/60 hover:text-white"
      onClick={async () => {
        await fetch("/api/modo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ modo: simples ? "completo" : "simples" }) });
        router.refresh();
      }}
    >
      {simples ? "☰ Ver tudo (modo completo)" : "✨ Voltar ao modo simples"}
    </button>
  );
}
