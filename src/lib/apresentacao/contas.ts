/**
 * Contas da planilha aberta na página (edição dos números sem o Excel). Só refaz o que foi mexido:
 * o total do item (quantidade × valor unitário) e a soma do grupo das obras; o resumo e o total geral
 * são a soma dos grupos, como na aba CUSTOS (colunas K a M).
 */
import type { DadosCustos, Grupo, Item } from "./planilha";

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "x";

/** Resumo e total geral a partir dos grupos (grupo com "Implantará? Não" fica de fora) */
export function refazerTotais(d: DadosCustos): DadosCustos {
  const partes = [...d.gestao, ...d.obras].filter((g) => g.implanta !== false && g.total);
  const total = partes.reduce((s, g) => s + (g.total ?? 0), 0);
  return {
    ...d,
    total,
    resumo: partes.map((g) => ({ id: `r-${slug(g.nome)}`, nome: g.nome, valor: g.total!, pct: total ? g.total! / total : null })),
  };
}

/** Muda um item das obras: total = quantidade × valor unitário (quando os dois existem) e o grupo vira a soma dos itens */
export function mudarItemObra(d: DadosCustos, grupo: string, item: string, p: Partial<Pick<Item, "quantidade" | "unitario" | "total">>): DadosCustos {
  const obras = d.obras.map((g): Grupo => {
    if (g.id !== grupo) return g;
    const itens = g.itens.map((i) => {
      if (i.id !== item) return i;
      const n = { ...i, ...p };
      if (("quantidade" in p || "unitario" in p) && n.quantidade !== null && n.unitario !== null) n.total = n.quantidade * n.unitario;
      return n;
    });
    return { ...g, itens, total: itens.reduce((s, i) => s + (i.total ?? 0), 0) };
  });
  return refazerTotais({ ...d, obras });
}

export function mudarGrupo(d: DadosCustos, lado: "obras" | "gestao", grupo: string, p: Partial<Pick<Grupo, "total" | "implanta">>): DadosCustos {
  return refazerTotais({ ...d, [lado]: d[lado].map((g) => (g.id === grupo ? { ...g, ...p } : g)) });
}

/** Itens de projetos, documentação e gestão: o valor é o da planilha (alguns são por lote ou por mês); o total do grupo é digitado à parte */
export function mudarItemGestao(d: DadosCustos, grupo: string, item: string, total: number | null): DadosCustos {
  return { ...d, gestao: d.gestao.map((g) => (g.id === grupo ? { ...g, itens: g.itens.map((i) => (i.id === item ? { ...i, total } : i)) } : g)) };
}
