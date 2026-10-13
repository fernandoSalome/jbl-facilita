import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

/** Imagem pública (usada na página da proposta). O conteúdo de um id nunca muda. */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const a = await db.asset.findUnique({ where: { id: params.id }, select: { mime: true, data: true } });
  if (!a) return new Response("Não encontrada", { status: 404 });
  return new Response(a.data, {
    headers: {
      "Content-Type": a.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** Arquiva (some do banco de imagens), mas continua servindo para propostas que já usam. */
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    await db.asset.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
    return json({ ok: true });
  });
}
