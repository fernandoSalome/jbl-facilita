"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Overrides } from "@/lib/proposals";
import { escapeHtml, HTML_PREFIX, sanitizeHtml } from "@/lib/sanitize";

/**
 * Edição visual da proposta. Tudo o que é alterado vira uma entrada em "overrides":
 *   txt.* / v.* / t.* / form.*  texto (simples ou "html:" formatado)
 *   link.*  endereço de um botão     btn.*  tamanho do botão (sm | md | lg)
 *   img.*   imagem trocada/ajustada  block.*  cor de fundo / seção oculta
 *   theme.* cores da proposta
 * Na página pública nada disso aparece: só o resultado.
 */

type Ctx = {
  overrides: Overrides;
  editable: boolean;
  save: (k: string, v: unknown) => Promise<void>;
  /** Altera só na tela (sem salvar). Usado enquanto arrasta o seletor de cor. */
  preview: (k: string, v: unknown) => void;
};

const EditCtx = createContext<Ctx>({ overrides: {}, editable: false, save: async () => {}, preview: () => {} });
const LinkCtx = createContext<{ k: string; href: string; defaultHref: string } | null>(null);

export const useEdit = () => useContext(EditCtx);

function plainToHtml(t: string) {
  return escapeHtml(t).replace(/\n/g, "<br>");
}

function valueToHtml(v: unknown, fallback: string) {
  if (typeof v !== "string") return plainToHtml(fallback);
  return v.startsWith(HTML_PREFIX) ? sanitizeHtml(v.slice(HTML_PREFIX.length)) : plainToHtml(v);
}

/* ------------------------------------------------------------------ texto */

