"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Overrides } from "@/lib/proposals";

/**
 * Qualquer valor ou texto do template passa por <E k="chave">. Na página pública
 * mostra o texto (ou o que foi alterado à mão). No portal, com `editable`, um clique
 * abre o editor e o valor alterado fica marcado em amarelo com ✎.
 */

type Ctx = {
  overrides: Overrides;
  editable: boolean;
  open: (k: string, label: string, calculated: string, multiline: boolean) => void;
};

const EditCtx = createContext<Ctx>({ overrides: {}, editable: false, open: () => {} });

export function E({ k, children, label, multiline }: { k: string; children: string; label?: string; multiline?: boolean }) {
  const { overrides, editable, open } = useContext(EditCtx);
  const changed = k in overrides;
  const text = changed ? overrides[k] : children;
  if (!editable) return <>{text}</>;
  return (
    <span
      className={`ed ${changed ? "changed" : ""}`}
      title={changed ? `Alterado manualmente. Calculado: ${children}` : "Clique para editar"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        open(k, label ?? k, children, multiline ?? children.length > 80);
      }}
    >
      {text}
    </span>
  );
}

export function EditProvider({
  overrides: initial,
  editable,
  onSave,
  children,
}: {
  overrides: Overrides;
  editable: boolean;
  onSave?: (k: string, v: string | null) => Promise<void>;
  children: React.ReactNode;
}) {
  const [overrides, setOverrides] = useState(initial);
  const [cur, setCur] = useState<{ k: string; label: string; calculated: string; multiline: boolean } | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => setOverrides(initial), [initial]);

  async function save(v: string | null) {
    if (!cur) return;
    setSaving(true);
    await onSave?.(cur.k, v);
    setOverrides((o) => {
      const n = { ...o };
      if (v === null || v === cur.calculated) delete n[cur.k];
      else n[cur.k] = v;
      return n;
    });
    setSaving(false);
    setCur(null);
  }

  return (
    <EditCtx.Provider
      value={{
        overrides,
        editable,
        open: (k, label, calculated, multiline) => {
          setCur({ k, label, calculated, multiline });
          setDraft(k in overrides ? overrides[k] : calculated);
        },
      }}
    >
      {children}
      {cur && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-navy/50 p-4" onMouseDown={() => !saving && setCur(null)}>
          <div className="w-full max-w-lg rounded-md border-t-[3px] border-gold bg-white p-6 font-sans shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="eyebrow">Editar na proposta</div>
            <h3 className="h-display mt-2 text-xl">{cur.label}</h3>
            <div className="mt-3 rounded bg-alt px-3 py-2 text-[13px] text-muted">
              Valor {cur.k.startsWith("txt.") ? "original" : "calculado"}: <b className="text-navy">{cur.calculated}</b>
            </div>
            {cur.multiline ? (
              <textarea autoFocus rows={7} value={draft} onChange={(e) => setDraft(e.target.value)} className="input mt-3 text-[15px] leading-relaxed" />
            ) : (
              <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save(draft)} className="input mt-3 text-lg" />
            )}
            <p className="mt-2 text-[12px] text-muted">O que você alterar fica marcado em amarelo aqui no portal. A família vê o texto normal.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {cur.k in overrides && (
                <button className="btn-ghost mr-auto" disabled={saving} onClick={() => save(null)}>
                  ↺ Voltar ao {cur.k.startsWith("txt.") ? "original" : "calculado"}
                </button>
              )}
              <button className="btn-ghost ml-auto" disabled={saving} onClick={() => setCur(null)}>Cancelar</button>
              <button className="btn-gold" disabled={saving} onClick={() => save(draft)}>{saving ? "Salvando…" : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </EditCtx.Provider>
  );
}
