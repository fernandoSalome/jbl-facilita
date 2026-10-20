import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { ETAPA } from "@/lib/fases";

/** Abre o arquivo (só para quem está logado). ?baixar=1 força o download. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const d = await db.projectDocument.findFirst({ where: { id: params.id, deletedAt: null }, select: { mime: true, data: true, fileName: true } });
    if (!d) return new Response("Não encontrado", { status: 404 });
    const nome = d.fileName.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/"/g, "");
    const modo = new URL(req.url).searchParams.has("baixar") ? "attachment" : "inline";
    return new Response(new Uint8Array(d.data), {
      headers: { "Content-Type": d.mime, "Content-Disposition": `${modo}; filename="${nome}"`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store" },
    });
  });
}

/** Muda de loteamento, de pasta, de etapa ou o título */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const data: Record<string, unknown> = {};
    if ("projectId" in b) data.projectId = b.projectId || null;
    if (typeof b.tipo === "string") data.tipo = b.tipo;
    if (typeof b.fase === "string" && ETAPA[b.fase]) data.fase = b.fase;
    if (typeof b.titulo === "string" && b.titulo.trim()) data.titulo = b.titulo.trim().slice(0, 200);
    await db.projectDocument.update({ where: { id: params.id }, data });
    return json({ ok: true });
  });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    await db.projectDocument.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
    return json({ ok: true });
  });
}
