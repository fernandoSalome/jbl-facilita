import { estavel } from "./formatos";
import type { Overrides } from "./proposals";

/**
 * Textos personalizados nas propostas x mudanças do template (pedido do Fernando, 15/11/2026): o texto mudado dentro
 * da proposta vale mais que o do template, mas a proposta marcada ao salvar o template recebe o que mudou nele, mesmo
 * onde tinha personalizado. As listas (lista.*) não entram: são diferenças, não cópias.
 */

const DE_LISTA = /^lista\./;
const MAX_CHAVE = 200;
const MAX_CHAVES = 500;
const MAX_PROPOSTAS = 2000;

/** Chaves que o template mudou (texto, cor, imagem…), fora as listas */
export function chavesMudadas(antes: Overrides, depois: Overrides): string[] {
  const ks = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  return [...ks].filter((k) => !DE_LISTA.test(k) && estavel(antes[k]) !== estavel(depois[k])).sort();
}

/** Chaves personalizadas da proposta que entram na escolha (sem as listas) */
export const chavesProprias = (ov: Overrides) => Object.keys(ov).filter((k) => !DE_LISTA.test(k));

export type Afetada = { id: string; chaves: string[] };

/** Propostas não bloqueadas que têm personalizado algum texto que o template mudou (por tipo de loteamento) */
export function afetadas(
  propostas: { id: string; formato: string; bloqueada?: boolean; personalizadas?: string[] }[],
  mudadasPorFormato: Record<string, string[]>,
): Afetada[] {
  return propostas
    .filter((p) => !p.bloqueada)
    .map((p) => {
      const mudadas = new Set(mudadasPorFormato[p.formato] ?? []);
      return { id: p.id, chaves: (p.personalizadas ?? []).filter((k) => mudadas.has(k)) };
    })
    .filter((a) => a.chaves.length > 0);
}

/** Valida o pedido do navegador: { idDaProposta: [chaves] }, só das propostas escolhidas para mudar */
export function lerTrocas(raw: unknown, escolhidas: Set<string>): Map<string, string[]> {
  const r = new Map<string, string[]>();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return r;
  for (const [id, ks] of Object.entries(raw as Record<string, unknown>).slice(0, MAX_PROPOSTAS)) {
    if (!escolhidas.has(id) || !Array.isArray(ks)) continue;
    const chaves = ks.filter((k): k is string => typeof k === "string" && k.length > 0 && k.length <= MAX_CHAVE && !DE_LISTA.test(k)).slice(0, MAX_CHAVES);
    if (chaves.length) r.set(id, [...new Set(chaves)]);
  }
  return r;
}

/** Overrides da proposta sem as personalizações trocadas pelo texto do template */
export function semChaves(ov: Overrides, chaves: string[]): Overrides {
  const n = { ...ov };
  for (const k of chaves) delete n[k];
  return n;
}
