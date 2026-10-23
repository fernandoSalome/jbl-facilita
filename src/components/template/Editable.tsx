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
 *   estilo.<chave>  negrito, itálico, cor e tamanho de um número da planilha (o número não muda)
 * Na página pública nada disso aparece: só o resultado.
 */

type Ctx = {
  /** Valores em uso: template (base) + alterações desta proposta */
  overrides: Overrides;
  /** Só as alterações desta proposta (o que aparece marcado como "alterado à mão") */
  own: Overrides;
  editable: boolean;
  save: (k: string, v: unknown) => Promise<void>;
  /** Altera só na tela (sem salvar). Usado enquanto arrasta o seletor de cor. */
  preview: (k: string, v: unknown) => void;
};

const EditCtx = createContext<Ctx>({ overrides: {}, own: {}, editable: false, save: async () => {}, preview: () => {} });
const LinkCtx = createContext<{ k: string; href: string; defaultHref: string } | null>(null);

export const useEdit = () => useContext(EditCtx);

function plainToHtml(t: string) {
  return escapeHtml(t).replace(/\n/g, "<br>");
}

/** Espaço comum no lugar do espaço especial (o "R$ " dos valores usa  ) */
const norm = (s: string) => s.replace(/&nbsp;| /g, " ").trim();

/** Troca {{nome}} pelo número da planilha. Na tela vira um bloco travado (não dá para apagar nem mudar só o número). */
function preencher(modelo: string, vars: Record<string, string>) {
  return modelo.replace(/\{\{(\w+)\}\}/g, (_, n: string) =>
    n in vars ? `<span class="num-var" contenteditable="false" data-var="${n}">${escapeHtml(vars[n])}</span>` : "",
  );
}

/**
 * Lê o texto editado de volta, com os números como {{nome}} (assim continuam ligados à planilha).
 * A formatação aplicada no número (negrito, cor...) fica em volta do {{nome}}.
 */
function lerModelo(el: HTMLElement) {
  const c = el.cloneNode(true) as HTMLElement;
  c.querySelectorAll<HTMLElement>("[data-var]").forEach((x) => {
    const marca = `{{${x.dataset.var}}}`;
    const st = x.getAttribute("style");
    if (st) {
      const w = document.createElement("span");
      w.setAttribute("style", st);
      w.textContent = marca;
      return x.replaceWith(w);
    }
    const textos: Text[] = [];
    const w = document.createTreeWalker(x, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) textos.push(w.currentNode as Text);
    if (!textos.length) return x.replaceWith(document.createTextNode(marca));
    textos.forEach((t, i) => (i === 0 ? (t.data = marca) : t.remove()));
    x.replaceWith(...Array.from(x.childNodes));
  });
  return c;
}

/** Seleciona do caractere `ini` ao `fim` (contando o texto visível do elemento) */
function selecionarTrecho(el: HTMLElement, ini: number, fim: number) {
  const r = document.createRange();
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let pos = 0;
  let achouIni = false;
  while (w.nextNode()) {
    const t = w.currentNode as Text;
    const n = t.data.length;
    if (!achouIni && ini <= pos + n) {
      r.setStart(t, ini - pos);
      achouIni = true;
    }
    if (achouIni && fim <= pos + n) {
      r.setEnd(t, fim - pos);
      const s = window.getSelection();
      s?.removeAllRanges();
      s?.addRange(r);
      return;
    }
    pos += n;
  }
}

/** A alteração atinge um número da planilha dentro do texto? */
function tocaNumero(el: HTMLElement, r: AbstractRange) {
  const alvo = document.createRange();
  try {
    alvo.setStart(r.startContainer, r.startOffset);
    alvo.setEnd(r.endContainer, r.endOffset);
  } catch {
    return false;
  }
  return Array.from(el.querySelectorAll("[data-var]")).some((n) => {
    const num = document.createRange();
    num.selectNode(n);
    return alvo.compareBoundaryPoints(Range.START_TO_END, num) > 0 && alvo.compareBoundaryPoints(Range.END_TO_START, num) < 0;
  });
}

