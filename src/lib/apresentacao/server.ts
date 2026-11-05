import { db } from "@/lib/db";
import { newToken } from "@/lib/token";
import { LINK_BASE } from "@/lib/site";
import inicialPrimavera from "./primavera-inicial.json";

/** Apresentações que existem (endereço de edição → dados iniciais, lidos da planilha do projeto) */
export const APRESENTACOES: Record<string, { titulo: string; inicial: object }> = {
  "chacaras-primavera": { titulo: "Chácaras Primavera", inicial: inicialPrimavera },
};

export const linkApresentacao = (token: string) => `${LINK_BASE}/apresentacao/${token}`;

/** A apresentação do endereço (criada na primeira vez, com os dados da planilha que está no projeto) */
export async function apresentacaoDe(slug: string) {
  const conf = APRESENTACOES[slug];
  if (!conf) return null;
  const a = await db.apresentacao.findUnique({ where: { slug } });
  if (a) return a;
  return db.apresentacao.upsert({
    where: { slug },
    update: {},
    create: { slug, dados: conf.inicial, token: newToken() },
  });
}
