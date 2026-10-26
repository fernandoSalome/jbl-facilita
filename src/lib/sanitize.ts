/**
 * Limpeza do texto formatado salvo pelo editor da proposta. Funciona igual no
 * servidor e no navegador (sem DOM): só passam negrito, itálico, sublinhado,
 * grifo, quebra de linha e <span style> com cor, fundo e tamanho da fonte.
 * Todo o resto (scripts, links, atributos, eventos) é removido.
 */

const TAGS = new Set(["b", "strong", "i", "em", "u", "s", "mark", "span", "br", "sup", "sub", "small", "font"]);
const ID = /^[a-z0-9_-]{1,40}$/i;
const QTD_KEYS = new Set(["logradouros", "rede", "ligacoes", "eletrica", "guias", "calcadas", "arvores", "reservatorio", "casaQuimica"]);
const short = (v: unknown, max = 300) => (typeof v === "string" ? v.replace(/[<>]/g, "").slice(0, max) : "");

function cleanQtd(q: unknown) {
  const o = q as { kind?: unknown; key?: unknown; text?: unknown; label?: unknown; unit?: unknown };
  if (!o || typeof o !== "object") return undefined;
  if (o.kind === "calc" && QTD_KEYS.has(o.key as string)) return { kind: "calc", key: o.key };
  if (o.kind === "fixa") return { kind: "fixa", text: short(o.text, 60) };
  if (o.kind === "projetar") return { kind: "projetar", label: short(o.label, 40) || undefined, unit: short(o.unit, 12) || undefined };
  return undefined;
}
const STYLE_PROPS = new Set(["color", "background-color", "font-size", "font-weight", "font-style", "text-decoration", "text-decoration-line"]);
const SAFE_VALUE = /^[#a-zA-Z0-9\s.,()%-]+$/;
/** Classes visuais do template que podem ficar no texto formatado */
const CLASSES = new Set(["blank", "d"]);

/** Prefixo que marca um valor salvo como HTML formatado */
export const HTML_PREFIX = "html:";

function cleanStyle(style: string) {
  return style
    .split(";")
    .map((d) => {
      const i = d.indexOf(":");
      if (i < 0) return "";
      const prop = d.slice(0, i).trim().toLowerCase();
      const val = d.slice(i + 1).trim();
      if (!STYLE_PROPS.has(prop) || !SAFE_VALUE.test(val) || /url|expression|var\(/i.test(val)) return "";
      return `${prop}:${val}`;
    })
    .filter(Boolean)
    .join(";");
}

function attr(attrs: string, name: string) {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : "";
}

function escapeText(t: string) {
  // mantém entidades válidas (&amp; &nbsp; &#123;) e escapa o resto
  return t.replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function sanitizeHtml(input: string): string {
  // Quebras de parágrafo do contentEditable viram <br>
  const html = input
    .replace(/<(div|p)(\s[^>]*)?>/gi, "<br>")
    .replace(/<\/(div|p)>/gi, "")
    .replace(/^(<br>)+/, "");
  let out = "";
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^<>]*)>|<!--[\s\S]*?-->|([^<]+)|</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[4] !== undefined) {
      out += escapeText(m[4]);
      continue;
    }
    if (m[2] === undefined) {
      if (m[0] === "<") out += "&lt;";
      continue; // comentário
    }
    const tag = m[2].toLowerCase();
    if (!TAGS.has(tag)) continue;
    if (tag === "br") {
      out += attr(m[3], "class") === "d" ? '<br class="d">' : "<br>";
      continue;
    }
    const outTag = tag === "font" ? "span" : tag;
    if (m[1]) {
      out += `</${outTag}>`;
      continue;
    }
    let style = cleanStyle(attr(m[3], "style"));
    if (tag === "font") {
      const color = attr(m[3], "color");
      if (color && SAFE_VALUE.test(color)) style = [style, `color:${color}`].filter(Boolean).join(";");
    }
    const cls = attr(m[3], "class").split(/\s+/).filter((c) => CLASSES.has(c)).join(" ");
    out += `<${outTag}${cls ? ` class="${cls}"` : ""}${style ? ` style="${style.replace(/"/g, "")}"` : ""}>`;
  }
  return out;
}

