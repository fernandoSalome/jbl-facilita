/**
 * Proposta criada a partir da área (pedido 20/11/2026): ao chegar na etapa Proposta, a proposta nasce com o que
 * os estudos já definiram e abre no editor de sempre. Funções puras: formato e números da proposta.
 */
import type { FormatoKey } from "./formatos";
import { lerEstudo1, lerEstudo2 } from "./captacao-estudos";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const num = (s: string) => parseFloat(s.replace(/\./g, "").replace(",", "."));

/** Formato da proposta pelo produto recomendado */
export function formatoDaArea(produto: string): FormatoKey {
  const n = norm(produto);
  const chacara = /chacar/.test(n);
  const condominio = /condominio|fechado/.test(n) && !/aberto/.test(n);
  if (chacara) return condominio ? "chacreamento_condominio" : "chacreamento_aberto";
  return condominio ? "condominio_urbano" : "loteamento_aberto";
}

/** Números da proposta tirados dos estudos; o que não houver fica com o padrão do formato */
export function entradasDaArea(a: { hectares: number | null; estudo1: unknown; estudo2: unknown }, padroes: { metragemLote: number; frenteLote: number; aproveitamento: number }) {
  const e1 = lerEstudo1(a.estudo1);
  const e2 = lerEstudo2(a.estudo2);
  const out: { areaTotal?: number; metragemLote: number; frenteLote: number; aproveitamento: number; valorM2?: number } = { ...padroes };
  if (a.hectares) out.areaTotal = Math.round(a.hectares * 1e4);
  // lote: "300 m² / 12 m" do Estudo 1, ou "lotes de 300 m²" do produto
  const lote = e1.loteMinimo.match(/(\d[\d.]*)\s*m²/) ?? `${e2.produto} ${e1.produto}`.match(/lotes? de (\d[\d.]*)\s*m²/i);
  if (lote) out.metragemLote = num(lote[1]);
  const frente = e1.loteMinimo.match(/\/\s*(\d+(?:[.,]\d+)?)\s*m\b/);
  if (frente) out.frenteLote = num(frente[1]);
  else if (lote) out.frenteLote = Math.max(8, Math.round(out.metragemLote / 25));
  // aproveitamento = área dos lotes do cenário médio ÷ área total
  if (e1.lotes.medio && out.areaTotal) {
    const ap = (e1.lotes.medio * out.metragemLote) / out.areaTotal;
    if (ap > 0.05 && ap < 0.95) out.aproveitamento = Math.round(ap * 1000) / 1000;
  }
  // valor do m²: meio da faixa do produto recomendado; senão o mínimo da região
  const faixa = `${e2.produto} ${e1.produto}`.match(/R\$\s*([\d.]+)\s*[–-]\s*([\d.]+)\s*\/\s*m²/);
  if (faixa) out.valorM2 = Math.round((num(faixa[1]) + num(faixa[2])) / 2);
  else if (e1.regiao.m2Min) out.valorM2 = e1.regiao.m2Min;
  return out;
}
