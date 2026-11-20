/**
 * Raio-x completo no link do parceiro (pedido 19/11/2026: "coloque o estudo que você fez, mais completo e com as
 * imagens"). Lê o HTML do raio-x (formato dos relatórios do padrão JBL) e devolve blocos simples: texto, listas,
 * tabelas, quadros e imagens. A página monta os blocos; o texto só passa por sanitizeHtml (negrito, itálico).
 * Função pura: não grava nada. As imagens saem em base64 para o serviço guardar.
 */
import { sanitizeHtml } from "./sanitize";

export type Bloco =
  | { t: "p"; html: string; estilo?: "nota" | "destaque" }
  | { t: "tiles"; itens: { k: string; n: string; d: string }[] }
  | { t: "cols"; cols: { titulo: string; itens: string[] }[] }
  | { t: "tabela"; cab: string[]; linhas: string[][] }
  | { t: "img"; img: string; legenda: string }
  | { t: "kv"; itens: [string, string][] }
  | { t: "lista"; ordenada: boolean; itens: string[] };

export type Relatorio = { titulo: string; lede: string; veredito: string; destaque: string; secoes: { titulo: string; blocos: Bloco[] }[] };
export type ImagemRelatorio = { mime: string; base64: string };

const MAX_HTML = 15 * 1024 * 1024;

/** Texto em linha: tira as etiquetas visuais e deixa só o que o sanitizeHtml aceita */
export const inline = (h: string) =>
  sanitizeHtml(
    h
      .replace(/<span class="(?:tag|pill)[^"]*">([\s\S]*?)<\/span>/g, "$1")
      .replace(/<\/?(?:a|code)[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
const texto = (h: string) => inline(h).replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim();
const todos = (re: RegExp, s: string) => [...s.matchAll(re)];

function tabela(h: string): Bloco {
  const cab = todos(/<th[^>]*>([\s\S]*?)<\/th>/g, h).map((m) => texto(m[1]));
  const corpo = h.slice(h.search(/<tbody|<\/thead>/) >= 0 ? h.search(/<tbody|<\/thead>/) : 0);
  const linhas = todos(/<tr>([\s\S]*?)<\/tr>/g, corpo)
    .map((r) => todos(/<td[^>]*>([\s\S]*?)<\/td>/g, r[1]).map((c) => inline(c[1])))
    .filter((l) => l.length);
  return { t: "tabela", cab, linhas };
}

/** Blocos de uma seção, na ordem em que aparecem (sem pegar duas vezes o que está dentro de outro bloco) */
function blocosDa(sec: string, imagens: ImagemRelatorio[]): Bloco[] {
  type Achado = { i: number; fim: number; b: Bloco | Bloco[] };
  const achados: Achado[] = [];
  const add = (re: RegExp, f: (m: RegExpMatchArray) => Bloco | null) => {
    for (const m of sec.matchAll(re)) {
      const b = f(m);
      if (b) achados.push({ i: m.index!, fim: m.index! + m[0].length, b });
    }
  };
  add(/<div class="tiles">((?:\s*<div class="tile">[\s\S]*?<\/div>)+)\s*<\/div>/g, (m) => ({
    t: "tiles",
    itens: todos(/<div class="tile">([\s\S]*?)<\/div>/g, m[1]).map((t) => ({
      k: texto(t[1].match(/class="k">([\s\S]*?)<\/span>/)?.[1] ?? ""),
      n: texto(t[1].match(/class="n">([\s\S]*?)<\/span>/)?.[1] ?? ""),
      d: texto(t[1].match(/class="d">([\s\S]*?)<\/span>/)?.[1] ?? ""),
    })),
  }));
  add(/<div class="cols">([\s\S]*?<\/ul><\/div>)\s*<\/div>/g, (m) => ({
    t: "cols",
    cols: todos(/<div class="box"><h3>([\s\S]*?)<\/h3>([\s\S]*?)<\/div>/g, m[1]).map((b) => ({ titulo: texto(b[1]), itens: todos(/<li>([\s\S]*?)<\/li>/g, b[2]).map((l) => inline(l[1])) })),
  }));
  add(/<table>([\s\S]*?)<\/table>/g, (m) => tabela(m[1]));
  add(/<figure>\s*<img src="data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)"[^>]*>\s*(?:<figcaption>([\s\S]*?)<\/figcaption>)?\s*<\/figure>/g, (m) => {
    imagens.push({ mime: m[1], base64: m[2] });
    return { t: "img", img: String(imagens.length - 1), legenda: texto(m[3] ?? "") };
  });
  add(/<dl[^>]*>([\s\S]*?)<\/dl>/g, (m) => ({ t: "kv", itens: todos(/<dt>([\s\S]*?)<\/dt>\s*<dd>([\s\S]*?)<\/dd>/g, m[1]).map((x) => [texto(x[1]), inline(x[2])] as [string, string]) }));
  add(/<(ol|ul)(?: class="[^"]*")?>([\s\S]*?)<\/\1>/g, (m) => ({ t: "lista", ordenada: m[1] === "ol", itens: todos(/<li>([\s\S]*?)<\/li>/g, m[2]).map((l) => inline(l[1])) }));
  add(/<div class="callout">([\s\S]*?)<\/div>/g, (m) => ({ t: "p", html: inline(m[1]), estilo: "destaque" }));
  add(/<p(?: class="([^"]*)")?>([\s\S]*?)<\/p>/g, (m) => ({ t: "p", html: inline(m[2]), estilo: m[1] === "note" ? "nota" : undefined }));
  achados.sort((a, b) => a.i - b.i || b.fim - a.fim);
  const out: Bloco[] = [];
  let ate = -1;
  for (const a of achados) {
    if (a.i < ate) continue;
    out.push(...(Array.isArray(a.b) ? a.b : [a.b]));
    ate = a.fim;
  }
  return out;
}

export function lerRelatorio(html: string): { relatorio: Relatorio; imagens: ImagemRelatorio[] } | null {
  if (!html || html.length > MAX_HTML) return null;
  const s = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  const titulo = texto(s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
  if (!titulo) return null;
  const imagens: ImagemRelatorio[] = [];
  const secoes = todos(/<section[^>]*>\s*<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)<\/section>/g, s)
    .map((m) => ({ titulo: texto(m[1]), blocos: blocosDa(m[2], imagens) }))
    .filter((x) => x.titulo && x.blocos.length);
  if (!secoes.length) return null;
  return {
    relatorio: {
      titulo,
      lede: inline(s.match(/<p class="lede">([\s\S]*?)<\/p>/)?.[1] ?? ""),
      veredito: texto(s.match(/<div class="verdict">([\s\S]*?)<\/div>/)?.[1] ?? ""),
      destaque: inline(s.match(/<p class="trava">([\s\S]*?)<\/p>/)?.[1] ?? ""),
      secoes,
    },
    imagens,
  };
}

/** Lê o que está gravado na área (formato acima); qualquer coisa fora do formato vira null */
export function relatorioGravado(v: unknown): Relatorio | null {
  const r = v as Relatorio | null;
  return r && typeof r === "object" && typeof r.titulo === "string" && Array.isArray(r.secoes) ? r : null;
}

/** Troca o número da imagem pelo endereço dela (depois de guardada) */
export const comImagens = (r: Relatorio, urls: string[]): Relatorio => ({
  ...r,
  secoes: r.secoes.map((s) => ({ ...s, blocos: s.blocos.map((b) => (b.t === "img" ? { ...b, img: urls[Number(b.img)] ?? "" } : b)) })),
});
