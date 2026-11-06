import { describe, expect, it } from "vitest";
import { nomeSimples } from "./planilha";
import inicial from "./primavera-inicial.json";
import { mudarGrupo, mudarItemObra, refazerTotais } from "./contas";
import type { DadosCustos } from "./planilha";

describe("apresentação de custos", () => {
  it("nomes dos itens simples para quem não conhece obra", () => {
    expect(nomeSimples("Custo do metro linera de Rede de Água 75mm")).toBe("Rede de Água 75mm");
    expect(nomeSimples("Custo mensal de acompanhamento de um Engenheiro")).toBe("Acompanhamento de um Engenheiro (mensal)");
    expect(nomeSimples("Custo de Conecções e Outros")).toBe("Conexões e Outros");
    expect(nomeSimples("Projeto Urbanístico")).toBe("Projeto Urbanístico");
  });
  it("os dados iniciais são os da planilha de Quintana (aba CUSTOS)", () => {
    // 1.342.308,68 no Excel + 2 × 53.820 (Preparação da Área passou a somar a abertura de logradouros)
    // + 112.800 (custos administrativos proporcionais na Sede da Empresa)
    expect(inicial.total).toBeCloseTo(1562748.68, 2);
    // o total é a soma das partes do resumo da planilha (colunas K a M)
    expect(inicial.resumo.reduce((s, r) => s + r.valor, 0)).toBeCloseTo(inicial.total, 2);
    expect(inicial.info).toMatchObject({ tipo: "Chacreamento", area: 65000, regiao: "Sudeste", meses: 24 });
  });
  it("planilha na página: refazer os totais dá o mesmo da planilha; mexer num item muda o item, o grupo e o total", () => {
    const d = inicial as unknown as DadosCustos;
    expect(refazerTotais(d).total).toBeCloseTo(d.total!, 2);
    const agua = d.obras.find((g) => g.nome === "Rede de Água")!;
    const item = agua.itens.find((i) => i.quantidade !== null && i.unitario !== null && i.total)!;
    const n = mudarItemObra(d, agua.id, item.id, { quantidade: item.quantidade! + 10 });
    const delta = 10 * item.unitario!;
    expect(n.obras.find((g) => g.id === agua.id)!.total).toBeCloseTo(agua.itens.reduce((s, i) => s + (i.total ?? 0), 0) + delta, 2);
    // sem incluir a rede de água, o total cai o valor do grupo
    const sem = mudarGrupo(d, "obras", agua.id, { implanta: false });
    expect(sem.total).toBeCloseTo(d.total! - agua.total!, 2);
  });
});
