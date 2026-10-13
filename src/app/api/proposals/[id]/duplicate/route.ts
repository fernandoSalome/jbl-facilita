import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { newToken } from "@/lib/token";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const p = await db.proposal.findUnique({ where: { id: params.id } });
    if (!p) return json({ error: "Proposta não encontrada" }, 404);
    const copy = await db.proposal.create({
      data: {
        projectId: p.projectId,
        templateId: p.templateId,
        name: `${p.name} (cópia)`,
        ownerName: p.ownerName,
        ownerPhone: p.ownerPhone,
        inputs: p.inputs ?? {},
        options: p.options ?? {},
        overrides: p.overrides ?? {},
        publicToken: newToken(),
        createdById: s.sub,
      },
    });
    return json({ id: copy.id });
  });
}
