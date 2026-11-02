import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

export async function POST() {
  return withSession(async (s) => {
    await db.agendaConfig.updateMany({ where: { userId: s.sub }, data: { googleRefresh: null, googleEmail: null } });
    return json({ ok: true });
  });
}
