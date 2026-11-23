/**
 * Parar e retomar o estudo da VPS (pedido 23/11/2026): parado, o trabalho fica guardado na VPS por 5 dias; se
 * não for retomado, é descartado. Funções puras; o que fala com o banco está em estudo-parar-db.ts.
 */
import { NOME_ESTUDO, type TipoEstudo } from "./estudo-andamento";

export const DIAS_GUARDADO = 5;

export const guardadoAte = (paradoEm: Date) => new Date(+paradoEm + DIAS_GUARDADO * 24 * 3600e3);
export const podeRetomar = (paradoEm: Date | null, agora = new Date()) => !!paradoEm && +guardadoAte(paradoEm) > +agora;
export const dataCurta = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

/** "pare o estudo de Ipioca", "cancela a viabilidade" → parar; "retoma o estudo", "volta a análise" → retomar */
export function lerPedidoParada(texto: string): "parar" | "retomar" | null {
  const n = texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  if (n.length > 120 || !/estud|viabilidade|analise/.test(n)) return null;
  if (/\b(par[ae]r?|interromp\w*|cancel\w*|suspend\w*)\b/.test(n)) return "parar";
  if (/\b(retom\w*|reativ\w*|volt\w*|continu\w*)\b/.test(n)) return "retomar";
  return null;
}

export function textoPedidoParar(titulo: string, tipo: TipoEstudo, naVps: boolean) {
  return naVps
    ? `⏹ Pedi para parar a ${NOME_ESTUDO[tipo]} de *${titulo}*. Confirmo aqui quando a VPS parar (até 1 minuto).`
    : textoParou(titulo, tipo, new Date());
}

export function textoParou(titulo: string, tipo: TipoEstudo, paradoEm: Date) {
  return `✅ Parei a ${NOME_ESTUDO[tipo]} de *${titulo}*. O que já foi feito fica guardado até ${dataCurta(guardadoAte(paradoEm))}; para continuar, mande _retomar o estudo de ${titulo}_ ou use o botão na área.`;
}

export function textoRetomado(titulo: string, tipo: TipoEstudo, naFila: number) {
  return `▶️ Retomando a ${NOME_ESTUDO[tipo]} de *${titulo}* de onde parou${naFila ? `; tem ${naFila} pedido(s) antes` : ""}. Respondo aqui quando terminar.`;
}
