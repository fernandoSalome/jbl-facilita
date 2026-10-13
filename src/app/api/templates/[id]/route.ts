import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  return withSession(
    async () => {
      await db.template.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
      return json({ ok: true });
    },
    { admin: true },
  );
}
