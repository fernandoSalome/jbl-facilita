import { db } from "@/lib/db";
import { json, withSession } from "@/lib/api";
import { newToken } from "@/lib/token";
import { regiaoDaUf } from "@/lib/orcamento2026";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  return withSession(async (s) => {
    const p = await db.proposal.findUnique({ where: { id: params.id }, include: { project: { select: { uf: true } } } });
    if (!p) return json({ error: "Proposta não encontrada" }, 404);
    const copy = await db.proposal.create({
      data: {
        projectId: p.projectId,
        templateId: p.templateId,
        formato: p.formato,
        formatoVersionId: p.formatoVersionId,
        name: `${p.name} (cópia)`,
        ownerName: p.ownerName,
        ownerPhone: p.ownerPhone,
        // a cópia é uma proposta nova: o % da 1ª etapa vai sobre a área total e as obras pela planilha nova,
        // mesmo vindo de uma enviada antiga
        inputs: novaPlanilha(semMarcaAntiga(p.inputs), p.project.uf) as object,
        options: p.options ?? {},
        overrides: p.overrides ?? {},
        publicToken: newToken(),
        createdById: s.sub,
      },
    });
    return json({ id: copy.id });
  });
}

function novaPlanilha(i: Record<string, unknown>, uf: string) {
  return { ...i, planilhaNova: true, obrasSemEtapa1: true, recebE1Copia: true, regiao: i.regiao ?? regiaoDaUf(uf) };
}

function semMarcaAntiga(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== "object") return {};
  const { e1PctAproveitavel: _antiga, ...resto } = v as Record<string, unknown>;
  return resto;
}
