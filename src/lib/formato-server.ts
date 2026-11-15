import { db } from "./db";
import { semChaves } from "./personalizadas";
import type { Overrides } from "./proposals";
import { FORMATOS, formatoTemDados, parseContent, parseFormato, type FormatoContent, type FormatoKey } from "./formatos";

/** Versão mais recente de um formato dentro do template */
export async function latestVersion(templateId: string, formato: FormatoKey) {
  return db.formatoVersion.findFirst({ where: { templateId, formato }, orderBy: { createdAt: "desc" } });
}

/** Conteúdo do formato usado por uma proposta (a versão em que ela está, ou a mais recente) */
export async function contentForProposal(p: { templateId: string; formato: string; formatoVersionId: string | null }): Promise<FormatoContent> {
  const formato = parseFormato(p.formato);
  const v = p.formatoVersionId
    ? await db.formatoVersion.findUnique({ where: { id: p.formatoVersionId } })
    : await latestVersion(p.templateId, formato);
  return parseContent(v?.content, formato);
}

export type FormatoResumo = { key: FormatoKey; content: FormatoContent; versionId: string | null; createdAt: string; disponivel: boolean };

/** Os 4 formatos de um template com a versão mais recente de cada um */
export async function formatosDoTemplate(templateId: string): Promise<FormatoResumo[]> {
  return Promise.all(
    FORMATOS.map(async (key) => {
      const v = await latestVersion(templateId, key);
      const content = parseContent(v?.content, key);
      return { key, content, versionId: v?.id ?? null, createdAt: (v?.createdAt ?? new Date(0)).toISOString(), disponivel: !!v && formatoTemDados(content) };
    }),
  );
}

/**
 * Ao salvar o template: as propostas escolhidas perdem a personalização desses textos e passam a seguir o template
 * (só deste template, só as não bloqueadas). Devolve quantas mudaram.
 */
export async function trocarPersonalizadas(templateId: string, trocas: Map<string, string[]>): Promise<number> {
  let n = 0;
  for (const [id, chaves] of trocas) {
    const p = await db.proposal.findFirst({ where: { id, templateId, lockedAt: null, deletedAt: null }, select: { overrides: true } });
    if (!p) continue;
    const ov = (p.overrides ?? {}) as Overrides;
    if (!chaves.some((k) => k in ov)) continue;
    await db.proposal.update({ where: { id }, data: { overrides: semChaves(ov, chaves) as object, pdfKey: null } });
    n++;
  }
  return n;
}
