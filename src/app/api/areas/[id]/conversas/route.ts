import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { PAPEIS, telefoneWa } from "@/lib/captacao";

export const dynamic = "force-dynamic";

/** Liga uma conversa de WhatsApp à área */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const nome = String(b.nome ?? "").trim().slice(0, 80);
    const telefone = telefoneWa(String(b.telefone ?? ""));
    if (!nome || !/^\d{12,15}$/.test(telefone)) return json({ error: "Informe nome e telefone com DDD" }, 400);
    const papel = typeof b.papel === "string" && b.papel in PAPEIS ? b.papel : "outro";
    if (!(await db.area.findFirst({ where: { id: params.id, deletedAt: null }, select: { id: true } }))) return json({ error: "Área não encontrada" }, 404);
    await db.areaConversa.upsert({ where: { areaId_telefone: { areaId: params.id, telefone } }, create: { areaId: params.id, nome, telefone, papel }, update: { nome, papel } });
    return json({ ok: true });
  });
}

/** Muda papel ou "nutrir" */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const b = await req.json().catch(() => ({}));
    const data: { papel?: string; nutrir?: boolean } = {};
    if (typeof b.papel === "string" && b.papel in PAPEIS) data.papel = b.papel;
    if (typeof b.nutrir === "boolean") data.nutrir = b.nutrir;
    await db.areaConversa.updateMany({ where: { id: String(b.conversaId ?? ""), areaId: params.id }, data });
    return json({ ok: true });
  });
}

/** Desvincula */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  return withSession(async () => {
    const conversaId = new URL(req.url).searchParams.get("conversa") ?? "";
    await db.areaConversa.deleteMany({ where: { id: conversaId, areaId: params.id } });
    return json({ ok: true });
  });
}
