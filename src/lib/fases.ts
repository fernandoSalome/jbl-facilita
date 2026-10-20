export const FASES: [string, string][] = [
  ["prospeccao", "Prospecção"],
  ["proposta", "Proposta enviada"],
  ["parceria", "Parceria fechada"],
  ["aprovacao", "Aprovação"],
  ["obras", "Obras"],
  ["vendas", "Vendas"],
];

/** Nome curto da etapa nos documentos ("Aprovação") */
export const ETAPA: Record<string, string> = {
  prospeccao: "Prospecção",
  proposta: "Proposta",
  parceria: "Parceria",
  aprovacao: "Aprovação",
  obras: "Obras",
  vendas: "Vendas",
};

/** Etapa em que cada tipo de documento costuma entrar */
const FASE_DO_TIPO: Record<string, string> = {
  matricula: "prospeccao",
  car: "prospeccao",
  certidao: "prospeccao",
  iptu: "prospeccao",
  pessoal: "prospeccao",
  procuracao: "prospeccao",
  foto: "prospeccao",
  proposta: "proposta",
  contrato: "parceria",
  planta: "aprovacao",
  licenca: "aprovacao",
  obra: "obras",
  venda: "vendas",
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Etapa dita na mensagem ("documento da aprovação", "fotos da obra") */
export function fasePorTexto(t: string): string | null {
  const n = norm(t);
  if (/\bprospec/.test(n)) return "prospeccao";
  if (/\baprova|\blicenciamento\b|\bprefeitura\b|\bgraprohab\b|\bcetesb\b/.test(n)) return "aprovacao";
  if (/\bobras?\b|\bmedicao\b/.test(n)) return "obras";
  if (/\bvendas?\b|\bcomercializa/.test(n)) return "vendas";
  if (/\bparceria\b|\bspe\b|\bcontrato social\b/.test(n)) return "parceria";
  if (/\bfase da proposta\b|\betapa da proposta\b/.test(n)) return "proposta";
  return null;
}

/**
 * Etapa de um documento: a dita na mensagem; senão a do tipo do documento;
 * senão a fase atual do loteamento.
 */
export function faseDoDocumento(tipo: string, texto: string, faseProjeto?: string | null): string {
  return fasePorTexto(texto) ?? FASE_DO_TIPO[tipo] ?? (faseProjeto && ETAPA[faseProjeto] ? faseProjeto : "prospeccao");
}

/** Etapa em uso (documentos antigos não têm etapa gravada: vale a do tipo) */
export const faseEmUso = (d: { fase?: string | null; tipo: string }) => (d.fase && ETAPA[d.fase] ? d.fase : FASE_DO_TIPO[d.tipo] ?? "prospeccao");
