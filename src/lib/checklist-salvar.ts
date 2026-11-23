import { SECOES, type Resposta } from "./captacao";

/**
 * "Salvar e Continuar" do checklist (pedido 23/11/2026): grava os campos de uma seção. A resposta manual anterior
 * do mesmo item é trocada; as de outra origem (WhatsApp, raio-x, documento) ficam. Campo vazio apaga a manual.
 * Só aceita perguntas da seção (o resto é ignorado).
 */
export function aplicarValores(chk: Resposta[], secao: number, valores: Record<string, unknown>, ref: string, agora = new Date()): Resposta[] {
  const s = SECOES[secao];
  if (!s) throw new Error("Seção inválida");
  const novos = Object.entries(valores)
    .filter(([p, v]) => s.perguntas.includes(p) && typeof v === "string")
    .map(([p, v]) => [p, (v as string).trim().slice(0, 1500)] as const);
  const mexidas = new Set(novos.map(([p]) => p));
  const fica = chk.filter((r) => !(r.secao === secao && r.fonte === "manual" && mexidas.has(r.pergunta)));
  const em = agora.toISOString();
  return [...fica, ...novos.filter(([, v]) => v).map(([pergunta, resposta]) => ({ secao, pergunta, resposta, fonte: "manual" as const, ref, em }))].slice(-2000);
}

/** Valor que aparece no campo: a resposta mais recente do item, de qualquer origem */
export function valorAtual(todas: Resposta[], secao: number, pergunta: string) {
  const rs = todas.filter((r) => r.secao === secao && r.pergunta === pergunta);
  return rs.length ? rs[rs.length - 1] : null;
}

/**
 * Respostas do checklist que o estudo da VPS manda em resultado.json ("checklist": [{secao: 1 a 30, pergunta,
 * resposta}]). Só entram as perguntas oficiais da seção, com texto; até 300 itens.
 */
export function respostasDoEstudo(lista: unknown, ref: string, agora = new Date()): Resposta[] {
  if (!Array.isArray(lista)) return [];
  const em = agora.toISOString();
  return lista.slice(0, 300).flatMap((x) => {
    const o = x as { secao?: unknown; pergunta?: unknown; resposta?: unknown };
    const secao = Number(o?.secao) - 1;
    if (!SECOES[secao] || typeof o.pergunta !== "string" || !SECOES[secao].perguntas.includes(o.pergunta)) return [];
    const resposta = typeof o.resposta === "string" ? o.resposta.trim().slice(0, 1500) : "";
    return resposta ? [{ secao, pergunta: o.pergunta, resposta, fonte: "raiox" as const, ref: ref.slice(0, 120), em }] : [];
  });
}
