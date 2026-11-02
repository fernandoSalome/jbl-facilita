import { db } from "@/lib/db";
import { json } from "@/lib/api";
import { cancelarCompromisso } from "@/lib/agenda-server";

/** O convidado cancela pelo link do e-mail */
export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const c = await db.compromisso.findUnique({ where: { cancelToken: params.token } });
  if (!c || c.status !== "marcado") return json({ error: "Reunião não encontrada ou já cancelada" }, 404);
  if (c.inicio.getTime() < Date.now()) return json({ error: "Essa reunião já passou" }, 400);
  await cancelarCompromisso(c.id);
  return json({ ok: true });
}
