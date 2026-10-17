import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { FORMATOS, parseContent, type FormatoKey } from "@/lib/formatos";
import { cleanOverride } from "@/lib/sanitize";

/**
 * Salva um formato do template como uma versão nova.
 *   aplicar = "todas":    as propostas desse formato passam para a versão nova
 *                         (ajustes feitos em cada proposta continuam valendo)
 *   aplicar = "proximas": as propostas existentes ficam na versão anterior
 */
export async function POST(req: Request, { params }: { params: { id: string; formato: string } }) {
  return withSession(async (s) => {
    const formato = params.formato as FormatoKey;
    if (!FORMATOS.includes(formato)) return json({ error: "Formato inválido" }, 400);
    const tpl = await db.template.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!tpl) return json({ error: "Template não encontrado" }, 404);

    const b = await req.json().catch(() => null);
    if (!b?.content || (b.aplicar !== "todas" && b.aplicar !== "proximas")) return json({ error: "Dados inválidos" }, 400);

    // Mesmas regras de limpeza das alterações feitas nas propostas
    const c = parseContent(b.content, formato);
    const overrides: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(c.overrides ?? {})) {
      const clean = cleanOverride(k, v);
      if (clean !== undefined && clean !== null) overrides[k] = clean;
    }
    const lista = (secao: "infra" | "complementar" | "benfeitorias", itens: unknown[]) => {
      const r = cleanOverride(`lista.${secao}`, { added: itens, removed: [] }) as { added: unknown[] } | undefined;
      if (!r) throw new Error(`Lista inválida: ${secao}`);
      return r.added;
    };
    const num = (v: unknown, min: number, max: number, d: number) => (typeof v === "number" && isFinite(v) ? Math.min(max, Math.max(min, v)) : d);
    const txt = (v: unknown, d: string) => (typeof v === "string" && v.trim() ? v.replace(/[<>]/g, "").slice(0, 200) : d);

    let content;
    try {
      content = {
        label: txt(c.label, formato),
        curto: txt(c.curto, c.label),
        modelo: txt(c.modelo, c.label),
        lei: txt(c.lei, ""),
        padroes: {
          metragemLote: num(c.padroes.metragemLote, 20, 1_000_000, 200),
          frenteLote: num(c.padroes.frenteLote, 1, 10_000, 8),
          aproveitamento: num(c.padroes.aproveitamento, 0.01, 1, 0.5),
        },
        infra: lista("infra", c.infra),
        complementar: lista("complementar", c.complementar),
        benfeitorias: lista("benfeitorias", c.benfeitorias),
        overrides,
      };
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }

    const v = await db.formatoVersion.create({ data: { templateId: tpl.id, formato, content: content as object, createdById: s.sub } });
    let atualizadas = 0;
    if (b.aplicar === "todas") {
      // inclui as excluídas, para que fiquem certas se forem reativadas; a contagem mostra só as ativas
      await db.proposal.updateMany({ where: { templateId: tpl.id, formato }, data: { formatoVersionId: v.id } });
      atualizadas = await db.proposal.count({ where: { templateId: tpl.id, formato, deletedAt: null } });
    }
    return json({ ok: true, versionId: v.id, atualizadas });
  });
}
