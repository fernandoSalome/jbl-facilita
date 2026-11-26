import { faltandoNaCarta } from "./carta";

/**
 * Carta de intenção em duas partes (pedido 25/11/2026): o formulário inteiro desanimava quem queria responder logo.
 * A parte A são 7 campos do proprietário; enviada, vale como aceite inicial (só um aviso no JBL - Avisos) e o resto
 * do formulário abre para formalizar a minuta. Propostas bloqueadas antes disso seguem com o formulário inteiro.
 */

export const PARTE_A = ["p_nome", "p_cpf", "p_rg", "p_nac", "p_prof", "p_nasc", "p_natural"] as const;

/** campo da parte A → nome no grupo "proprietario" dos dados enviados */
const CAMPOS: Record<(typeof PARTE_A)[number], string> = {
  p_nome: "nome", p_cpf: "cpf", p_rg: "rg", p_nac: "nacionalidade", p_prof: "profissao", p_nasc: "nascimento", p_natural: "naturalidade",
};

/** Campos da parte A que faltam (ou CPF incompleto), no formulário e no servidor */
export const faltandoNaParteA = (b: Record<string, unknown>) => faltandoNaCarta(b).filter((f) => (PARTE_A as readonly string[]).includes(f.k));

/** Só os 7 campos, como texto aparado e com limite de tamanho */
export function dadosDaParteA(b: unknown): { proprietario: Record<string, string> } {
  const p = b && typeof b === "object" ? (b as Record<string, unknown>).proprietario : null;
  const o = p && typeof p === "object" ? (p as Record<string, unknown>) : {};
  const proprietario: Record<string, string> = {};
  for (const campo of Object.values(CAMPOS)) proprietario[campo] = typeof o[campo] === "string" ? (o[campo] as string).trim().slice(0, 160) : "";
  return { proprietario };
}

/** O que foi guardado na parte A de volta para os campos do formulário (abrir em outro aparelho já preenchido) */
export function camposDaParteA(meta: unknown): Record<string, string> {
  const { proprietario } = dadosDaParteA(meta);
  const out: Record<string, string> = {};
  for (const k of PARTE_A) if (proprietario[CAMPOS[k]]) out[k] = proprietario[CAMPOS[k]];
  return out;
}

/** Aviso no JBL - Avisos: "Sr. Rogério assinou a parte A da carta de intenção de Martinópolis/SP" */
export const avisoParteA = (quem: string, municipio: string, uf: string, proposta: string) =>
  `✍️ *${quem}* assinou a parte A da carta de intenção de *${municipio}/${uf}* (proposta ${proposta}). Falta completar os outros dados para a minuta.`;