export function escapeHtml(t: string) {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const COLOR = /^#[0-9a-fA-F]{3,8}$/;
const LINK = /^(https?:\/\/|mailto:|tel:|#)[^\s<>"']*$/i;
const IMG_SRC = /^(\/api\/assets\/[a-z0-9]+|\/brand\/[\w.-]+|\/demo\/[\w.-]+)$/i;

/**
 * Valida um valor de "overrides" pelo prefixo da chave antes de gravar.
 * Devolve undefined quando o valor não é aceito.
 */
export function cleanOverride(key: string, v: unknown): unknown {
  if (v === null) return null;
  if (key.startsWith("theme.")) return typeof v === "string" && COLOR.test(v) ? v : undefined;
  if (key.startsWith("link.")) return typeof v === "string" && LINK.test(v.trim()) ? v.trim() : undefined;
  if (key.startsWith("btn.")) return v === "sm" || v === "md" || v === "lg" ? v : undefined;
  // alinhamento de um texto e quantidade de fotos de um bloco de imagem
  if (key.startsWith("al.")) return v === "left" || v === "center" || v === "right" ? v : undefined;
  if (key.startsWith("fotos.")) return v === 1 || v === 2 ? v : undefined;
  if (key.startsWith("img.")) {
    const o = v as { src?: unknown; x?: unknown; y?: unknown; zoom?: unknown };
    if (!o || typeof o !== "object" || typeof o.src !== "string" || !(IMG_SRC.test(o.src) || o.src === "default")) return undefined;
    const n = (x: unknown, min: number, max: number, d: number) => (typeof x === "number" && isFinite(x) ? Math.min(max, Math.max(min, x)) : d);
    return { src: o.src, x: n(o.x, 0, 100, 50), y: n(o.y, 0, 100, 50), zoom: n(o.zoom, 0.3, 3, 1) };
  }
  if (key.startsWith("liq.")) return cleanQtd(v);
  // Visual de um número da planilha (o número em si nunca é gravado)
  if (key.startsWith("estilo.")) {
    const o = v as { n?: unknown; i?: unknown; u?: unknown; cor?: unknown; tam?: unknown };
    if (!o || typeof o !== "object") return undefined;
    const e: Record<string, unknown> = {};
    if (o.n === "b" || o.n === "n") e.n = o.n;
    if (typeof o.i === "boolean") e.i = o.i;
    if (o.u === true) e.u = true;
    if (typeof o.cor === "string" && COLOR.test(o.cor)) e.cor = o.cor;
    if (typeof o.tam === "number" && isFinite(o.tam) && o.tam !== 1) e.tam = Math.round(Math.min(3, Math.max(0.6, o.tam)) * 100) / 100;
    return Object.keys(e).length ? e : null;
  }
  if (/^li\.[^.]+\.emoji$/.test(key)) return typeof v === "string" && v.length <= 16 && !/[<>&]/.test(v) ? v.trim() : undefined;
  if (key.startsWith("lista.")) {
    const o = v as { added?: unknown; removed?: unknown };
    if (!o || typeof o !== "object") return undefined;
    const removed = Array.isArray(o.removed) ? o.removed.filter((x) => typeof x === "string" && ID.test(x)).slice(0, 200) : [];
    const added: unknown[] = [];
    for (const it of Array.isArray(o.added) ? o.added.slice(0, 100) : []) {
      const i = it as { id?: unknown; obra?: unknown; desc?: unknown; qtd?: unknown; texto?: unknown; emoji?: unknown };
      if (!i || typeof i.id !== "string" || !ID.test(i.id)) return undefined;
      if (key === "lista.contatos") added.push({ id: i.id });
      else if (key === "lista.benfeitorias") {
        const emoji = typeof i.emoji === "string" && i.emoji.length <= 16 && !/[<>&]/.test(i.emoji) ? i.emoji : undefined;
        added.push(emoji === undefined ? { id: i.id, texto: short(i.texto) } : { id: i.id, texto: short(i.texto), emoji });
      }
      else {
        const qtd = cleanQtd(i.qtd);
        if (!qtd) return undefined;
        added.push({ id: i.id, obra: short(i.obra), desc: short(i.desc), qtd });
      }
    }
    return { added, removed };
  }
  if (key.startsWith("block.")) {
    const o = v as { bg?: unknown; hidden?: unknown };
    if (!o || typeof o !== "object") return undefined;
    return { bg: typeof o.bg === "string" && COLOR.test(o.bg) ? o.bg : undefined, hidden: o.hidden === true };
  }
  if (typeof v !== "string" || v.length > 20000) return undefined;
  return v.startsWith(HTML_PREFIX) ? HTML_PREFIX + sanitizeHtml(v.slice(HTML_PREFIX.length)) : v;
}
