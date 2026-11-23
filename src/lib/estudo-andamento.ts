/**
 * Estudo pedido pela tela e feito na VPS (pedido 22/11/2026): avisos no JBL - Avisos e o andamento (%) na tela.
 * Funções puras; o que fala com o banco está em estudo-andamento-db.ts.
 */

export type TipoEstudo = "estudo" | "mercado";
export const NOME_ESTUDO: Record<TipoEstudo, string> = { estudo: "Viabilidade Legal", mercado: "Viabilidade Mercadológica" };
/** Tempo típico de cada estudo na VPS, para estimar o % quando ela ainda não disse a fase */
const MINUTOS_TIPICOS: Record<TipoEstudo, number> = { estudo: 45, mercado: 35 };

export const ehTipoEstudo = (t: unknown): t is TipoEstudo => t === "estudo" || t === "mercado";

export function textoComecou(titulo: string, tipo: TipoEstudo) {
  return tipo === "estudo"
    ? `🧠 Comecei a análise da gleba *${titulo}* (Viabilidade Legal). Aviso quando estiver pronta.`
    : `📊 Comecei a Viabilidade Mercadológica de *${titulo}*. Aviso quando estiver pronta.`;
}

export function textoPronto(titulo: string, tipo: TipoEstudo, ok: boolean) {
  if (!ok) return `⚠️ A ${NOME_ESTUDO[tipo]} de *${titulo}* não terminou. Detalhes no JBL - Central.`;
  return `✅ ${NOME_ESTUDO[tipo]} de *${titulo}* pronta. O resumo está no JBL - Central e o estudo completo, na área.`;
}

/**
 * Lê a linha de andamento que o Claude grava na VPS ("60 Calculando os lotes"). Devolve null se não der para ler.
 * O % fica entre 1 e 99: 100 só quando o estudo entra na plataforma.
 */
export function lerAndamento(linha: unknown): { progresso: number; fase: string } | null {
  if (typeof linha !== "string") return null;
  const m = linha.trim().match(/^(\d{1,3})\s*%?\s*[-–:·]?\s*(.*)$/s);
  if (!m) return null;
  const progresso = Math.min(99, Math.max(1, Number(m[1])));
  return { progresso, fase: m[2].trim().split("\n")[0].slice(0, 80) };
}

/** % mostrado na tela: o que a VPS disse; sem isso, estimado pelo tempo (nunca passa de 90) */
export function percentual(c: { status: string; progresso: number | null; iniciadoEm: Date | null }, tipo: TipoEstudo, agora = new Date()) {
  if (c.status !== "rodando" || !c.iniciadoEm) return 0;
  if (c.progresso != null) return c.progresso;
  const min = (+agora - +c.iniciadoEm) / 60_000;
  return Math.max(2, Math.min(90, Math.round((min / MINUTOS_TIPICOS[tipo]) * 90)));
}
