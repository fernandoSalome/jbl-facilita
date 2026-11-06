import { db } from "@/lib/db";
import { newToken } from "@/lib/token";
import { LINK_BASE } from "@/lib/site";
import inicialPrimavera from "./primavera-inicial.json";
import { corrigirModelo } from "./modelo";
import { ajustesDaVersaoAntiga, recalcular, type DadosCustos } from "./planilha";

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
  if (a) {
    // salva antes das fórmulas na página: passa a ter o modelo, com os números já trocados como ajustes
    let d = a.dados as unknown as DadosCustos;
    const base = conf.inicial as unknown as DadosCustos;
    let mudou = false;
    if (!d.modelo && base.modelo && d.arquivo === base.arquivo) {
      d = recalcular(base, ajustesDaVersaoAntiga(d, base));
      mudou = true;
    }
    // fórmula errada da planilha (ex.: Preparação da Área): corrige e refaz, mantendo os números trocados
    const certo = d.modelo ? corrigirModelo(d.modelo) : null;
    if (certo) {
      d = recalcular({ ...d, modelo: certo }, d.ajustes ?? {});
      mudou = true;
    }
    if (mudou) return db.apresentacao.update({ where: { id: a.id }, data: { dados: d as object, updatedAt: a.updatedAt } });
    return a;
  }
  return db.apresentacao.upsert({
    where: { slug },
    update: {},
    create: { slug, dados: conf.inicial, token: newToken() },
  });
}
