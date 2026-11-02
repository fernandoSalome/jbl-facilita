import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { cancelarCompromisso } from "@/lib/agenda-server";

/** Cancela o compromisso (o convidado é avisado por e-mail e o SMS agendado é cancelado) */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const c = await db.compromisso.findFirst({ where: { id: params.id, userId: s.sub, status: "marcado" } });
    if (!c) return json({ error: "Compromisso não encontrado" }, 404);
    await cancelarCompromisso(c.id);
    return json({ ok: true });
  });
}
