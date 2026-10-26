import { parseContent, type FormatoContent, type FormatoKey } from "./formatos";
import { cleanOverride } from "./sanitize";

/**
 * Limpa o conteúdo de um formato antes de gravar uma versão do template
 * (mesmas regras das alterações feitas nas propostas). Lança erro se uma lista vier inválida.
 */
export function limparConteudo(raw: unknown, formato: FormatoKey): FormatoContent {
  const c = parseContent(raw, formato);
  const overrides: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(c.overrides ?? {})) {
    const clean = cleanOverride(k, v);
    if (clean !== undefined && clean !== null) overrides[k] = clean;
  }
  const lista = (secao: "infra" | "complementar" | "benfeitorias" | "contatos", itens: unknown[]) => {
    const r = cleanOverride(`lista.${secao}`, { added: itens, removed: [] }) as { added: unknown[] } | undefined;
    if (!r) throw new Error(`Lista inválida: ${secao}`);
    return r.added;
  };
  const num = (v: unknown, min: number, max: number, d: number) => (typeof v === "number" && isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
  const txt = (v: unknown, d: string) => (typeof v === "string" && v.trim() ? v.replace(/[<>]/g, "").slice(0, 200) : d);

  return {
    label: txt(c.label, formato),
    curto: txt(c.curto, c.label),
    modelo: txt(c.modelo, c.label),
    lei: txt(c.lei, ""),
    padroes: {
      metragemLote: num(c.padroes.metragemLote, 20, 1_000_000, 200),
      frenteLote: num(c.padroes.frenteLote, 1, 10_000, 8),
      aproveitamento: num(c.padroes.aproveitamento, 0.01, 1, 0.5),
    },
    infra: lista("infra", c.infra) as FormatoContent["infra"],
    complementar: lista("complementar", c.complementar) as FormatoContent["complementar"],
    benfeitorias: lista("benfeitorias", c.benfeitorias) as FormatoContent["benfeitorias"],
    contatos: lista("contatos", c.contatos) as FormatoContent["contatos"],
    overrides,
    ...(c.planilha === "2026" ? { planilha: "2026" as const } : {}),
  };
}
