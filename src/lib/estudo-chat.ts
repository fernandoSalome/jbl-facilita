/**
 * Chat ao lado do estudo (pedido 27/11/2026): "abrir um chat ao lado e fazer perguntas pra entender o que dá pra
 * fazer ou não", com a assinatura do Claude da VPS. O Claude pode propor mudar, tirar ou acrescentar no estudo, mas
 * sempre pergunta antes: a mudança só entra com o "sim" ("pergunta sempre se inclui o que conversou").
 * Funções puras: pedido da fila, histórico, instruções ao Claude e validação do que ele devolve.
 */
import { lerEstudo1, lerEstudo2 } from "./captacao-estudos";
import type { Bloco, Relatorio } from "./relatorio";
import { sanitizeHtml } from "./sanitize";

export const ESTUDOS_CHAT = { estudo: "Viabilidade Legal", mercado: "Viabilidade Mercadológica" } as const;
export type EstudoChat = keyof typeof ESTUDOS_CHAT;
export const ehEstudoChat = (v: unknown): v is EstudoChat => v === "estudo" || v === "mercado";

export const MAX_PERGUNTA = 4000;
/** quantas mensagens anteriores vão junto para o Claude */
export const MAX_HISTORICO = 40;

export function lerPergunta(v: unknown): string | null {
  const t = typeof v === "string" ? v.trim() : "";
  return t && t.length <= MAX_PERGUNTA ? t : null;
}

/** pergunta: só responde · incluir: aplica no estudo o que foi combinado */
export type PedidoChat = { modo: "pergunta" | "incluir"; estudo: EstudoChat; mensagemId: string };

export const textoDoPedido = (p: PedidoChat) => JSON.stringify(p);

export function lerPedidoChat(texto: string): PedidoChat | null {
  try {
    const o = JSON.parse(texto) as Record<string, unknown>;
    if ((o.modo === "pergunta" || o.modo === "incluir") && ehEstudoChat(o.estudo) && typeof o.mensagemId === "string") return { modo: o.modo, estudo: o.estudo, mensagemId: o.mensagemId.slice(0, 40) };
  } catch {}
  return null;
}

export type MensagemChat = { papel: string; autor: string | null; texto: string; proposta: string | null; inclusao: string | null; createdAt: Date };

/** A conversa até aqui, em Markdown, para o Claude ler (as mais recentes, em ordem) */
export function conversaMd(msgs: MensagemChat[]): string {
  if (!msgs.length) return "(conversa nova)";
  return msgs
    .slice(-MAX_HISTORICO)
    .map((m) => {
      const quem = m.papel === "claude" ? "Claude" : m.papel === "sistema" ? "Sistema" : m.autor || "Equipe";
      const dia = m.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const inc = m.proposta ? `\n\n> Proposta de mudança no estudo: ${m.proposta}\n> Resposta da equipe: ${m.inclusao === "sim" || m.inclusao === "feito" ? "incluir" : m.inclusao === "nao" ? "não incluir" : "ainda não respondeu"}` : "";
      return `### ${quem} · ${dia}\n\n${m.texto}${inc}`;
    })
    .join("\n\n");
}

/**
 * Instruções ao Claude. Os arquivos ficam em `pasta` (relativa a ~/estudos): relatorio.json, estudo.json,
 * conversa.md e area.json; `pastaEstudo` é a pasta de trabalho do estudo original (fontes e documentos), se ainda existir.
 */
export function promptChat(p: { modo: PedidoChat["modo"]; estudo: EstudoChat; pasta: string; pastaEstudo: string | null; pergunta: string; proposta?: string | null }) {
  const nome = ESTUDOS_CHAT[p.estudo];
  const comum = `Você é o analista de loteamentos da JBL Incorporadora conversando com a equipe sobre a ${nome} de uma área. Leia ~/estudos/CLAUDE.md (regras dos estudos) e, em ${p.pasta}/: area.json (a área), estudo.json (campos do formulário), relatorio.json (o estudo completo, em seções e blocos) e conversa.md (a conversa até aqui).${p.pastaEstudo ? ` A pasta do estudo original, com as fontes e os documentos baixados, é ${p.pastaEstudo}/ (pode não ter tudo).` : ""} Responda em português do Brasil, direto, como numa conversa. Só lei publicada e fonte oficial; diga o grau de certeza e de onde tirou (seção do estudo, artigo da lei ou link). Pesquise na web quando o estudo não tiver a resposta.`;
  if (p.modo === "pergunta") {
    return `${comum}

Agora a equipe escreveu:

${p.pergunta}

Responda à mensagem. NÃO altere relatorio.json nem estudo.json nesta etapa. Grave em ${p.pasta}/:
- resposta.txt: a sua resposta (até 40 linhas; pode usar listas curtas e **negrito**);
- proposta.txt: em 1 a 5 linhas, o que você mudaria, tiraria ou acrescentaria no estudo com base nesta conversa (seção e campo). Se nada mudaria, deixe vazio. A equipe vai responder se inclui ou não.`;
  }
  return `${comum}

A equipe respondeu SIM: incluir no estudo o que foi conversado. A proposta combinada foi:

${p.proposta || "(ver o fim de conversa.md)"}

Aplique só isso. Em ${p.pasta}/, grave:
- relatorio-novo.json: o relatorio.json inteiro com as mudanças, no mesmo formato ({ titulo, lede, veredito, destaque, secoes: [{ titulo, blocos }] }; blocos dos tipos p, sub, lista, tabela, kv, tiles, cols e img). Mantenha as imagens que já existem (o campo img não muda); não crie imagens novas. Marque o que mudou com a data de hoje numa frase "Atualizado em <data> pela conversa da equipe: …" na seção afetada;
- estudo-novo.json: o estudo.json com os campos que mudarem (mesmas chaves; não mexa em status, perguntadoEm e originais);
- resposta.txt: em até 8 linhas, o que mudou.`;
}

