import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { newToken } from "@/lib/token";
import { parseInputs, parseOptions } from "@/lib/proposals";

export async function POST(req: Request) {
  return withSession(async (s) => {
    const b = await req.json();
    if (!b.projectId || !b.name?.trim() || !b.ownerName?.trim()) return json({ error: "Preencha nome da proposta e proprietário." }, 400);
    const template = b.templateId
      ? await db.template.findFirst({ where: { id: b.templateId, deletedAt: null, status: "ativo" } })
      : await db.template.findFirst({ where: { deletedAt: null, status: "ativo" }, orderBy: { createdAt: "asc" } });
    if (!template) return json({ error: "Nenhum template ativo." }, 400);

    const p = await db.proposal.create({
      data: {
        projectId: b.projectId,
        templateId: template.id,
        name: b.name.trim(),
        ownerName: b.ownerName.trim(),
        ownerPhone: b.ownerPhone?.trim() || null,
        inputs: parseInputs(b.inputs),
        options: parseOptions(b.options),
        publicToken: newToken(),
        createdById: s.sub,
      },
    });
    await db.project.update({ where: { id: b.projectId }, data: { updatedAt: new Date() } });
    return json({ id: p.id });
  });
}