export function E({ k, children, multiline }: { k: string; children: string; label?: string; multiline?: boolean }) {
  const { overrides, editable, save } = useContext(EditCtx);
  const link = useContext(LinkCtx);
  const changed = k in overrides;
  const html = valueToHtml(overrides[k], children);
  const ref = useRef<HTMLSpanElement>(null);
  const [editing, setEditing] = useState(false);
  const isMulti = multiline ?? children.length > 90;

  if (!editable) {
    if (!changed && !children.includes("\n")) return <>{children}</>;
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  function commit() {
    const el = ref.current;
    setEditing(false);
    if (!el) return;
    const clean = sanitizeHtml(el.innerHTML).replace(/(<br>)+$/, "").trim();
    if (clean === sanitizeHtml(html)) return;
    if (clean === sanitizeHtml(plainToHtml(children)) || !clean) return void save(k, null);
    const hasTags = /<(?!br>)[a-z]/i.test(clean);
    save(k, hasTags || clean.includes("<br>") ? HTML_PREFIX + clean : el.innerText.trim());
  }

  function cancel() {
    if (ref.current) ref.current.innerHTML = html;
    setEditing(false);
  }

  return (
    <>
      <span
        key={`${k}:${html}`}
        ref={ref}
        className={`ed ${changed ? "changed" : ""} ${editing ? "editing" : ""}`}
        title={editing ? undefined : changed ? "Alterado à mão. Clique para editar" : "Clique para editar"}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={editing}
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (editing) return;
          setEditing(true);
          requestAnimationFrame(() => {
            const el = ref.current;
            if (!el) return;
            el.focus();
            const r = document.createRange();
            r.selectNodeContents(el);
            const s = window.getSelection();
            s?.removeAllRanges();
            s?.addRange(r);
          });
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
          if (e.key === "Enter" && (!isMulti || e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            commit();
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
      />
      {editing && ref.current && (
        <Toolbar
          target={ref.current}
          multi={isMulti}
          changed={changed}
          link={link}
          onCommit={commit}
          onCancel={cancel}
          onReset={() => {
            setEditing(false);
            save(k, null);
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------- barra de formatação */

const SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 56, 64];
const SWATCHES = ["#122A45", "#C1943D", "#A2782F", "#2B3A4A", "#697683", "#2E7D4F", "#B3261E", "#FFFFFF", "#000000"];
const HIGHLIGHTS = ["#FFE58A", "#F7F2E7", "#DFF3E6", "#E3ECF7", "#FDE2E1"];

function Toolbar({
  target,
  multi,
  changed,
  link,
  onCommit,
  onCancel,
  onReset,
}: {
  target: HTMLElement;
  multi: boolean;
  changed: boolean;
  link: { k: string; href: string; defaultHref: string } | null;
  onCommit: () => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  const { overrides, save } = useContext(EditCtx);
  const bar = useRef<HTMLDivElement>(null);
  const range = useRef<Range | null>(null);
  const [pos, setPos] = useState({ top: -999, left: 0 });
  const [href, setHref] = useState(link?.href ?? "");
  const btnSize = link ? ((overrides[`btn.${link.k}`] as string) ?? "md") : "md";

  // acompanha o texto na tela (rolagem, redimensionamento)
  useLayoutEffect(() => {
    let raf = 0;
    const place = () => {
      const r = target.getBoundingClientRect();
      const h = bar.current?.offsetHeight ?? 44;
      const w = bar.current?.offsetWidth ?? 520;
      const below = r.bottom + 10 + h < window.innerHeight;
      setPos({
        top: below ? r.bottom + 10 : Math.max(8, r.top - h - 10),
        left: Math.min(Math.max(8, r.left), window.innerWidth - w - 8),
      });
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // guarda a seleção para aplicar formatação depois de clicar em cor/tamanho
  useEffect(() => {
    const onSel = () => {
      const s = window.getSelection();
      if (s && s.rangeCount && target.contains(s.anchorNode)) range.current = s.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", onSel);
    // clicar fora do texto e da barra salva
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!target.contains(t) && !bar.current?.contains(t)) onCommit();
    };
    document.addEventListener("mousedown", onDown, true);
    return () => {
      document.removeEventListener("selectionchange", onSel);
      document.removeEventListener("mousedown", onDown, true);
    };
  }, [target, onCommit]);

  function restore() {
    target.focus();
    const s = window.getSelection();
    if (range.current && s) {
      s.removeAllRanges();
      s.addRange(range.current);
    }
  }

  function exec(cmd: string, val?: string) {
    restore();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, val);
  }

  function fontSize(px: number) {
    restore();
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, "7");
    target.querySelectorAll('font[size="7"], span[style*="xxx-large"]').forEach((f) => {
      const s = document.createElement("span");
      s.style.fontSize = `${px}px`;
      s.innerHTML = f.innerHTML;
      f.replaceWith(s);
    });
    document.execCommand("styleWithCSS", false, "true");
  }

  function currentSize() {
    const node = range.current?.startContainer;
    const el = node?.nodeType === 3 ? node.parentElement : (node as HTMLElement | undefined);
    return Math.round(parseFloat(getComputedStyle(el ?? target).fontSize) || 16);
  }

  const B = ({ title, onClick, children, active }: { title: string; onClick: () => void; children: React.ReactNode; active?: boolean }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded px-1.5 text-[13px] font-semibold transition ${active ? "bg-gold text-navy" : "text-white hover:bg-white/15"}`}
    >
      {children}
    </button>
  );
  const Sep = () => <span className="mx-0.5 h-5 w-px bg-white/20" />;

  return createPortal(
    <div
      ref={bar}
      data-ed-toolbar
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[2000] flex max-w-[calc(100vw-16px)] flex-wrap items-center gap-0.5 rounded-md bg-navy p-1 font-sans text-white shadow-[0_14px_34px_-10px_rgba(0,0,0,.5)] ring-1 ring-gold/40"
    >
      <B title="Negrito (Ctrl+B)" onClick={() => exec("bold")}><b>B</b></B>
      <B title="Itálico (Ctrl+I)" onClick={() => exec("italic")}><i className="font-display">I</i></B>
      <B title="Sublinhado (Ctrl+U)" onClick={() => exec("underline")}><u>U</u></B>
      <B title="Tachado" onClick={() => exec("strikeThrough")}><s>S</s></B>
      <Sep />
      <B title="Diminuir letra" onClick={() => fontSize(Math.max(10, currentSize() - 2))}>A−</B>
      <select
        title="Tamanho da letra"
        className="h-8 rounded bg-white/10 px-1 text-[12px] text-white outline-none"
        value=""
        onMouseDown={() => restore()}
        onChange={(e) => e.target.value && fontSize(Number(e.target.value))}
      >
        <option value="">Tamanho</option>
        {SIZES.map((s) => <option key={s} value={s} className="text-navy">{s}px</option>)}
      </select>
      <B title="Aumentar letra" onClick={() => fontSize(currentSize() + 2)}>A+</B>
      <Sep />
      <ColorBtn title="Cor do letra" label="A" swatches={SWATCHES} onPick={(c) => exec("foreColor", c)} underline />
      <ColorBtn title="Grifar / cor de fundo do texto" label="▮" swatches={HIGHLIGHTS} onPick={(c) => exec("hiliteColor", c)} onClear={() => exec("hiliteColor", "transparent")} />
      <B title="Limpar formatação" onClick={() => exec("removeFormat")}>⌫</B>
      {link && (
        <>
          <Sep />
          <span className="flex items-center gap-1 pl-1">
            <span className="text-[11px] text-white/60">Link</span>
            <input
              value={href}
              onChange={(e) => setHref(e.target.value)}
              onBlur={() => href !== link.href && save(`link.${link.k}`, href === link.defaultHref || !href ? null : href)}
              onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
              placeholder="https://… ou #secao"
              className="h-8 w-48 rounded bg-white/10 px-2 text-[12px] text-white outline-none placeholder:text-white/40 focus:bg-white/20"
            />
          </span>
          <span className="flex items-center gap-0.5 pl-1" title="Tamanho do botão">
            {(["sm", "md", "lg"] as const).map((s) => (
              <B key={s} title={`Botão ${s === "sm" ? "menor" : s === "lg" ? "maior" : "normal"}`} active={btnSize === s} onClick={() => save(`btn.${link.k}`, s === "md" ? null : s)}>
                {s === "sm" ? "P" : s === "md" ? "M" : "G"}
              </B>
            ))}
          </span>
        </>
      )}
      <Sep />
      {changed && <B title="Voltar ao texto original" onClick={onReset}>↺</B>}
      <B title="Cancelar (Esc)" onClick={onCancel}>✕</B>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onCommit}
        className="h-8 rounded bg-gold px-3 text-[12.5px] font-bold text-navy hover:brightness-110"
        title={multi ? "Salvar (Ctrl+Enter)" : "Salvar (Enter)"}
      >
        ✓ Salvar
      </button>
    </div>,
    document.body,
  );
}

function ColorBtn({ title, label, swatches, onPick, onClear, underline }: { title: string; label: string; swatches: string[]; onPick: (c: string) => void; onClear?: () => void; underline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState(swatches[0]);
  return (
    <span className="relative">
      <button
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        className="grid h-8 min-w-8 place-items-center rounded px-1.5 text-[13px] font-bold text-white hover:bg-white/15"
      >
        <span style={underline ? { borderBottom: `3px solid ${last}`, lineHeight: 1 } : { color: last }}>{label}</span>
      </button>
      {open && (
        <span className="absolute left-0 top-full z-10 mt-1 grid w-[172px] gap-2 rounded-md bg-white p-2 text-navy shadow-xl" onMouseDown={(e) => e.preventDefault()}>
          <span className="grid grid-cols-5 gap-1.5">
            {swatches.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => { setLast(c); onPick(c); setOpen(false); }}
                className="h-6 w-6 rounded border border-line"
                style={{ background: c }}
              />
            ))}
          </span>
          <label className="flex items-center gap-2 text-[11.5px]">
            Outra cor
            <input type="color" defaultValue={last} onChange={(e) => { setLast(e.target.value); onPick(e.target.value); }} className="h-6 w-10 cursor-pointer" />
          </label>
          {onClear && <button type="button" className="rounded bg-alt py-1 text-[11.5px] font-semibold" onClick={() => { onClear(); setOpen(false); }}>Sem cor</button>}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------- links */

export function Lnk({
  k,
  href,
  className,
  children,
  onDefault,
  style,
  "aria-label": ariaLabel,
}: {
  k: string;
  href: string;
  className?: string;
  children: React.ReactNode;
  /** Ação quando o link não foi alterado (ex.: imprimir o PDF) */
  onDefault?: () => void;
  style?: React.CSSProperties;
  "aria-label"?: string;
}) {
  const { overrides, editable } = useContext(EditCtx);
  const h = (overrides[`link.${k}`] as string | undefined) ?? href;
  const size = overrides[`btn.${k}`];
  const zoom = size === "sm" ? 0.84 : size === "lg" ? 1.18 : undefined;
  const external = /^https?:/i.test(h);
  return (
    <LinkCtx.Provider value={{ k, href: h, defaultHref: href }}>
      <a
        className={className}
        href={h}
        aria-label={ariaLabel}
        style={zoom ? { ...style, zoom } : style}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={(e) => {
          if (editable) return e.preventDefault();
          if (h === href && onDefault) {
            e.preventDefault();
            onDefault();
          }
        }}
      >
        {children}
      </a>
    </LinkCtx.Provider>
  );
}

/* ------------------------------------------------------------ imagens */

type ImgOv = { src: string; x: number; y: number; zoom: number };

export function Img({ k, src, alt, className, style }: { k: string; src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  const { overrides, editable, save } = useContext(EditCtx);
  const [open, setOpen] = useState(false);
  const o = overrides[`img.${k}`] as ImgOv | undefined;
  const real = o && o.src !== "default" ? o.src : src;
  const st: React.CSSProperties = o
    ? { ...style, objectPosition: `${o.x}% ${o.y}%`, transform: o.zoom !== 1 ? `scale(${o.zoom})` : undefined, transformOrigin: `${o.x}% ${o.y}%` }
    : (style ?? {});
  return (
    <>
      <img
        src={real}
        alt={alt}
        className={`${className ?? ""} ${editable ? "ed-img" : ""} ${editable && o ? "changed" : ""}`}
        style={st}
        title={editable ? "Clique para trocar ou ajustar a imagem" : undefined}
        onClick={
          editable
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(true);
              }
            : undefined
        }
      />
      {open && (
        <ImagePicker
          original={src}
          current={o ?? { src: "default", x: 50, y: 50, zoom: 1 }}
          onClose={() => setOpen(false)}
          onSave={async (v) => {
            setOpen(false);
            await save(`img.${k}`, v);
          }}
        />
      )}
    </>
  );
}

const BUILTIN = [
  { url: "/brand/lockup.webp", name: "Logo horizontal" },
  { url: "/brand/logo-vertical.webp", name: "Logo vertical" },
  { url: "/demo/sao-judas-tadeu-ii.jpg", name: "Gleba São Judas Tadeu II" },
];

export function resizeImage(file: File, max = 2400): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      // JPEG para fotos; WEBP mantém a transparência de logos
      const type = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
      res({ dataUrl: c.toDataURL(type, 0.86), width: c.width, height: c.height });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

export async function uploadImage(file: File) {
  const { dataUrl, width, height } = await resizeImage(file);
  const r = await fetch("/api/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, dataUrl, width, height }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Falha no envio");
  return d as { id: string; url: string };
}

function ImagePicker({ original, current, onClose, onSave }: { original: string; current: ImgOv; onClose: () => void; onSave: (v: ImgOv | null) => void }) {
  const [list, setList] = useState<{ url: string; name: string }[]>([]);
  const [sel, setSel] = useState<ImgOv>(current);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const shown = sel.src === "default" ? original : sel.src;

  const load = useCallback(() => {
    fetch("/api/assets").then((r) => r.json()).then((d) => Array.isArray(d) && setList(d)).catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function upload(f: File) {
    setErr("");
    setBusy(true);
    try {
      const a = await uploadImage(f);
      setSel({ src: a.url, x: 50, y: 50, zoom: 1 });
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const Thumb = ({ url, name, value }: { url: string; name: string; value: string }) => (
    <button
      type="button"
      onClick={() => setSel({ src: value, x: 50, y: 50, zoom: 1 })}
      className={`group overflow-hidden rounded border-2 bg-alt text-left transition ${sel.src === value ? "border-gold" : "border-transparent hover:border-gold-line"}`}
    >
      <img src={url} alt="" className="h-20 w-full object-contain" style={{ background: "repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0/14px 14px" }} />
      <span className="block truncate px-1.5 py-1 text-[11px] text-muted">{name}</span>
    </button>
  );

  return createPortal(
    <div className="fixed inset-0 z-[3000] flex items-start justify-center overflow-auto bg-navy/60 p-4 py-10 font-sans" onMouseDown={onClose}>
      <div className="w-full max-w-4xl rounded-md border-t-[3px] border-gold bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <div className="eyebrow mb-1">Imagem da proposta</div>
            <h2 className="h-display text-2xl">Trocar ou ajustar</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-alt" aria-label="Fechar">✕</button>
        </div>
        <div className="grid gap-6 p-6 md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-navy">Banco de imagens</span>
              <label className="btn-ghost cursor-pointer py-1.5 text-[12.5px]">
                {busy ? "Enviando…" : "↑ Enviar nova"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
            </div>
            {err && <p className="mb-2 text-[12.5px] font-semibold text-rose-700">{err}</p>}
            <div className="grid max-h-[340px] grid-cols-3 gap-2 overflow-auto pr-1">
              <Thumb url={original} name="Original da proposta" value="default" />
              {list.map((a) => <Thumb key={a.url} url={a.url} name={a.name} value={a.url} />)}
              {BUILTIN.filter((b) => b.url !== original).map((b) => <Thumb key={b.url} url={b.url} name={b.name} value={b.url} />)}
            </div>
          </div>
          <div>
            <span className="mb-2 block text-[13px] font-semibold text-navy">Ajuste</span>
            <div className="relative h-48 overflow-hidden rounded border border-line" style={{ background: "repeating-conic-gradient(#eee 0 25%, #fff 0 50%) 0 0/14px 14px" }}>
              <img
                src={shown}
                alt=""
                className="h-full w-full object-cover"
                style={{ objectPosition: `${sel.x}% ${sel.y}%`, transform: `scale(${sel.zoom})`, transformOrigin: `${sel.x}% ${sel.y}%` }}
              />
            </div>
            {[
              ["Horizontal", "x", 0, 100, 1],
              ["Vertical", "y", 0, 100, 1],
              ["Zoom", "zoom", 0.5, 2.5, 0.01],
            ].map(([label, key, min, max, step]) => (
              <label key={key as string} className="mt-3 grid grid-cols-[80px_1fr_44px] items-center gap-2 text-[12.5px] text-ink">
                {label}
                <input
                  type="range"
                  min={min as number}
                  max={max as number}
                  step={step as number}
                  value={sel[key as "x" | "y" | "zoom"]}
                  onChange={(e) => setSel((s) => ({ ...s, [key as string]: Number(e.target.value) }))}
                  className="accent-[#A2782F]"
                />
                <span className="tabular text-right text-muted">{key === "zoom" ? `${Math.round(sel.zoom * 100)}%` : `${sel[key as "x" | "y"]}%`}</span>
              </label>
            ))}
            <p className="mt-3 text-[11.5px] text-muted">Horizontal e vertical escolhem que parte da foto aparece quando ela é cortada. O zoom aproxima ou afasta.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line bg-alt px-6 py-3.5">
          <button className="btn-ghost mr-auto" onClick={() => onSave(null)}>↺ Voltar à original</button>
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-gold" onClick={() => onSave(sel.src === "default" && sel.x === 50 && sel.y === 50 && sel.zoom === 1 ? null : sel)}>Aplicar</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------ seções */

type BlockOv = { bg?: string; hidden?: boolean };

export function Sec({
  k,
  as: Tag = "section",
  className,
  id,
  style,
  children,
}: {
  k: string;
  as?: "section" | "div" | "article" | "header" | "footer";
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { overrides, editable, save } = useContext(EditCtx);
  const [open, setOpen] = useState(false);
  const o = (overrides[`block.${k}`] as BlockOv | undefined) ?? {};
  if (o.hidden && !editable) return null;
  const st: React.CSSProperties = { ...style, ...(o.bg ? { background: o.bg } : {}) };

  function set(v: BlockOv) {
    const next = { ...o, ...v };
    save(`block.${k}`, !next.bg && !next.hidden ? null : next);
  }

  return (
    <Tag id={id} className={`${className ?? ""} ${o.bg ? "has-bg" : ""} ${editable ? "sec-ed" : ""} ${o.hidden ? "sec-hidden" : ""}`} style={st}>
      {editable && (
        <span className="sec-tools" onClick={(e) => e.stopPropagation()}>
          {o.hidden && <span className="sec-flag">Seção oculta para a família</span>}
          <button type="button" className="sec-btn" onClick={() => setOpen((v) => !v)}>⚙ Seção</button>
          {open && (
            <span className="sec-pop">
              <label>
                Cor de fundo
                <input type="color" value={o.bg ?? "#ffffff"} onChange={(e) => set({ bg: e.target.value })} />
              </label>
              <span className="sec-sw">
                {["#F8F9FB", "#F7F2E7", "#FAF6EE", "#EEF2F6", "#122A45"].map((c) => (
                  <button key={c} type="button" style={{ background: c }} title={c} onClick={() => set({ bg: c })} />
                ))}
              </span>
              {o.bg && <button type="button" className="sec-link" onClick={() => set({ bg: undefined })}>Tirar cor de fundo</button>}
              <button type="button" className="sec-link" onClick={() => set({ hidden: !o.hidden })}>{o.hidden ? "Mostrar seção" : "Ocultar seção"}</button>
            </span>
          )}
        </span>
      )}
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------- cores do tema */

function hex(c: string) {
  const h = c.replace("#", "");
  const n = h.length === 3 ? h.split("").map((x) => x + x).join("") : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
}
function mix(a: string, b: string, t: number) {
  const [x, y] = [hex(a), hex(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

export const THEME_DEFAULTS = { navy: "#122A45", gold: "#C1943D", bg: "#FFFFFF", alt: "#F8F9FB", fg: "#2B3A4A" };
const THEME_LABELS: Record<keyof typeof THEME_DEFAULTS, string> = {
  navy: "Cor principal (azul)",
  gold: "Cor de destaque (dourado)",
  bg: "Fundo da página",
  alt: "Fundo das faixas",
  fg: "Cor do texto",
};

export function themeVars(o: Overrides): React.CSSProperties {
  const t = (k: keyof typeof THEME_DEFAULTS) => (o[`theme.${k}`] as string | undefined) ?? THEME_DEFAULTS[k];
  const v: Record<string, string> = {};
  if (o["theme.navy"]) Object.assign(v, { "--navy": t("navy"), "--sky-strong": t("navy") });
  if (o["theme.gold"]) {
    const g = t("gold");
    Object.assign(v, { "--gold": g, "--gold-deep": mix(g, "#000000", 0.16), "--gold-ink": mix(g, "#000000", 0.26), "--gold-soft": mix(g, "#ffffff", 0.88), "--gold-line": mix(g, "#ffffff", 0.7), "--sky": mix(g, "#ffffff", 0.93) });
  }
  if (o["theme.bg"]) Object.assign(v, { "--bg": t("bg"), "--surface": mix(t("bg"), t("navy"), 0.035) });
  if (o["theme.alt"]) v["--alt"] = t("alt");
  if (o["theme.fg"]) v["--fg"] = t("fg");
  return v as React.CSSProperties;
}

export function ThemeRoot({ className, children }: { className: string; children: React.ReactNode }) {
  const { overrides, editable, save, preview } = useContext(EditCtx);
  const [open, setOpen] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const custom = Object.keys(overrides).some((k) => k.startsWith("theme."));

  function change(k: string, v: string) {
    preview(`theme.${k}`, v);
    clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(() => save(`theme.${k}`, v), 500);
  }

  return (
    <div className={className} style={themeVars(overrides)}>
      {children}
      {editable && (
        <div className="fixed bottom-5 right-5 z-[1500] font-sans">
          {open && (
            <div className="mb-2 w-64 rounded-md border-t-[3px] border-gold bg-white p-4 shadow-2xl">
              <div className="eyebrow mb-3">Cores da proposta</div>
              <div className="grid gap-2.5">
                {(Object.keys(THEME_DEFAULTS) as (keyof typeof THEME_DEFAULTS)[]).map((k) => (
                  <label key={k} className="flex items-center justify-between gap-3 text-[13px] text-ink">
                    {THEME_LABELS[k]}
                    <input
                      type="color"
                      value={(overrides[`theme.${k}`] as string | undefined) ?? THEME_DEFAULTS[k]}
                      onChange={(e) => change(k, e.target.value)}
                      className="h-7 w-11 cursor-pointer rounded border border-line"
                    />
                  </label>
                ))}
              </div>
              {custom && (
                <button
                  className="btn-ghost mt-3 w-full py-1.5 text-[12.5px]"
                  onClick={() => (Object.keys(THEME_DEFAULTS) as string[]).forEach((k) => overrides[`theme.${k}`] !== undefined && save(`theme.${k}`, null))}
                >
                  ↺ Voltar às cores da JBL
                </button>
              )}
            </div>
          )}
          <button onClick={() => setOpen((v) => !v)} className="btn-navy ml-auto flex shadow-xl">
            🎨 Cores da proposta
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- provider */

export function EditProvider({
  overrides: initial,
  editable,
  onSave,
  children,
}: {
  overrides: Overrides;
  editable: boolean;
  onSave?: (k: string, v: unknown) => Promise<void>;
  children: React.ReactNode;
}) {
  const [overrides, setOverrides] = useState(initial);
  const [toast, setToast] = useState("");

  useEffect(() => setOverrides(initial), [initial]);

  const preview = useCallback((k: string, v: unknown) => {
    setOverrides((o) => {
      const n = { ...o };
      if (v === null) delete n[k];
      else n[k] = v;
      return n;
    });
  }, []);

  const save = useCallback(
    async (k: string, v: unknown) => {
      preview(k, v);
      try {
        await onSave?.(k, v);
        setToast(v === null ? "Voltou ao original" : "Salvo");
      } catch {
        setToast("Não foi possível salvar");
      }
      setTimeout(() => setToast(""), 1600);
    },
    [onSave, preview],
  );

  return (
    <EditCtx.Provider value={{ overrides, editable, save, preview }}>
      {children}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[2500] -translate-x-1/2 rounded bg-navy px-4 py-2 font-sans text-sm font-semibold text-white shadow-xl">
          ✓ {toast}
        </div>
      )}
    </EditCtx.Provider>
  );
}
