import { db } from "@/lib/db";
import { newToken } from "@/lib/token";
import { LINK_BASE } from "@/lib/site";
import inicialPrimavera from "./primavera-inicial.json";
import { corrigirModelo, type Ajustes } from "./modelo";
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
    // linha 50 (ligações de esgoto) tinha o nome de Poço de Visita e recebeu 3 poços: volta à conta da planilha
    // e os 3 poços vão para o Poço de Visita de verdade (linha 55) (06/11/2026)
    const aj = d.ajustes ?? {};
    if (d.modelo && aj["CUSTOS!H50"] === 3) {
      const novos: Ajustes = { ...aj, "CUSTOS!H55": 3 };
      delete novos["CUSTOS!G50"];
      delete novos["CUSTOS!H50"];
      delete novos["CUSTOS!I50"];
      d = recalcular(d, novos);
      mudou = true;
    }
    // item que o Marcelo chamou de "Esgotamento sanitário" é por unidade, não por metro (06/11/2026)
    const textos = { ...((a.textos ?? {}) as Record<string, string>) };
    let unidade = false;
    for (const [k, v] of Object.entries(textos)) {
      const item = k.endsWith(".nome") ? k.slice(0, -5) : null;
      if (item && /esgotamento sanit/i.test(v) && !(`${item}.unidade` in textos)) { textos[`${item}.unidade`] = "un."; unidade = true; }
    }
    if (mudou || unidade)
      return db.apresentacao.update({ where: { id: a.id }, data: { ...(mudou ? { dados: d as object } : {}), ...(unidade ? { textos } : {}), updatedAt: a.updatedAt } });
    return a;
  }
  return db.apresentacao.upsert({
    where: { slug },
    update: {},
    create: { slug, dados: conf.inicial, token: newToken() },
  });
}
