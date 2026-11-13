import { emojiPadrao, separarEmoji, type Benfeitoria } from "./formatos";
import { HTML_PREFIX } from "./sanitize";
import type { Overrides } from "./proposals";

/**
 * Lista única de benfeitorias (pedido do Fernando, 12/11/2026): todos os tipos do template com todas as benfeitorias
 * que existem em algum deles, sem repetir; na proposta se retira o que não vale.
 */

/** Texto que aparece para o item: o editado no template/proposta (li.<id>.texto) ou o do item, sem HTML */
export function textoBf(b: Benfeitoria, ov: Overrides): string {
  const salvo = ov[`li.${b.id}.texto`];
  const t = typeof salvo === "string" ? (salvo.startsWith(HTML_PREFIX) ? salvo.slice(HTML_PREFIX.length) : salvo) : b.texto;
  return t.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

/** Emoji do item: o escolhido (li.<id>.emoji), o do começo do texto ou o padrão pelo tipo */
function emojiBf(b: Benfeitoria, ov: Overrides): string {
  const escolhido = ov[`li.${b.id}.emoji`];
  if (typeof escolhido === "string" && escolhido) return escolhido;
  const t = textoBf(b, ov);
  return separarEmoji(t).emoji ?? b.emoji ?? emojiPadrao(t);
}

/** Itens que mudam de nome entre os tipos mas são a mesma benfeitoria (praças, muro frontal, portaria, quiosque) */
const GRUPOS: [RegExp, string][] = [[/^praca\b/, "praca"], [/^muro frontal\b/, "muro frontal"], [/^portaria\b/, "portaria"], [/\bquiosque\b/, "quiosque"]];

/** "🌳 Praças equipadas e arborizadas (x)" → "praca equipada e arborizada": sem emoji, acento, parênteses e plural */
export function chaveBf(texto: string): string {
  const k = normalizar(texto);
  return GRUPOS.find(([re]) => re.test(k))?.[1] ?? k;
}

function normalizar(texto: string): string {
  return separarEmoji(texto)
    .texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/).filter(Boolean)
    .map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w))
    .join(" ");
}

/** Mesmo item: chaves iguais ou uma é o começo da outra ("salao de festa" e "salao de festa e evento") */
const mesma = (a: string, b: string) => a === b || a.startsWith(b + " ") || b.startsWith(a + " ");

export type ItemUniao = { chaves: string[]; texto: string };

/** Junta as listas na ordem dada; de itens repetidos fica o texto mais completo (o mais longo) */
export function uniaoBenfeitorias(listas: { itens: Benfeitoria[]; ov: Overrides }[]): ItemUniao[] {
  const u: ItemUniao[] = [];
  for (const { itens, ov } of listas) {
    for (const b of itens) {
      const sem = separarEmoji(textoBf(b, ov)).texto;
      const k = chaveBf(sem);
      if (!k) continue;
      const texto = `${emojiBf(b, ov)} ${sem}`;
      const achou = u.find((x) => x.chaves.some((c) => mesma(c, k)));
      if (!achou) u.push({ chaves: [k], texto });
      else {
        if (!achou.chaves.includes(k)) achou.chaves.push(k);
        if (sem.length > separarEmoji(achou.texto).texto.length) achou.texto = texto;
      }
    }
  }
  return u;
}

/** Item da união que corresponde a um item existente */
export const doItem = (u: ItemUniao[], b: Benfeitoria, ov: Overrides) => {
  const k = chaveBf(textoBf(b, ov));
  return u.findIndex((x) => x.chaves.some((c) => mesma(c, k)));
};

/** id dos itens novos que vêm da união (o mesmo em todos os tipos e propostas) */
export const idUniao = (n: number) => `uni${n + 1}`;

/**
 * Lista do tipo com todas as benfeitorias, na ordem da união: os itens que o tipo já tem ficam (com o id e o texto
 * dele, para as edições e remoções das propostas continuarem valendo); os que faltam entram com o texto da união.
 * Itens do tipo fora da união (sem texto) ficam no fim.
 */
export function listaCompleta(u: ItemUniao[], itens: Benfeitoria[], ov: Overrides): Benfeitoria[] {
  const porItem = new Map<number, Benfeitoria[]>();
  const fora: Benfeitoria[] = [];
  for (const b of itens) {
    const n = doItem(u, b, ov);
    if (n < 0) fora.push(b);
    else porItem.set(n, [...(porItem.get(n) ?? []), b]);
  }
  return [...u.flatMap((x, n) => porItem.get(n) ?? [{ id: idUniao(n), texto: x.texto }]), ...fora];
}

/** Pergunta antes de desabilitar (bloquear) a proposta */
export const BENFEITORIAS_CONFERIDAS =
  "Antes de desabilitar: as benfeitorias desta proposta foram conferidas?\n\nO template traz todas as benfeitorias. As que não valem para esta área precisam ter sido retiradas, porque depois de desabilitada a proposta não muda mais.\n\nOK = já conferi, pode desabilitar.";
