import { describe, expect, it } from "vitest";
import { nomeSimples } from "./planilha";
import inicial from "./primavera-inicial.json";

describe("apresentação de custos", () => {
  it("nomes dos itens simples para quem não conhece obra", () => {
    expect(nomeSimples("Custo do metro linera de Rede de Água 75mm")).toBe("Rede de Água 75mm");
    expect(nomeSimples("Custo mensal de acompanhamento de um Engenheiro")).toBe("Acompanhamento de um Engenheiro (mensal)");
    expect(nomeSimples("Custo de Conecções e Outros")).toBe("Conexões e Outros");
    expect(nomeSimples("Projeto Urbanístico")).toBe("Projeto Urbanístico");
  });
  it("os dados iniciais são os da planilha de Quintana (aba CUSTOS)", () => {
    expect(inicial.total).toBeCloseTo(1342308.68, 2);
    // o total é a soma das partes do resumo da planilha (colunas K a M)
    expect(inicial.resumo.reduce((s, r) => s + r.valor, 0)).toBeCloseTo(inicial.total, 2);
    expect(inicial.info).toMatchObject({ tipo: "Chacreamento", area: 65000, regiao: "Sudeste", meses: 24 });
  });
});
