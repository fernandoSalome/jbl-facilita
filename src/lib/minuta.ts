/**
 * Minuta da carta de intenção: o texto oficial montado com os dados que a pessoa enviou.
 * A equipe revisa e edita (como num Word) e manda para assinatura eletrônica na Autentique.
 */
import { randomBytes } from "node:crypto";
import { cartaMontada, CNPJ_JBL, type Campos } from "./carta";

export type DadosCarta = {
  proprietario?: Record<string, string>;
  casamento?: Record<string, string>;
  conjuge?: Record<string, string>;
  imovel?: Record<string, string>;
  interesse?: Record<string, string>;
  local?: string;
  data?: string;
  matricula?: { name: string; type: string; data: string } | null;
};

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const t = (x?: string) => (x ?? "").trim();

/** Dados enviados pelo formulário → campos usados no texto da carta */
export function camposDaCarta(d: DadosCarta): Campos {
  const p = d.proprietario ?? {}, c = d.casamento ?? {}, j = d.conjuge ?? {}, i = d.imovel ?? {};
  return {
    p_nome: t(p.nome), p_cpf: t(p.cpf), p_rg: t(p.rg), p_nac: t(p.nacionalidade), p_prof: t(p.profissao), p_end: t(p.endereco), p_nasc: t(p.nascimento), p_natural: t(p.naturalidade),
    estado_civil: t(c.estadoCivil), c_data: t(c.data), c_regime: t(c.regime), c_matricula: t(c.matricula), c_rcpn: t(c.rcpn), c_municipio: t(c.municipio),
    j_nome: t(j.nome), j_cpf: t(j.cpf), j_rg: t(j.rg), j_nac: t(j.nacionalidade), j_prof: t(j.profissao), j_nasc: t(j.nascimento), j_natural: t(j.naturalidade),
    i_area: t(i.areaHa), i_zona: t(i.zona), i_municipio: t(i.municipio), i_cartorio: t(i.cartorio), i_matriculas: t(i.matriculas), i_car: t(i.car),
  };
}

type Projeto = { name: string; municipio: string; uf: string; matricula: string | null };

/**
 * Minuta inicial (HTML): título, texto da carta em uso na proposta (o do template ou o editado nela)
 * com os dados e as assinaturas. Lacunas ficam marcadas
 */
export function minutaInicial(d: DadosCarta, projeto: Projeto, criadaEm: Date, overrides: Record<string, unknown> = {}): string {
  const campos = camposDaCarta(d);
  const quando = d.data && /^\d{4}-\d{2}-\d{2}$/.test(d.data) ? new Date(`${d.data}T12:00:00`) : criadaEm;
  const carta = cartaMontada(overrides, campos, projeto, quando, { minuta: true });
  const corpo = carta.blocos.map((b) => (b.h ? `<h3>${b.html}</h3>` : `<p>${b.html}</p>`)).join("\n");
  const assinaturas = [
    ["JBL Incorporadora Urbanismo e Empreendimentos Ltda", `CNPJ sob n.º ${CNPJ_JBL}`],
    [campos.p_nome || "Proprietário(a)", campos.p_cpf ? `CPF: n.º ${campos.p_cpf}` : ""],
    ...(campos.j_nome ? [[campos.j_nome, campos.j_cpf ? `CPF: n.º ${campos.j_cpf}` : ""]] : []),
  ]
    .map(([n, c]) => `<div class="sig"><strong>${esc(n)}</strong>${c ? `<br><small>${esc(c)}</small>` : ""}</div>`)
    .join("");
  return comClausulaEletronica(`<h2 class="titulo">${esc(carta.titulo)}</h2>\n${corpo}\n<div class="assinaturas">${assinaturas}</div>`);
}

/** Aceite da assinatura eletrônica: dá validade à carta assinada pela Autentique (MP 2.200-2/2001, art. 10, § 2º) */
export const CLAUSULA_ELETRONICA =
  "As partes reconhecem e aceitam como válida a assinatura eletrônica deste documento, realizada por meio de plataforma de assinatura eletrônica, com registro de data, hora, endereço IP e confirmação da identidade de cada signatário, nos termos do art. 10, § 2º, da Medida Provisória n.º 2.200-2/2001.";

/** Coloca a cláusula antes das assinaturas (uma vez só; se a equipe já tiver o texto, não repete) */
export function comClausulaEletronica(html: string) {
  if (html.includes("2.200-2/2001")) return html;
  const p = `<p>${CLAUSULA_ELETRONICA}</p>`;
  const i = html.indexOf('<div class="assinaturas">');
  return i >= 0 ? `${html.slice(0, i)}${p}\n${html.slice(i)}` : `${html}\n${p}`;
}

// ------------------------------------------------------------------ limpeza do HTML editado

