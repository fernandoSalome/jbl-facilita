/**
 * Propostas bloqueadas (desabilitadas) ficam como estavam no dia do bloqueio: o cliente pode ter assinado em cima
 * delas. Os dados já não mudam (planilha, template e passos do seed pulam as bloqueadas), mas a página é montada
 * pelo código de hoje. Toda mudança no código que muda o que o cliente vê (texto, conta, CSS) entra nesta lista
 * com a data em que foi ao ar; proposta bloqueada antes dessa data continua com o jeito antigo.
 *
 * Como usar numa mudança nova:
 *  1. acrescente { id, desde } aqui (desde = data/hora do deploy, com fuso);
 *  2. no JSX: `mudou(props.bloqueadaEm, "id") ? novo : antigo`;
 *  3. no CSS: escreva a regra nova com `.jblt:not(.antes-id) ...` (a raiz ganha a classe antes-id nas antigas).
 */
export const MUDANCAS = [
  // tabela completa de recebimentos mais baixa, células com folga e mais espaço antes das notas (04 e 05/11/2026)
  { id: "recebimentos-2026-11-04", desde: "2026-11-04T23:57:33-03:00" },
  // carta de intenção com a marca MINUTA em cima, no meio e no fim (antes: uma no meio) (05/11/2026)
  { id: "minuta-3-marcas", desde: "2026-11-05T00:25:57-03:00" },
  // legenda da foto da capa: "Gleba … hectares." e a nota da imagem juntas, uma depois da outra (08/11/2026)
  { id: "legenda-foto-junta", desde: "2026-11-08T21:20:00-03:00" },
  // carta de apresentação: a palavra "formato" do modelo ("… de Lotes formato Chacreamento") sem negrito (08/11/2026)
  { id: "formato-sem-negrito", desde: "2026-11-08T21:51:00-03:00" },
  // aplicação no banco: "Rentabilidade final" no meio da célula (10/11/2026)
  { id: "rentabilidade-centro", desde: "2026-11-10T20:38:00-03:00" },
] as const;

export type Mudanca = (typeof MUDANCAS)[number]["id"];

/** A mudança vale para a proposta? (sim, se não está bloqueada ou se foi bloqueada depois que a mudança entrou) */
export function mudou(bloqueadaEm: string | Date | null | undefined, id: Mudanca): boolean {
  if (!bloqueadaEm) return true;
  const m = MUDANCAS.find((x) => x.id === id)!;
  return new Date(bloqueadaEm).getTime() >= new Date(m.desde).getTime();
}

/** Classes da raiz da proposta: "antes-<id>" para cada mudança que não vale nela */
export function classesCongeladas(bloqueadaEm: string | Date | null | undefined): string {
  return MUDANCAS.filter((m) => !mudou(bloqueadaEm, m.id)).map((m) => `antes-${m.id}`).join(" ");
}
