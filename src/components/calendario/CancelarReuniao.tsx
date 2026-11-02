"use client";

import { useState } from "react";

export default function CancelarReuniao({ token }: { token: string }) {
  const [estado, setEstado] = useState<"" | "enviando" | "ok" | string>("");
  if (estado === "ok") return <p className="rounded bg-emerald-50 px-3 py-2 text-[14px] text-emerald-800">Reunião cancelada. Você vai receber a confirmação por e-mail.</p>;
  return (
    <>
      <button
        className="btn-danger w-full"
        disabled={estado === "enviando"}
        onClick={async () => {
          setEstado("enviando");
          const r = await fetch(`/api/public/agenda/cancelar/${token}`, { method: "POST" });
          const j = await r.json().catch(() => ({}));
          setEstado(r.ok ? "ok" : j.error ?? "Não foi possível cancelar");
        }}
      >
        {estado === "enviando" ? "Cancelando…" : "Cancelar a reunião"}
      </button>
      {estado && estado !== "enviando" && <p className="mt-3 text-[13px] text-rose-700">{estado}</p>}
    </>
  );
}
