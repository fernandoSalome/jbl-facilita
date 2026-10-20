import { db } from "./db";
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