function valueToHtml(v: unknown, fallback: string) {
  if (typeof v !== "string") return plainToHtml(fallback);
  return v.startsWith(HTML_PREFIX) ? sanitizeHtml(v.slice(HTML_PREFIX.length)) : plainToHtml(v);
}

/* ------------------------------------------------------------------ texto */

export function E({
  k,
  children,
  multiline,
  html: isHtml,
  fixo,
  vars,
  limpar,
}: {
  k: string;
  children: string;
  label?: string;
  multiline?: boolean;
  html?: boolean;
  fixo?: boolean;
  vars?: Record<string, string>;
  /**
   * Ajuste no texto salvo (de versões antigas) antes de mostrar: tirar o emoji do começo,
   * trocar "a definir" pelo número da planilha... Recebe o texto e se ele é HTML.
   */
  limpar?: (texto: string, html: boolean) => string;
}) {
  const { overrides, own, editable, save } = useContext(EditCtx);
  const link = useContext(LinkCtx);
  const changed = k in own;
  // Padrão em HTML (título com dourado e quebras, parágrafo com negrito) ou texto simples
  // (com `vars`, os números aparecem como {{nome}} e são preenchidos na hora de mostrar)
  const defaultHtml = isHtml ? sanitizeHtml(children) : plainToHtml(children);
  const bruto = overrides[k];
  const ov =
    limpar && typeof bruto === "string"
      ? bruto.startsWith(HTML_PREFIX)
        ? HTML_PREFIX + limpar(bruto.slice(HTML_PREFIX.length), true)
        : limpar(bruto, false)
      : bruto;
  // Valor em uso: alteração da proposta, senão a do template, senão o padrão
  // texto com números editado antes dos blocos travados existirem: ignora (teria número velho, congelado)
  const antigo = !!vars && typeof ov === "string" && !ov.includes("{{") && children.includes("{{");
  const modelo = k in overrides && !antigo ? valueToHtml(ov, children) : defaultHtml;
  const html = vars ? preencher(modelo, vars) : modelo;
  const ref = useRef<HTMLSpanElement>(null);
  const [editing, setEditing] = useState(false);
  const isMulti = multiline ?? (isHtml || children.length > 90);
  // Enquanto edita, o texto na tela fica parado (o salvamento automático não mexe no cursor)
  const congelado = useRef<string | null>(null);
  const inicio = useRef<unknown>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimo = useRef<string>(modelo);
  const modeloInicio = useRef<string>(modelo);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  // Na edição o conteúdo é colocado uma vez só; depois o React não toca mais nele (o cursor não pula ao salvar)
  // Elemento em edição para a barra de formatação: o span é trocado ao entrar na edição,
  // então a barra só aparece depois que o novo existe (senão clicar no texto fechava a edição)
  const [alvo, setAlvo] = useState<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    if (editing && ref.current && congelado.current !== null) ref.current.innerHTML = congelado.current;
    setAlvo(editing ? ref.current : null);
  }, [editing]);

  // Os números da planilha dentro do texto não podem ser apagados nem trocados (o resto do texto sim)
  useEffect(() => {
    const el = ref.current;
    if (!editing || !el || !vars) return;
    const antes = (e: InputEvent) => {
      if (e.inputType.startsWith("format") || e.inputType.startsWith("history")) return;
      const s = window.getSelection();
      const alvos: AbstractRange[] = e.getTargetRanges?.().length ? e.getTargetRanges() : s && s.rangeCount ? [s.getRangeAt(0)] : [];
      if (alvos.some((r) => tocaNumero(el, r))) e.preventDefault();
    };
    el.addEventListener("beforeinput", antes);
    return () => el.removeEventListener("beforeinput", antes);
  }, [editing, vars]);

  // Número que vem da planilha: sempre o calculado (muda em "Editar dados da planilha"). Só o visual pode mudar.
  if (fixo) {
    return <Fixo k={k}>{isHtml ? <span dangerouslySetInnerHTML={{ __html: defaultHtml }} /> : children}</Fixo>;
  }

  if (!editable) {
    if (!vars && !(k in overrides) && !isHtml && !children.includes("\n")) return <>{children}</>;
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  }

  /** Grava o que está escrito agora (sem sair da edição) */
  function gravar() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!ref.current) return;
    const el = vars ? lerModelo(ref.current) : ref.current;
    const clean = sanitizeHtml(el.innerHTML).replace(/(<br>)+$/, "").trim();
    if (norm(clean) === norm(sanitizeHtml(ultimo.current))) return; // nada mudou desde a última gravação
    ultimo.current = clean;
    if (!clean || norm(clean) === norm(defaultHtml)) return void ((k in own || changed) && save(k, null));
    const hasTags = /<(?!br>)[a-z]/i.test(clean);
    save(k, hasTags || clean.includes("<br>") ? HTML_PREFIX + clean : (vars ? el.textContent ?? "" : el.innerText).trim());
  }

  function commit() {
    gravar();
    congelado.current = null;
    setEditing(false);
  }

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    // Esc desfaz também o que já tinha sido salvo sozinho durante a edição
    if (norm(sanitizeHtml(ultimo.current)) !== norm(sanitizeHtml(modeloInicio.current))) save(k, inicio.current === undefined ? null : inicio.current);
    if (ref.current) ref.current.innerHTML = congelado.current ?? html;
    congelado.current = null;
    setEditing(false);
  }


  return (
    <>
      <span
        key={editing ? `${k}:editando` : `${k}:${html}`}
        ref={ref}
        data-k={k}
        className={`ed ${changed ? "changed" : ""} ${editing ? "editing" : ""}`}
        title={editing ? undefined : changed ? "Alterado à mão. Clique para editar" : "Clique para editar"}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={editing}
        {...(editing ? {} : { dangerouslySetInnerHTML: { __html: html } })}
        onInput={() => {
          // salva sozinho 0,8 s depois de parar de digitar
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(gravar, 800);
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (editing) {
            // clicar num número da planilha seleciona ele inteiro (para aplicar negrito, cor...)
            const num = (e.target as HTMLElement).closest?.("[data-var]");
            if (num && ref.current?.contains(num)) {
              const r = document.createRange();
              r.selectNode(num);
              const s = window.getSelection();
              s?.removeAllRanges();
              s?.addRange(r);
            }
            return;
          }
          // trecho já selecionado arrastando o mouse antes de abrir: continua selecionado na edição
          const s0 = window.getSelection();
          let trecho: [number, number] | null = null;
          if (s0 && s0.rangeCount && !s0.isCollapsed && e.currentTarget.contains(s0.anchorNode)) {
            const r0 = s0.getRangeAt(0);
            const antes = document.createRange();
            antes.selectNodeContents(e.currentTarget);
            antes.setEnd(r0.startContainer, r0.startOffset);
            const ini = antes.toString().length;
            trecho = [ini, ini + r0.toString().length];
          }
          congelado.current = html;
          ultimo.current = modelo;
          modeloInicio.current = modelo;
          inicio.current = own[k];
          setEditing(true);
          // o cursor cai onde a pessoa clicou (dá para clicar numa palavra e já escrever)
          const { clientX: x, clientY: y } = e;
          requestAnimationFrame(() => {
            const el = ref.current;
            if (!el) return;
            el.focus();
            if (trecho) return selecionarTrecho(el, trecho[0], trecho[1]);
            const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null };
            let r: Range | null = document.caretRangeFromPoint?.(x, y) ?? null;
            if (!r && doc.caretPositionFromPoint) {
              const pos = doc.caretPositionFromPoint(x, y);
              if (pos) {
                r = document.createRange();
                r.setStart(pos.offsetNode, pos.offset);
              }
            }
            if (!r || !el.contains(r.startContainer)) {
              r = document.createRange();
              r.selectNodeContents(el);
              r.collapse(false);
            }
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
          if (e.key === "Enter") {
            e.preventDefault();
            // Enter quebra a linha em qualquer texto; Ctrl/Cmd+Enter termina (ou clicar fora)
            if (e.ctrlKey || e.metaKey) commit();
            else document.execCommand("insertLineBreak");
          }
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
      />
      {editing && alvo && (
        <Toolbar
          target={alvo}
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

/** Botão da barra de formatação (fora do Toolbar para não ser recriado a cada render) */
function B({ title, onClick, children, active }: { title: string; onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
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
}
const Sep = () => <span className="mx-0.5 h-5 w-px bg-white/20" />;

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
      const top = Math.round(below ? r.bottom + 10 : Math.max(8, r.top - h - 10));
      const left = Math.round(Math.min(Math.max(8, r.left), window.innerWidth - w - 8));
      // só redesenha quando a posição muda (senão os botões "fogem" do clique)
      setPos((p) => (p.top === top && p.left === left ? p : { top, left }));
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

  /** Formatação também nos números da planilha: liberados só durante o comando (o texto deles não muda) */
  function comNumeros(fn: () => void) {
    const nums = target.querySelectorAll<HTMLElement>("[data-var]");
    // seleção que pega só parte de um número passa a pegar o número inteiro (senão ele seria partido em dois)
    const s = window.getSelection();
    const selecionados = new Set<Element>();
    if (s?.rangeCount && !s.getRangeAt(0).collapsed) {
      const r = s.getRangeAt(0).cloneRange();
      nums.forEach((n) => {
        if (!r.intersectsNode(n)) return;
        selecionados.add(n);
        const nr = document.createRange();
        nr.selectNode(n);
        if (r.compareBoundaryPoints(Range.START_TO_START, nr) > 0) r.setStartBefore(n);
        if (r.compareBoundaryPoints(Range.END_TO_END, nr) < 0) r.setEndAfter(n);
      });
      s.removeAllRanges();
      s.addRange(r);
    }
    nums.forEach((n) => (n.contentEditable = "true"));
    try {
      fn();
    } finally {
      // o navegador põe o estilo no próprio número: passa para um span em volta (é o que fica salvo com o {{nome}})
      const envolvidos: Element[] = [];
      target.querySelectorAll<HTMLElement>("[data-var]").forEach((n) => {
        n.contentEditable = "false";
        const st = n.getAttribute("style");
        if (!st) return;
        n.removeAttribute("style");
        const w = document.createElement("span");
        w.setAttribute("style", st);
        n.replaceWith(w);
        w.appendChild(n);
        if (selecionados.has(n)) envolvidos.push(w);
      });
      // a seleção continua cobrindo os números (para o próximo comando, ex.: negrito e depois cor)
      if (envolvidos.length && s) {
        const r = s.rangeCount && !s.getRangeAt(0).collapsed ? s.getRangeAt(0).cloneRange() : document.createRange();
        if (r.collapsed) {
          r.setStartBefore(envolvidos[0]);
          r.setEndAfter(envolvidos[envolvidos.length - 1]);
        }
        envolvidos.forEach((w) => {
          const nr = document.createRange();
          nr.selectNode(w);
          if (r.compareBoundaryPoints(Range.START_TO_START, nr) > 0) r.setStartBefore(w);
          if (r.compareBoundaryPoints(Range.END_TO_END, nr) < 0) r.setEndAfter(w);
        });
        s.removeAllRanges();
        s.addRange(r);
        range.current = r.cloneRange();
      }
    }
  }

  function exec(cmd: string, val?: string) {
    restore();
    comNumeros(() => {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand(cmd, false, val);
    });
  }

  function fontSize(px: number) {
    restore();
    comNumeros(() => {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("fontSize", false, "7");
      const novos: HTMLElement[] = [];
      target.querySelectorAll('font[size="7"], span[style*="xxx-large"]').forEach((f) => {
        const s = document.createElement("span");
        s.style.fontSize = `${px}px`;
        s.innerHTML = f.innerHTML;
        f.replaceWith(s);
        novos.push(s);
      });
      document.execCommand("styleWithCSS", false, "true");
      // o trecho continua selecionado: dá para aumentar/diminuir de novo ou aplicar outra formatação
      if (novos.length) {
        const r = document.createRange();
        r.setStart(novos[0], 0);
        const ult = novos[novos.length - 1];
        r.setEnd(ult, ult.childNodes.length);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
        range.current = r.cloneRange();
      }
    });
  }

  function currentSize() {
    const node = range.current?.startContainer;
    const el = node?.nodeType === 3 ? node.parentElement : (node as HTMLElement | undefined);
    return Math.round(parseFloat(getComputedStyle(el ?? target).fontSize) || 16);
  }


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
        title="O texto salva sozinho enquanto você digita. Clique para terminar a edição."
      >
        ✓ Pronto
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

/* ------------------------------------- números da planilha (só o visual) */

export type Estilo = { n?: "b" | "n"; i?: boolean; u?: boolean; cor?: string; tam?: number };

export function estiloCss(e: Estilo | undefined): React.CSSProperties | undefined {
  if (!e) return undefined;
  const st: React.CSSProperties = {};
  if (e.n) st.fontWeight = e.n === "b" ? 700 : 400;
  if (e.i !== undefined) st.fontStyle = e.i ? "italic" : "normal";
  if (e.u) st.textDecoration = "underline";
  if (e.cor) st.color = e.cor;
  if (e.tam) st.fontSize = `${e.tam}em`;
  return st;
}

/**
 * Valor que vem da planilha (estudo de viabilidade): o texto é sempre o calculado e
 * não pode ser alterado. Na edição, clicar nele muda só o visual (chave "estilo.<k>").
 */
export function Fixo({ k, children }: { k: string; children: React.ReactNode }) {
  const { overrides, own, editable, save } = useContext(EditCtx);
  const key = `estilo.${k}`;
  const e = overrides[key] as Estilo | undefined;
  const st = estiloCss(e);
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  // o estilo fica num elemento de dentro: o .fixo herda a fonte e a cor do lugar onde está
  const conteudo = st ? <span className="fixo-st" style={st}>{children}</span> : children;
  if (!editable) return <>{conteudo}</>;
  return (
    <>
      <span
        ref={ref}
        data-k={key}
        className={`fixo ${key in own ? "changed" : ""} ${open ? "editing" : ""}`}
        title="Vem da planilha: o valor não muda aqui. Clique para mudar negrito, itálico, cor ou tamanho."
        onClick={(ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          setOpen(true);
        }}
      >
        {conteudo}
      </span>
      {open && ref.current && <EstiloBar target={ref.current} valor={e ?? {}} proprio={key in own} onChange={(v) => save(key, v)} onClose={() => setOpen(false)} />}
    </>
  );
}

function EstiloBar({ target, valor, proprio, onChange, onClose }: { target: HTMLElement; valor: Estilo; proprio: boolean; onChange: (v: Estilo | null) => void; onClose: () => void }) {
  const bar = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: -999, left: 0 });
  // negrito/itálico de origem do lugar onde o número está (título, tabela...)
  const [natural] = useState(() => {
    const cs = getComputedStyle(target);
    return { b: (parseInt(cs.fontWeight) || 400) >= 600, i: cs.fontStyle === "italic" };
  });
  const negrito = valor.n ? valor.n === "b" : natural.b;
  const italico = valor.i ?? natural.i;
  const tam = valor.tam ?? 1;

  useLayoutEffect(() => {
    let raf = 0;
    const place = () => {
      const r = target.getBoundingClientRect();
      const h = bar.current?.offsetHeight ?? 44;
      const w = bar.current?.offsetWidth ?? 420;
      const below = r.bottom + 10 + h < window.innerHeight;
      const top = Math.round(below ? r.bottom + 10 : Math.max(8, r.top - h - 10));
      const left = Math.round(Math.min(Math.max(8, r.left), window.innerWidth - w - 8));
      setPos((p) => (p.top === top && p.left === left ? p : { top, left }));
      raf = requestAnimationFrame(place);
    };
    place();
    return () => cancelAnimationFrame(raf);
  }, [target]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!target.contains(t) && !bar.current?.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [target, onClose]);

  function set(p: Partial<Estilo>) {
    const n: Estilo = { ...valor, ...p };
    (Object.keys(n) as (keyof Estilo)[]).forEach((x) => n[x] === undefined && delete n[x]);
    if (n.n && (n.n === "b") === natural.b) delete n.n;
    if (n.i !== undefined && n.i === natural.i) delete n.i;
    onChange(Object.keys(n).length ? n : null);
  }
  const passo = (d: number) => {
    const t = Math.round(Math.min(3, Math.max(0.6, tam + d)) * 10) / 10;
    set({ tam: t === 1 ? undefined : t });
  };

  return createPortal(
    <div
      ref={bar}
      data-ed-toolbar
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[2000] flex max-w-[calc(100vw-16px)] flex-wrap items-center gap-0.5 rounded-md bg-navy p-1 font-sans text-white shadow-[0_14px_34px_-10px_rgba(0,0,0,.5)] ring-1 ring-gold/40"
    >
      <span className="px-2 text-[11px] leading-tight text-white/60">Valor da planilha<br />só o visual muda</span>
      <Sep />
      <B title="Negrito" active={negrito} onClick={() => set({ n: negrito ? "n" : "b" })}><b>B</b></B>
      <B title="Itálico" active={italico} onClick={() => set({ i: !italico })}><i className="font-display">I</i></B>
      <B title="Sublinhado" active={!!valor.u} onClick={() => set({ u: valor.u ? undefined : true })}><u>U</u></B>
      <Sep />
      <B title="Diminuir" onClick={() => passo(-0.1)}>A−</B>
      <span className="w-10 text-center text-[11.5px] tabular-nums text-white/70">{Math.round(tam * 100)}%</span>
      <B title="Aumentar" onClick={() => passo(0.1)}>A+</B>
      <Sep />
      <ColorBtn title="Cor da letra" label="A" swatches={SWATCHES} onPick={(c) => set({ cor: c })} onClear={() => set({ cor: undefined })} underline />
      <Sep />
      {proprio && <B title="Voltar ao visual original" onClick={() => { onChange(null); onClose(); }}>↺</B>}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClose}
        className="h-8 rounded bg-gold px-3 text-[12.5px] font-bold text-navy hover:brightness-110"
      >
        ✓ Pronto
      </button>
    </div>,
    document.body,
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
  const { overrides, own, editable, save } = useContext(EditCtx);
  const [open, setOpen] = useState(false);
  const o = overrides[`img.${k}`] as ImgOv | undefined;
  const mine = `img.${k}` in own;
  const real = o && o.src !== "default" ? o.src : src;
  const st: React.CSSProperties = o
    ? { ...style, objectPosition: `${o.x}% ${o.y}%`, transform: o.zoom !== 1 ? `scale(${o.zoom})` : undefined, transformOrigin: `${o.x}% ${o.y}%` }
    : (style ?? {});
  return (
    <>
      <img
        src={real}
        alt={alt}
        className={`${className ?? ""} ${editable ? "ed-img" : ""} ${editable && mine ? "changed" : ""}`}
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
  base,
  editable,
  onSave,
  children,
}: {
  overrides: Overrides;
  /** Valores vindos do template (aparecem, mas não contam como alterados à mão) */
  base?: Overrides;
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
    <EditCtx.Provider value={{ overrides: base ? { ...base, ...overrides } : overrides, own: overrides, editable, save, preview }}>
      {children}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[2500] -translate-x-1/2 rounded bg-navy px-4 py-2 font-sans text-sm font-semibold text-white shadow-xl">
          ✓ {toast}
        </div>
      )}
    </EditCtx.Provider>
  );
}
