import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { apresentacaoDe } from "@/lib/apresentacao/server";

type Ctx = { params: { slug: string } };

/** Salva o rascunho: números (planilha aberta na página), textos e aparência (o link só muda em "Gerar link") */
export async function PATCH(req: Request, { params }: Ctx) {
  return withSession(async () => {
    const a = await apresentacaoDe(params.slug);
    if (!a) return json({ error: "Apresentação não encontrada" }, 404);
    const b = await req.json();
    const data: Record<string, object> = {};
    for (const k of ["textos", "formatos", "estilo"] as const) if (b[k] && typeof b[k] === "object") data[k] = b[k];
    // números: precisam ter as partes da planilha (obras, gestão e resumo)
    if (b.dados && typeof b.dados === "object" && Array.isArray(b.dados.obras) && Array.isArray(b.dados.gestao) && Array.isArray(b.dados.resumo)) data.dados = b.dados;
    const logo = (b.estilo as { logo?: unknown } | undefined)?.logo;
    if (typeof logo === "string" && logo.length > 2_000_000) return json({ error: "A logo é grande demais (máximo 1,5 MB)." }, 413);
    await db.apresentacao.update({ where: { id: a.id }, data });
    return json({ ok: true });
  });
}