/* --------------------- o que o Claude devolve: só no formato do estudo --------------------- */

const MAX_BLOCOS = 400;
const s = (v: unknown, max = 600) => (typeof v === "string" ? v.replace(/<[^>]+>/g, "").trim().slice(0, max) : "");
const h = (v: unknown, max = 6000) => (typeof v === "string" ? sanitizeHtml(v.slice(0, max)) : "");
const arr = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

function bloco(v: unknown, imagens: Set<string>): Bloco | null {
  const b = obj(v);
  switch (b.t) {
    case "p":
      return h(b.html) ? { t: "p", html: h(b.html), ...(b.estilo === "nota" || b.estilo === "destaque" ? { estilo: b.estilo } : {}) } : null;
    case "sub":
      return s(b.texto) ? { t: "sub", texto: s(b.texto) } : null;
    case "lista":
      return { t: "lista", ordenada: b.ordenada === true, itens: arr(b.itens, 60).map((x) => h(x, 2000)).filter(Boolean) };
    case "tabela":
      return { t: "tabela", cab: arr(b.cab, 20).map((x) => s(x, 200)), linhas: arr(b.linhas, 200).map((l) => arr(l, 20).map((c) => h(c, 1000))) };
    case "kv":
      return { t: "kv", itens: arr(b.itens, 60).map((x) => [s(arr(x, 2)[0], 200), h(arr(x, 2)[1], 2000)] as [string, string]) };
    case "tiles":
      return { t: "tiles", itens: arr(b.itens, 12).map((x) => ({ k: s(obj(x).k, 120), n: s(obj(x).n, 120), d: s(obj(x).d, 300) })) };
    case "cols":
      return { t: "cols", cols: arr(b.cols, 6).map((c) => ({ titulo: s(obj(c).titulo, 200), itens: arr(obj(c).itens, 40).map((x) => h(x, 1000)) })) };
    case "img":
      // só imagem que o estudo já tinha (endereço guardado); o Claude não cria imagem nova
      return typeof b.img === "string" && imagens.has(b.img) ? { t: "img", img: b.img, legenda: s(b.legenda, 300) } : null;
    default:
      return null;
  }
}

/** Endereços das imagens de um relatório gravado */
export function imagensDo(r: Relatorio | null): Set<string> {
  const out = new Set<string>();
  for (const sec of r?.secoes ?? []) for (const b of sec.blocos) if (b.t === "img" && b.img) out.add(b.img);
  return out;
}

/** Relatório devolvido pelo Claude, validado e limpo; null se não estiver no formato */
export function relatorioDoChat(v: unknown, imagens: Set<string>): Relatorio | null {
  const o = obj(v);
  const titulo = s(o.titulo, 300);
  const secoes = arr(o.secoes, 40)
    .map((x) => ({ titulo: s(obj(x).titulo, 300), blocos: arr(obj(x).blocos, MAX_BLOCOS).map((b) => bloco(b, imagens)).filter((b): b is Bloco => !!b) }))
    .filter((x) => x.titulo && x.blocos.length);
  if (!titulo || !secoes.length) return null;
  return { titulo, lede: h(o.lede, 3000), veredito: s(o.veredito, 1000), destaque: h(o.destaque, 3000), secoes };
}

/** Campos do formulário depois da conversa: valida e mantém o andamento e o "voltar ao original" de antes */
export function estudoDoChat(estudo: EstudoChat, antes: unknown, novo: unknown) {
  const a = obj(antes);
  const n = { ...obj(novo), status: a.status, perguntadoEm: a.perguntadoEm, originais: a.originais };
  if (estudo === "estudo") return lerEstudo1({ ...a, ...n });
  // o Estudo 2 guarda campos que o lerEstudo2 completa: junta antes de validar
  return lerEstudo2({ ...a, ...n });
}
