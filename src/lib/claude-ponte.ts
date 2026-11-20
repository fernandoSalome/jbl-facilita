/**
 * Ponte WhatsApp → Claude da VPS (pedido 20/11/2026). Pelo grupo JBL - Claude, o Fernando e o Marcelo pedem
 * pesquisas e perguntas; o Claude da VPS (com a assinatura) busca a fila no Facilita, faz e devolve.
 * Pelo WhatsApp não se altera código: isso é feito pelo app do Claude.
 */
import { timingSafeEqual } from "node:crypto";

/** Quem pode mandar: o próprio WhatsApp conectado (mensagem "de mim") e os números em CLAUDE_AUTORIZADOS */
export function autorizado(m: { deMim: boolean; participante: string }, lista = process.env.CLAUDE_AUTORIZADOS ?? "") {
  if (m.deMim) return true;
  const nums = lista.split(/[,;\n]+/).map((x) => x.replace(/\D/g, "")).filter((x) => x.length >= 10);
  const p = m.participante.replace(/\D/g, "");
  return !!p && nums.some((n) => p === n || p.endsWith(n) || n.endsWith(p));
}

/** Confere a senha da VPS (Authorization: Bearer …) sem vazar tempo de comparação */
export function senhaValida(cabecalho: string | null, segredo = process.env.CLAUDE_PONTE_SECRET ?? "") {
  if (segredo.length < 24 || !cabecalho?.startsWith("Bearer ")) return false;
  const a = Buffer.from(cabecalho.slice(7));
  const b = Buffer.from(segredo);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Resposta cabe numa mensagem de WhatsApp (o resto fica no sistema) */
export const cortarResposta = (t: string, max = 3500) => (t.length <= max ? t : `${t.slice(0, max - 60).trimEnd()}\n\n… (resposta longa: o restante ficou salvo no sistema)`);

/** Que tipo de pedido é: estudo da área (Viabilidade Legal), mercado (Viabilidade Mercadológica) ou pesquisa livre */
export function tipoDoPedido(t: string): "estudo" | "mercado" | "pesquisa" {
  const n = t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const pede = /\b(faca|faz|fazer|rode|roda|rodar|monte|monta|gere|gera|quero|preciso)\b/.test(n);
  if (pede && /mercadolog|concorr/.test(n)) return "mercado";
  if (pede && /estudo|raio-?x|viabilidade legal|viabilidade da area/.test(n)) return "estudo";
  return "pesquisa";
}
