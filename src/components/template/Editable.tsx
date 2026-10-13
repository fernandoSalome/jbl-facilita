"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Overrides } from "@/lib/proposals";

/**
 * Todo texto do template passa por <E k="chave">. Na página pública mostra o texto
 * (ou a versão alterada à mão). No portal, em modo edição, basta clicar no texto para
 * editar ali mesmo: Enter (ou clicar fora) salva, Esc cancela. O que foi alterado
 * fica marcado em amarelo com ✎ e pode voltar ao original.
 */

type Ctx = {
  overrides: Overrides;
  editable: boolean;
  save: (k: string, v: string | null) => Promise<void>;
};

const EditCtx = createContext<Ctx>({ overrides: {}, editable: false, save: async () => {} });

function selectAll(el: HTMLElement) {
  const r = document.createRange();
  r.selectNodeContents(el);
  const s = window.getSelection();
  s?.removeAllRanges();
  s?.addRange(r);
}

export function E({ k, children, multiline }: { k: string; children: string; label?: string; multiline?: boolean }) {
  const { overrides, editable, save } = useContext(EditCtx);
  const changed = k in overrides;
  const text = changed ? overrides[k] : children;
  const ref = useRef<HTMLSpanElement>(null);
  const [editing, setEditing] = useState(false);
  const isMulti = multiline ?? children.length > 90;

  if (!editable) return <>{text}</>;

  function finish(commit: boolean) {
    const el = ref.current;
    setEditing(false);
    if (!el) return;
    const v = el.innerText.replace(/ /g, " ").trim();
    if (!commit || v === text) {
      el.innerText = text;
      return;
    }
    if (!v || v === children) save(k, null);
    else save(k, v);
  }

  return (
    <span className="edw" key={`${k}:${text}`}>
      <span
        ref={ref}
        className={`ed ${changed ? "changed" : ""} ${editing ? "editing" : ""}`}
        title={editing ? undefined : changed ? `Alterado à mão. Original: ${children}` : "Clique para editar"}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={editing}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (editing) return;
          setEditing(true);
          requestAnimationFrame(() => {
            if (!ref.current) return;
            ref.current.focus();
            selectAll(ref.current);
          });
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            finish(false);
            ref.current?.blur();
          }
          if (e.key === "Enter" && (!isMulti || e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            ref.current?.blur();
          }
        }}
        onPaste={(e) => {
          // cola só texto puro, sem formatação de outro site/documento
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        onBlur={() => editing && finish(true)}
      >
        {text}
      </span>
      {editing && (
        <span className="ed-bar" contentEditable={false} onMouseDown={(e) => e.preventDefault()}>
          <button onClick={() => ref.current?.blur()}>✓ Salvar</button>
          {changed && (
            <button
              onClick={() => {
                setEditing(false);
                save(k, null);
              }}
            >
              ↺ Original
            </button>
          )}
          <span>{isMulti ? "Ctrl+Enter salva · Esc cancela" : "Enter salva · Esc cancela"}</span>
        </span>
      )}
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
  const [toast, setToast] = useState("");

  useEffect(() => setOverrides(initial), [initial]);

  async function save(k: string, v: string | null) {
    setOverrides((o) => {
      const n = { ...o };
      if (v === null) delete n[k];
      else n[k] = v;
      return n;
    });
    await onSave?.(k, v);
    setToast(v === null ? "Voltou ao original" : "Salvo");
    setTimeout(() => setToast(""), 1600);
  }

  return (
    <EditCtx.Provider value={{ overrides, editable, save }}>
      {children}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded bg-navy px-4 py-2 font-sans text-sm font-semibold text-white shadow-xl">
          ✓ {toast}
        </div>
      )}
    </EditCtx.Provider>
  );
}
