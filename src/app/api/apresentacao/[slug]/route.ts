import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { apresentacaoDe } from "@/lib/apresentacao/server";

type Ctx = { params: { slug: string } };

/** Salva o rascunho: textos, aparência de cada texto e aparência geral (o link só muda em "Gerar link") */
export async function PATCH(req: Request, { params }: Ctx) {
  return withSession(async () => {
    const a = await apresentacaoDe(params.slug);
    if (!a) return json({ error: "Apresentação não encontrada" }, 404);
    const b = await req.json();
    const data: Record<string, object> = {};
    for (const k of ["textos", "formatos", "estilo"] as const) if (b[k] && typeof b[k] === "object") data[k] = b[k];
    const logo = (b.estilo as { logo?: unknown } | undefined)?.logo;
    if (typeof logo === "string" && logo.length > 2_000_000) return json({ error: "A logo é grande demais (máximo 1,5 MB)." }, 413);
    await db.apresentacao.update({ where: { id: a.id }, data });
    return json({ ok: true });
  });
}
