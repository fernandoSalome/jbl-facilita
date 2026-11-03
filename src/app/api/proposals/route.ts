import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { newToken } from "@/lib/token";
import { parseInputs, parseOptions } from "@/lib/proposals";
import { formatoTemDados, parseContent, parseFormato } from "@/lib/formatos";
import { latestVersion } from "@/lib/formato-server";
import { regiaoDaUf } from "@/lib/orcamento2026";

export async function POST(req: Request) {
  return withSession(async (s) => {
    const b = await req.json();
    if (!b.projectId || !b.name?.trim() || !b.ownerName?.trim()) return json({ error: "Preencha nome da proposta e proprietário." }, 400);
    const template = b.templateId
      ? await db.template.findFirst({ where: { id: b.templateId, deletedAt: null, status: "ativo" } })
      : await db.template.findFirst({ where: { deletedAt: null, status: "ativo" }, orderBy: { createdAt: "asc" } });
    if (!template) return json({ error: "Nenhum template ativo." }, 400);
    const formato = parseFormato(b.formato);
    const version = await latestVersion(template.id, formato);
    if (!version || !formatoTemDados(parseContent(version.content, formato))) {
      return json({ error: "Este formato ainda não tem dados no template." }, 400);
    }

    const projeto = await db.project.findUnique({ where: { id: b.projectId }, select: { uf: true } });
    const inputs = parseInputs(b.inputs);
    const p = await db.proposal.create({
      data: {
        projectId: b.projectId,
        templateId: template.id,
        formato,
        formatoVersionId: version.id,
        name: b.name.trim(),
        ownerName: b.ownerName.trim(),
        ownerPhone: b.ownerPhone?.trim() || null,
        // planilha nova (a partir de 03/11/2026): custo das obras pelo orçamento com os preços da região
        inputs: { ...inputs, e1PctAproveitavel: undefined, planilhaNova: true, regiao: inputs.regiao ?? regiaoDaUf(projeto?.uf) },
        options: parseOptions(b.options),
        publicToken: newToken(),
        createdById: s.sub,
      },
    });
    await db.project.update({ where: { id: b.projectId }, data: { updatedAt: new Date() } });
    return json({ id: p.id });
  });
}
