import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { latestVersion } from "@/lib/formato-server";
import { estavel, FORMATOS, juntar, type ComumContent, type FormatoKey, type TipoContent } from "@/lib/formatos";
import { limparConteudo } from "@/lib/template-salvar";

/**
 * Salva o template inteiro: a parte compartilhada (vale para os 4 tipos de loteamento)
 * e a parte de cada tipo. Cada tipo que mudou ganha uma versão nova.
 *   aplicar = "todas":    todas as propostas do template passam para as versões novas
 *                         (textos personalizados em cada proposta continuam valendo)
 *   aplicar = "proximas": as propostas existentes ficam nas versões anteriores
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const tpl = await db.template.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!tpl) return json({ error: "Template não encontrado" }, 404);

    const b = await req.json().catch(() => null);
    const comum = b?.comum as ComumContent | undefined;
    const tipos = b?.tipos as Record<FormatoKey, TipoContent> | undefined;
    if (!comum?.overrides || !tipos || FORMATOS.some((f) => !tipos[f]) || (b.aplicar !== "todas" && b.aplicar !== "proximas")) {
      return json({ error: "Dados inválidos" }, 400);
    }

    let conteudos: [FormatoKey, ReturnType<typeof limparConteudo>][];
    try {
      conteudos = FORMATOS.map((f) => [f, limparConteudo(juntar(comum, tipos[f]), f)]);
    } catch (e) {
      return json({ error: (e as Error).message }, 400);
    }

    let atualizadas = 0;
    for (const [formato, content] of conteudos) {
      const atual = await latestVersion(tpl.id, formato);
      // versão igual e já conferida (sem aviso de textos diferentes): reaproveita
      const v =
        atual && !(atual.content as { conflitos?: unknown }).conflitos && estavel(atual.content) === estavel(content)
          ? atual
          : await db.formatoVersion.create({ data: { templateId: tpl.id, formato, content: content as object, createdById: s.sub } });
      if (b.aplicar === "todas") {
        // inclui as excluídas, para que fiquem certas se forem reativadas; a contagem mostra só as ativas
        await db.proposal.updateMany({ where: { templateId: tpl.id, formato }, data: { formatoVersionId: v.id } });
        atualizadas += await db.proposal.count({ where: { templateId: tpl.id, formato, deletedAt: null } });
      }
    }
    return json({ ok: true, atualizadas });
  });
}
