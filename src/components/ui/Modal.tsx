"use client";

import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  eyebrow?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    // a janela sempre cabe na tela: título e botões fixos, só o meio rola (os botões nunca ficam escondidos)
    <div className="fixed inset-0 z-[1600] flex items-center justify-center bg-navy/55 p-3 sm:p-4" onMouseDown={onClose}>
      <div
        className={`flex max-h-[calc(100dvh-24px)] w-full flex-col ${size === "xl" ? "max-w-[1180px]" : "max-w-md"} rounded-md border-t-[3px] border-gold bg-white shadow-2xl sm:max-h-[calc(100dvh-32px)]`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-3.5 sm:px-6 sm:py-4">
          <div>
            {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
            <h2 className="h-display text-2xl">{title}</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-alt hover:text-navy" aria-label="Fechar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-alt px-5 py-3 sm:px-6 sm:py-3.5">{footer}</div>}
      </div>
    </div>
  );
}