const TAGS = new Set(["p", "div", "h2", "h3", "br", "strong", "b", "em", "i", "u", "s", "span", "ul", "ol", "li", "small", "font"]);
const CLASSES = new Set(["titulo", "lacuna", "assinaturas", "sig"]);
const ESTILOS = new Set(["text-align", "font-size", "font-weight", "font-style", "text-decoration", "text-decoration-line", "color", "background-color", "margin-left", "padding-left"]);
const VALOR_OK = /^[#a-zA-Z0-9\s.,()%-]+$/;

function attr(attrs: string, name: string) {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[2] ?? m[3] ?? m[4] ?? "") : "";
}

/** Só passa formatação de texto (negrito, sublinhado, alinhamento, tamanho, cor, listas). Scripts, links e eventos saem */
export function limparMinuta(html: string): string {
  let out = "";
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^<>]*)>|<!--[\s\S]*?-->|([^<]+)|</g;
  let m: RegExpExecArray | null;
  const pilha: string[] = [];
  while ((m = re.exec(html.slice(0, 400_000)))) {
    if (m[4] !== undefined) {
      out += m[4].replace(/&(?!(?:[a-zA-Z]+|#\d+|#x[0-9a-fA-F]+);)/g, "&amp;").replace(/>/g, "&gt;");
      continue;
    }
    if (m[2] === undefined) {
      if (m[0] === "<") out += "&lt;";
      continue;
    }
    const tag = m[2].toLowerCase();
    if (!TAGS.has(tag)) continue;
    const saida = tag === "font" || tag === "b" ? (tag === "b" ? "strong" : "span") : tag === "i" ? "em" : tag;
    if (tag === "br") {
      out += "<br>";
      continue;
    }
    if (m[1]) {
      const i = pilha.lastIndexOf(saida);
      if (i >= 0) {
        // fecha o que ficou aberto dentro dela
        for (let k = pilha.length - 1; k >= i; k--) out += `</${pilha[k]}>`;
        pilha.length = i;
      }
      continue;
    }
    const estilo = attr(m[3], "style")
      .split(";")
      .map((d) => {
        const k = d.indexOf(":");
        if (k < 0) return "";
        const prop = d.slice(0, k).trim().toLowerCase();
        const val = d.slice(k + 1).trim();
        return ESTILOS.has(prop) && VALOR_OK.test(val) && !/url|expression/i.test(val) ? `${prop}:${val}` : "";
      })
      .filter(Boolean);
    if (tag === "font") {
      const cor = attr(m[3], "color");
      if (cor && VALOR_OK.test(cor)) estilo.push(`color:${cor}`);
    }
    const align = attr(m[3], "align");
    if (align && /^(left|right|center|justify)$/i.test(align)) estilo.push(`text-align:${align.toLowerCase()}`);
    const cls = attr(m[3], "class").split(/\s+/).filter((c) => CLASSES.has(c)).join(" ");
    out += `<${saida}${cls ? ` class="${cls}"` : ""}${estilo.length ? ` style="${estilo.join(";")}"` : ""}>`;
    pilha.push(saida);
  }
  for (let k = pilha.length - 1; k >= 0; k--) out += `</${pilha[k]}>`;
  return out;
}

/** Página completa da minuta (para ler na tela e gerar o PDF) */
export function documentoMinuta(corpo: string, opcoes: { titulo: string; rodape?: string; tela?: boolean }) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(opcoes.titulo)}</title>
<style>${CSS_MINUTA}${opcoes.tela ? "body{max-width:820px;margin:24px auto;padding:0 20px}" : ""}</style></head>
<body><article class="minuta">${corpo}</article>${opcoes.rodape ? `<footer>${esc(opcoes.rodape)}</footer>` : ""}</body></html>`;
}

export const CSS_MINUTA = `
@page{size:A4;margin:22mm 20mm}
body{font-family:Georgia,"Times New Roman",serif;color:#1f2a37;font-size:13.5px;line-height:1.65;margin:0}
.minuta h2.titulo{text-align:center;text-decoration:underline;font-size:17px;letter-spacing:.04em;margin:0 0 18px;color:#122A45}
.minuta h3{font-size:14px;margin:18px 0 6px;color:#122A45}
.minuta p{margin:0 0 10px;text-align:justify}
.minuta .lacuna{background:#fff1c2;padding:0 3px;border-radius:2px}
.minuta ul{list-style:disc;padding-left:26px;margin:0 0 10px}
.minuta ol{list-style:decimal;padding-left:26px;margin:0 0 10px}
.minuta .assinaturas{display:grid;grid-template-columns:1fr 1fr;gap:40px 48px;margin-top:56px;page-break-inside:avoid}
.minuta .sig{border-top:1px solid #122A45;padding-top:6px;text-align:center;font-size:12.5px}
footer{margin-top:28px;font:11px Arial,sans-serif;color:#8a929b;text-align:center}
@media print{.minuta .lacuna{background:none}}
`;

// ------------------------------------------------------------------ link de assinatura

export const novoTokenAssinatura = () => randomBytes(18).toString("base64url");

/** Só os dígitos, com DDI do Brasil quando faltar */
export function numeroWhatsapp(tel: string) {
  const d = tel.replace(/\D/g, "");
  if (d.length < 10) return null;
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}
