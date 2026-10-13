import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withSession(
    async (s) => {
      await db.proposal.update({ where: { id: params.id }, data: { deletedAt: null, deletedById: null } });
      await db.proposalEvent.create({ data: { proposalId: params.id, type: "restore", meta: { by: s.name } } });
      return json({ ok: true });
    },
    { admin: true },
  );
}
